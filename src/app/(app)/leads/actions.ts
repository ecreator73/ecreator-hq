"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { SALES_ROLES } from "@/config/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/activity";
import { computeLeadScore } from "@/lib/lead-score";
import { LEAD_STATUSES } from "@/config/catalog";
import { ARCHIVE_STATUSES, MAX_NO_ANSWER, OUTCOME_BY_KEY, addWorkdays, zurichTodayIso } from "@/lib/lead-workflow";

/**
 * Lead-Arbeit (Arbeitsliste, Alle Leads, Kanban). Rollen: Leitung + Sales,
 * serverseitig geprueft. Geschrieben wird mit der Service-Role, damit Sales
 * wie im Lovable-CRM jeden offenen Lead bearbeiten kann (RLS erlaubt sonst
 * nur Owner/Leitung). Jede Aenderung landet im Verlauf des Leads.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Result<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Unbekannter Fehler" });

function refresh(leadId?: string) {
  revalidatePath("/leads", "layout");
  revalidatePath("/sales", "layout");
  revalidatePath("/");
  if (leadId) revalidatePath(`/sales/leads/${leadId}`);
}

async function statusIdOf(db: ReturnType<typeof createAdminClient>, key: string): Promise<string> {
  const { data } = await db.from("statuses").select("id").eq("entity_type", "lead").eq("key", key).maybeSingle();
  if (!data) throw new Error(`Unbekannter Status: ${key}`);
  return (data as any).id as string;
}

const label = (key: string) => LEAD_STATUSES.find((s) => s.key === key)?.label ?? key;

/* ------------------------------------------------------------------------ */
/* Anruf erfassen                                                            */
/* ------------------------------------------------------------------------ */

const callSchema = z.object({
  leadId: z.string().uuid(),
  outcome: z.string().refine((k) => Boolean(OUTCOME_BY_KEY[k]), "Unbekanntes Ergebnis"),
  notes: z.string().trim().max(4000).optional().nullable(),
  nextAction: z.string().trim().max(200).optional().nullable(),
  nextActionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")),
  durationMinutes: z.number().min(0).max(600).optional().nullable(),
});

