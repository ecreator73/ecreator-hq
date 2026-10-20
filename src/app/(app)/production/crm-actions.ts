"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/activity";
import type { RoleKey } from "@/config/roles";

/**
 * Production-Aktionen aus der Kunden-CRM-Uebernahme: Shooting-Details,
 * Terminvorschlaege, Skripte, Model-Honorar, Bewerbungen, Redaktionsplan.
 * Schreibrecht: Leitung, Projektleitung, Creative.
 */

const ROLES: RoleKey[] = ["super_admin", "ceo", "cso", "project_manager", "creative"];
type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof z.ZodError ? "Eingabe ungültig" : e instanceof Error ? e.message.slice(0, 300) : "Unbekannter Fehler",
});
const uuid = z.string().uuid();

async function guard() {
  const user = await requireUser();
  if (!canAccess(user.roles, ROLES)) throw new Error("Keine Berechtigung für Production");
  return { user, db: createAdminClient() };
}
const check = (r: { error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
};
const refreshShoot = (id?: string) => {
  revalidatePath("/production", "layout");
  if (id) revalidatePath(`/production/shoots/${id}`);
};

/* ---- Shootings ------------------------------------------------------------- */

const STAMP: Record<string, string> = { confirmed: "confirmed_at", done: "completed_at", delivered: "delivered_at" };

export async function setShootStageAction(id: string, status: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(id);
    const s = z.enum(["date_search", "planned", "confirmed", "done", "editing", "delivered", "rescheduled", "cancelled"]).parse(status);
    const patch: Record<string, unknown> = { status: s };
    if (STAMP[s]) patch[STAMP[s]] = new Date().toISOString();
    check(await db.from("shoots").update(patch).eq("id", id));
    // Model-Zuteilung nach Durchfuehrung abschliessen
    if (s === "done" || s === "delivered") check(await db.from("shoot_assignments").update({ status: "done" }).eq("shoot_id", id).eq("status", "confirmed"));
    await recordAudit({ action: "shoot.status", entityType: "shoot", entityId: id, newValues: { status: s } });
    refreshShoot(id);
    return { ok: true, message: "Status gespeichert" };
  } catch (e) {
    return fail(e);
  }
}

const shootDetailsSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    shooting_date: z.string().nullable(),
    location: z.string().max(300).nullable(),
    address: z.string().max(300).nullable(),
    shoot_type: z.string().max(40).nullable(),
    duration_hours: z.number().min(0).max(48).nullable(),
    video_count: z.number().int().min(0).max(500).nullable(),
    content_goal: z.string().max(2000).nullable(),
    equipment: z.string().max(2000).nullable(),
    notes: z.string().max(5000).nullable(),
    responsible_id: uuid.nullable(),
    editor_id: uuid.nullable(),
    videographer: z.string().max(200).nullable(),
    delivery_deadline: z.string().nullable(),
    script_url: z.string().max(1000).nullable(),
    customer_drive_url: z.string().max(1000).nullable(),
    shoot_folder_url: z.string().max(1000).nullable(),
    delivery_url: z.string().max(1000).nullable(),
    model_fee: z.number().int().min(0).nullable(),
    invoice_status: z.enum(["open", "invoiced", "paid", "none"]),
  })
  .partial();

export async function updateShootDetailsAction(id: string, input: z.input<typeof shootDetailsSchema>): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(id);
    const patch = shootDetailsSchema.parse(input);
    check(await db.from("shoots").update(patch).eq("id", id));
    await recordAudit({ action: "update", entityType: "shoot", entityId: id, newValues: patch });
    refreshShoot(id);
    return { ok: true, message: "Gespeichert" };
  } catch (e) {
    return fail(e);
  }
}

export async function setModelPaidAction(id: string, paid: boolean): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(id);
    check(await db.from("shoots").update({ model_paid: paid, model_paid_at: paid ? new Date().toISOString() : null }).eq("id", id));
    await recordAudit({ action: "shoot.model_paid", entityType: "shoot", entityId: id, newValues: { model_paid: paid } });
    refreshShoot(id);
    return { ok: true, message: paid ? "Model-Honorar als bezahlt markiert" : "Als offen markiert" };
  } catch (e) {
    return fail(e);
  }
}

