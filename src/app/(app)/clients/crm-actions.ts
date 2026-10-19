"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/activity";
import { CLIENT_LEAD_GROUPS, groupFor } from "@/lib/client-lead-status";

/**
 * Kunden-Leads und Onboarding-Einsendungen. Nur Leitung und Projektleitung.
 */

const ROLES = ["super_admin", "ceo", "cso", "project_manager"] as const;
type Result = { ok: true; message?: string } | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Unbekannter Fehler" });
const GROUPS = CLIENT_LEAD_GROUPS.map((g) => g.key) as [string, ...string[]];

/** Eigene Zuordnung Rohstatus -> Gruppe speichern und Kunden-Leads neu einordnen. */
export async function saveStatusMapAction(clientId: string, map: Record<string, string>): Promise<Result> {
  try {
    await requireRole([...ROLES]);
    z.string().uuid().parse(clientId);
    const clean = z.record(z.string().max(200), z.enum(GROUPS)).parse(map);
    const db = createAdminClient();
    const { error } = await db.from("clients").update({ reporting_status_map: clean }).eq("id", clientId);
    if (error) throw new Error(error.message);

    // Betroffene Leads je Rohstatus neu einordnen
    const { data: raws } = await db.from("client_leads").select("status_raw").eq("client_id", clientId).limit(20000);
    const distinct = [...new Set((raws ?? []).map((r: { status_raw: string | null }) => r.status_raw))];
    for (const raw of distinct) {
      const group = groupFor(raw, clean);
      const q = db.from("client_leads").update({ status: group }).eq("client_id", clientId).neq("status", group);
      const { error: e } = raw == null ? await q.is("status_raw", null) : await q.eq("status_raw", raw);
      if (e) throw new Error(e.message);
    }
    await recordAudit({ action: "client.status_map", entityType: "client", entityId: clientId, newValues: clean });
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients", "layout");
    return { ok: true, message: "Zuordnung gespeichert, Leads neu eingeordnet" };
  } catch (e) {
    return fail(e);
  }
}

/** Alle Leads eines alten Kundennamens (ohne Zuordnung) einem Kunden zuweisen. */
export async function linkExternalLeadsAction(externalName: string, clientId: string): Promise<Result> {
  try {
    await requireRole([...ROLES]);
    const name = z.string().min(1).max(300).parse(externalName);
    z.string().uuid().parse(clientId);
    const db = createAdminClient();
    const { data: client, error: ce } = await db.from("clients").select("reporting_status_map").eq("id", clientId).single();
    if (ce) throw new Error(ce.message);
    const map = (client?.reporting_status_map ?? {}) as Record<string, string>;
    const { data: rows, error: re } = await db.from("client_leads").select("status_raw").is("client_id", null).eq("external_client_name", name).limit(20000);
    if (re) throw new Error(re.message);
    const distinct = [...new Set((rows ?? []).map((r: { status_raw: string | null }) => r.status_raw))];
    for (const raw of distinct) {
      const q = db.from("client_leads").update({ client_id: clientId, status: groupFor(raw, map) }).is("client_id", null).eq("external_client_name", name);
      const { error: e } = raw == null ? await q.is("status_raw", null) : await q.eq("status_raw", raw);
      if (e) throw new Error(e.message);
    }
    await recordAudit({ action: "client.link_leads", entityType: "client", entityId: clientId, newValues: { external_client_name: name, leads: rows?.length ?? 0 } });
    revalidatePath("/clients", "layout");
    return { ok: true, message: `${rows?.length ?? 0} Leads zugewiesen` };
  } catch (e) {
    return fail(e);
  }
}

export async function assignOnboardingAction(submissionId: string, clientId: string | null): Promise<Result> {
  try {
    await requireRole([...ROLES]);
    z.string().uuid().parse(submissionId);
    if (clientId) z.string().uuid().parse(clientId);
    const { error } = await createAdminClient().from("client_onboarding_submissions").update({ client_id: clientId }).eq("id", submissionId);
    if (error) throw new Error(error.message);
    revalidatePath("/clients/onboarding");
    return { ok: true, message: clientId ? "Kunde zugewiesen" : "Zuweisung entfernt" };
  } catch (e) {
    return fail(e);
  }
}

export async function setOnboardingStatusAction(submissionId: string, status: "open" | "closed"): Promise<Result> {
  try {
    await requireRole([...ROLES]);
    z.string().uuid().parse(submissionId);
    const { error } = await createAdminClient().from("client_onboarding_submissions").update({ status }).eq("id", submissionId);
    if (error) throw new Error(error.message);
    revalidatePath("/clients/onboarding");
    return { ok: true, message: status === "closed" ? "Onboarding abgeschlossen" : "Wieder geöffnet" };
  } catch (e) {
    return fail(e);
  }
}