export async function logCallAction(input: z.input<typeof callSchema>): Promise<Result<{ status: string }>> {
  try {
    const user = await requireRole(SALES_ROLES);
    const v = callSchema.parse(input);
    const o = OUTCOME_BY_KEY[v.outcome]!;
    if (o.nextAction && !v.nextAction?.trim()) throw new Error("Bitte einen nächsten Schritt festlegen.");
    const db = createAdminClient();

    const { data: lead } = await db
      .from("leads")
      .select("id, owner_id, estimated_value, company_size, contact_name, company_name, status:statuses!leads_status_id_fkey(key)")
      .eq("id", v.leadId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!lead) throw new Error("Lead nicht gefunden.");
    const current = (lead as any).status?.key as string | undefined;

    // Status nach Ergebnis; ab dem 3. Fehlversuch «Mehrfach nicht erreicht»
    let next = o.status;
    if (v.outcome === "no_answer") {
      const { count } = await db.from("sales_activities").select("id", { count: "exact", head: true }).eq("lead_id", v.leadId).eq("type", "call").eq("outcome", "no_answer");
      if ((count ?? 0) + 1 >= MAX_NO_ANSWER) next = "mehrfach_nicht_erreicht";
    }
    const nextDate = v.nextActionDate || null;
    const nextAction = v.nextAction?.trim() || null;

    const { error: actErr } = await db.from("sales_activities").insert({
      lead_id: v.leadId,
      type: "call",
      subject: `Anruf: ${o.label}`,
      body: v.notes || null,
      outcome: v.outcome,
      duration_seconds: v.durationMinutes ? Math.round(v.durationMinutes * 60) : null,
      next_action: nextAction,
      next_action_date: nextDate,
      activity_date: new Date().toISOString(),
      created_by: user.id,
      author_name: user.fullName,
    });
    if (actErr) throw new Error(`Anruf: ${actErr.message}`);

    const patch: Record<string, unknown> = { next_action: nextAction, next_action_date: nextDate, updated_by: user.id };
    if (next && next !== current) {
      patch.status_id = await statusIdOf(db, next);
      patch.lead_score = computeLeadScore({
        status: next,
        estimated_value: (lead as any).estimated_value,
        company_size: (lead as any).company_size,
        next_action_date: nextDate,
      });
    }
    // Wer anruft, uebernimmt einen noch nicht zugewiesenen Lead
    if (!(lead as any).owner_id) patch.owner_id = user.id;
    const { error } = await db.from("leads").update(patch).eq("id", v.leadId);
    if (error) throw new Error(`Lead: ${error.message}`);

    if (next && next !== current) {
      await db.from("sales_activities").insert({
        lead_id: v.leadId,
        type: "status",
        subject: `Status geändert: ${label(current ?? "")} → ${label(next)}`,
        activity_date: new Date().toISOString(),
        created_by: user.id,
        author_name: user.fullName,
      });
    }
    refresh(v.leadId);
    return { ok: true, data: { status: next ?? current ?? "" }, message: `Anruf gespeichert${next && next !== current ? ` · Status: ${label(next)}` : ""}` };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------------ */
/* Status, Zuweisung, naechster Schritt                                      */
/* ------------------------------------------------------------------------ */

async function applyStatus(db: ReturnType<typeof createAdminClient>, user: { id: string; fullName: string }, leadIds: string[], key: string) {
  const sid = await statusIdOf(db, key);
  const { data: before } = await db.from("leads").select("id, next_action_date, estimated_value, company_size, status:statuses!leads_status_id_fkey(key)").in("id", leadIds);
  const today = zurichTodayIso();
  for (const l of (before ?? []) as any[]) {
    const old = l.status?.key as string | undefined;
    if (old === key) continue;
    const patch: Record<string, unknown> = { status_id: sid, updated_by: user.id };
    // Besser als in Lovable: Follow-up ohne Formular -> automatisch in 3 Werktagen
    if (key === "followup" && !l.next_action_date) {
      patch.next_action = "Follow-up";
      patch.next_action_date = addWorkdays(today, 3);
    }
    if (ARCHIVE_STATUSES.includes(key)) {
      patch.next_action = null;
      patch.next_action_date = null;
    }
    patch.lead_score = computeLeadScore({
      status: key,
      estimated_value: l.estimated_value,
      company_size: l.company_size,
      next_action_date: (patch.next_action_date as string | undefined) ?? l.next_action_date,
    });
    const { error } = await db.from("leads").update(patch).eq("id", l.id);
    if (error) throw new Error(error.message);
    await db.from("sales_activities").insert({
      lead_id: l.id,
      type: "status",
      subject: `Status geändert: ${label(old ?? "")} → ${label(key)}`,
      activity_date: new Date().toISOString(),
      created_by: user.id,
      author_name: user.fullName,
    });
  }
}

export async function setLeadStatusAction(leadId: string, key: string): Promise<Result> {
  try {
    const user = await requireRole(SALES_ROLES);
    z.string().uuid().parse(leadId);
    if (!LEAD_STATUSES.some((s) => s.key === key)) throw new Error("Unbekannter Status");
    await applyStatus(createAdminClient(), user, [leadId], key);
    refresh(leadId);
    return { ok: true, message: key === "followup" ? "Follow-up in 3 Werktagen geplant" : `Status: ${label(key)}` };
  } catch (e) {
    return fail(e);
  }
}

export async function assignLeadAction(leadId: string, ownerId: string | null): Promise<Result> {
  try {
    const user = await requireRole(SALES_ROLES);
    z.string().uuid().parse(leadId);
    if (ownerId) z.string().uuid().parse(ownerId);
    const db = createAdminClient();
    const { data: p } = ownerId ? await db.from("profiles").select("full_name").eq("id", ownerId).maybeSingle() : { data: null };
    const { error } = await db.from("leads").update({ owner_id: ownerId, updated_by: user.id }).eq("id", leadId);
    if (error) throw new Error(error.message);
    await db.from("sales_activities").insert({
      lead_id: leadId,
      type: "note",
      subject: ownerId ? `Zugewiesen an ${(p as any)?.full_name ?? "Teammitglied"}` : "Zuweisung entfernt",
      activity_date: new Date().toISOString(),
      created_by: user.id,
      author_name: user.fullName,
    });
    refresh(leadId);
    return { ok: true, message: ownerId ? "Zugewiesen" : "Zuweisung entfernt" };
  } catch (e) {
    return fail(e);
  }
}

const nextSchema = z.object({
  leadId: z.string().uuid(),
  nextAction: z.string().trim().max(200).nullable(),
  nextActionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function setNextActionAction(input: z.input<typeof nextSchema>): Promise<Result> {
  try {
    const user = await requireRole(SALES_ROLES);
    const v = nextSchema.parse(input);
    const { error } = await createAdminClient().from("leads").update({ next_action: v.nextAction || null, next_action_date: v.nextActionDate, updated_by: user.id }).eq("id", v.leadId);
    if (error) throw new Error(error.message);
    refresh(v.leadId);
    return { ok: true, message: "Nächster Schritt gespeichert" };
  } catch (e) {
    return fail(e);
  }
}

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  statusKey: z.string().optional(),
  ownerId: z.string().uuid().nullable().optional(),
});

export async function bulkUpdateLeadsAction(input: z.input<typeof bulkSchema>): Promise<Result> {
  try {
    const user = await requireRole(SALES_ROLES);
    const v = bulkSchema.parse(input);
    const db = createAdminClient();
    if (v.statusKey) {
      if (!LEAD_STATUSES.some((s) => s.key === v.statusKey)) throw new Error("Unbekannter Status");
      await applyStatus(db, user, v.ids, v.statusKey);
    }
    if (v.ownerId !== undefined) {
      const { error } = await db.from("leads").update({ owner_id: v.ownerId, updated_by: user.id }).in("id", v.ids);
      if (error) throw new Error(error.message);
    }
    await recordAudit({ action: "lead.bulk_update", entityType: "lead", newValues: { count: v.ids.length, status: v.statusKey ?? null, owner: v.ownerId ?? undefined } });
    refresh();
    return { ok: true, message: `${v.ids.length} Leads aktualisiert` };
  } catch (e) {
    return fail(e);
  }
}