export async function assignModelAction(shootId: string, creatorId: string, rate: number | null): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(shootId);
    uuid.parse(creatorId);
    check(await db.from("shoot_assignments").upsert({ shoot_id: shootId, creator_id: creatorId, status: "requested", agreed_rate: rate, deleted_at: null }, { onConflict: "shoot_id,creator_id" }));
    refreshShoot(shootId);
    return { ok: true, message: "Model angefragt" };
  } catch (e) {
    return fail(e);
  }
}

export async function setAssignmentAction(shootId: string, assignmentId: string, status: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(assignmentId);
    const s = z.enum(["requested", "confirmed", "rejected", "done"]).parse(status);
    check(await db.from("shoot_assignments").update({ status: s }).eq("id", assignmentId));
    refreshShoot(shootId);
    return { ok: true, message: "Gespeichert" };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Terminvorschlaege ------------------------------------------------------ */

export async function addDateOptionAction(shootId: string, startsAt: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(shootId);
    const at = z.string().min(10).parse(startsAt);
    check(await db.from("shoot_date_options").insert({ shoot_id: shootId, starts_at: new Date(at).toISOString() }));
    refreshShoot(shootId);
    return { ok: true, message: "Termin vorgeschlagen" };
  } catch (e) {
    return fail(e);
  }
}

export async function setOptionAvailabilityAction(shootId: string, optionId: string, who: "customer" | "model", value: boolean | null): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(optionId);
    const col = who === "customer" ? "customer_available" : "model_available";
    check(await db.from("shoot_date_options").update({ [col]: value }).eq("id", optionId));
    refreshShoot(shootId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Vorschlag als festen Termin uebernehmen. */
export async function pickDateOptionAction(shootId: string, optionId: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(shootId);
    uuid.parse(optionId);
    const { data: opt, error } = await db.from("shoot_date_options").select("starts_at").eq("id", optionId).single();
    if (error) throw new Error(error.message);
    const { data: shoot } = await db.from("shoots").select("status").eq("id", shootId).single();
    const status = shoot?.status === "date_search" ? "planned" : shoot?.status;
    check(await db.from("shoots").update({ shooting_date: opt.starts_at, final_date_set: true, status }).eq("id", shootId));
    await recordAudit({ action: "shoot.date_set", entityType: "shoot", entityId: shootId, newValues: { shooting_date: opt.starts_at } });
    refreshShoot(shootId);
    return { ok: true, message: "Termin festgelegt" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteDateOptionAction(shootId: string, optionId: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(optionId);
    check(await db.from("shoot_date_options").delete().eq("id", optionId).eq("shoot_id", shootId));
    refreshShoot(shootId);
    return { ok: true, message: "Vorschlag entfernt" };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Skripte ---------------------------------------------------------------------- */

const scriptSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  video_number: z.number().int().min(1).max(500).nullable().optional(),
  hook: z.string().max(2000).nullable().optional(),
  script: z.string().max(20000).nullable().optional(),
  cta: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "review", "approved"]).optional(),
});

export async function saveScriptAction(shootId: string, scriptId: string | null, input: z.input<typeof scriptSchema>): Promise<Result> {
  try {
    const { db, user } = await guard();
    uuid.parse(shootId);
    const row = scriptSchema.parse(input);
    if (scriptId) {
      uuid.parse(scriptId);
      check(await db.from("shoot_scripts").update(row).eq("id", scriptId).eq("shoot_id", shootId));
    } else {
      check(await db.from("shoot_scripts").insert({ ...row, shoot_id: shootId, owner_id: user.id }));
    }
    refreshShoot(shootId);
    return { ok: true, message: "Skript gespeichert" };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Bewerbungen ------------------------------------------------------------------- */

/**
 * Bewerbungsstatus setzen. «Annehmen» legt den Creator im Pool an (falls noch
 * nicht vorhanden). Es werden KEINE E-Mails verschickt.
 */
export async function decideApplicationAction(id: string, status: string): Promise<Result> {
  try {
    const { db, user } = await guard();
    uuid.parse(id);
    const s = z.enum(["new", "reviewing", "on_hold", "accepted", "rejected"]).parse(status);
    const { data: a, error } = await db.from("creator_applications").select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    let creatorId: string | null = a.creator_id;
    if (s === "accepted" && !creatorId) {
      const { data: c, error: ce } = await db
        .from("creators")
        .insert({
          first_name: a.first_name,
          last_name: a.last_name,
          email: a.email,
          phone: a.phone,
          city: a.city,
          birth_year: a.birth_year,
          languages: a.languages ?? [],
          instagram_handle: a.instagram_handle,
          tiktok_handle: a.tiktok_handle,
          experience_level: a.experience === "Professionelles Model / Creator" ? "professional" : a.experience === "Regelmässig vor der Kamera" ? "intermediate" : "beginner",
          status: "pool",
          consent_given: a.privacy_consent,
          consent_date: a.privacy_consent_at,
          consent_note: a.privacy_consent ? "Datenschutz-Einwilligung im Bewerbungsformular" : null,
          photo_path: a.photo_path,
          video_path: a.video_path,
          portfolio_url: a.portfolio_url,
          rate_expectation: a.rate_expectation,
          notes: a.about,
        })
        .select("id")
        .single();
      if (ce) throw new Error(ce.message);
      creatorId = c.id;
    }
    const decided = ["accepted", "rejected", "on_hold"].includes(s);
    check(await db.from("creator_applications").update({ status: s, creator_id: creatorId, decided_at: decided ? new Date().toISOString() : null, decided_by: decided ? user.id : null }).eq("id", id));
    await recordAudit({ action: "creator_application.status", entityType: "creator_application", entityId: id, newValues: { status: s } });
    revalidatePath("/production/creators", "layout");
    const label = { new: "Neu", reviewing: "In Prüfung", on_hold: "Warteliste", accepted: "Angenommen, im Creator Pool", rejected: "Abgelehnt" }[s];
    return { ok: true, message: label, id: creatorId ?? undefined };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Redaktionsplan ----------------------------------------------------------------- */

const contentSchema = z.object({
  title: z.string().trim().min(1).max(300),
  client_id: uuid.nullable(),
  scheduled_for: z.string().nullable(),
  platform: z.string().max(40).nullable(),
  format: z.string().max(40).nullable(),
  topic: z.string().max(300).nullable().optional(),
});

export async function createContentItemAction(input: z.input<typeof contentSchema>): Promise<Result> {
  try {
    const { db, user } = await guard();
    const v = contentSchema.parse(input);
    const { data, error } = await db
      .from("content_projects")
      .insert({
        ...v,
        scheduled_for: v.scheduled_for ? new Date(v.scheduled_for).toISOString() : null,
        content_type: v.format?.toLowerCase() ?? null,
        workspace: v.client_id ? "client" : "ecreator",
        status: v.scheduled_for ? "planning" : "idea",
        owner_id: user.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/production", "layout");
    return { ok: true, message: "Beitrag angelegt", id: data.id };
  } catch (e) {
    return fail(e);
  }
}

export async function setContentStatusAction(id: string, status: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(id);
    const s = z.enum(["idea", "planning", "script", "shoot_planned", "filmed", "editing", "review", "approved", "scheduled", "published"]).parse(status);
    const patch: Record<string, unknown> = { status: s };
    if (s === "published") patch.published_at = new Date().toISOString();
    check(await db.from("content_projects").update(patch).eq("id", id));
    revalidatePath("/production", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function rescheduleContentAction(id: string, date: string | null): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(id);
    check(await db.from("content_projects").update({ scheduled_for: date ? new Date(date).toISOString() : null }).eq("id", id));
    revalidatePath("/production", "layout");
    return { ok: true, message: date ? "Verschoben" : "In den Ideenspeicher gelegt" };
  } catch (e) {
    return fail(e);
  }
}

export async function setPlanStatusAction(id: string, status: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(id);
    const s = z.enum(["planning", "in_review", "approved", "done"]).parse(status);
    check(await db.from("content_plans").update({ status: s }).eq("id", id));
    revalidatePath("/production", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
