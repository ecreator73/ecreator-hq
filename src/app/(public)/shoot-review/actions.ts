"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyRoles, rateLimit, type PublicResult } from "@/lib/public-forms";

/**
 * Shoot-Review fuer Kunden (/shoot-review/<token>): Termine bestaetigen,
 * Skripte freigeben oder Rueckmeldung geben, Anpassungswuensche senden.
 */

const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Bitte Angaben prüfen" : e instanceof Error ? e.message : "Unbekannter Fehler",
});

async function shootFor(token: string) {
  if (!/^[\w-]{20,100}$/.test(token)) throw new Error("Dieser Link ist nicht gültig.");
  const { data } = await createAdminClient().from("shoots").select("id, title, responsible_id").eq("share_token", token).is("deleted_at", null).maybeSingle();
  if (!data) throw new Error("Dieser Link ist nicht gültig.");
  return data as { id: string; title: string; responsible_id: string | null };
}

async function tell(shoot: { id: string; title: string; responsible_id: string | null }, title: string, body: string) {
  const db = createAdminClient();
  if (shoot.responsible_id) {
    await db.from("notifications").insert({ user_id: shoot.responsible_id, type: "shoot_review", title, body, entity_type: "shoot", entity_id: shoot.id });
  } else {
    await notifyRoles(["super_admin", "ceo", "project_manager", "creative"], { type: "shoot_review", title, body, entityType: "shoot", entityId: shoot.id });
  }
}

export async function customerAvailabilityAction(token: string, optionId: string, available: boolean): Promise<PublicResult> {
  try {
    z.string().uuid().parse(optionId);
    await rateLimit("shoot_review", 60, 60);
    const shoot = await shootFor(token);
    const { error } = await createAdminClient().from("shoot_date_options").update({ customer_available: available }).eq("id", optionId).eq("shoot_id", shoot.id);
    if (error) throw new Error("Speichern fehlgeschlagen");
    revalidatePath(`/shoot-review/${token}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Nach dem Auswaehlen der Termine einmal Bescheid geben. */
export async function confirmDatesAction(token: string): Promise<PublicResult> {
  try {
    await rateLimit("shoot_review", 60, 60);
    const shoot = await shootFor(token);
    const { data } = await createAdminClient().from("shoot_date_options").select("starts_at, customer_available").eq("shoot_id", shoot.id);
    const ok = (data ?? []).filter((d) => d.customer_available).length;
    await tell(shoot, `Terminrückmeldung: ${shoot.title}`, `Der Kunde kann an ${ok} von ${data?.length ?? 0} vorgeschlagenen Terminen.`);
    return { ok: true, message: "Danke, wir bestätigen den Termin in Kürze." };
  } catch (e) {
    return fail(e);
  }
}

export async function scriptDecisionAction(token: string, scriptId: string, decision: "approved" | "changes", feedback: string): Promise<PublicResult> {
  try {
    z.string().uuid().parse(scriptId);
    const fb = z.string().max(3000).parse(feedback ?? "").trim();
    if (decision === "changes" && fb.length < 3) throw new Error("Bitte kurz beschreiben, was wir ändern sollen.");
    await rateLimit("shoot_review", 60, 60);
    const shoot = await shootFor(token);
    const db = createAdminClient();
    const { data: s } = await db.from("shoot_scripts").select("title, video_number").eq("id", scriptId).eq("shoot_id", shoot.id).maybeSingle();
    if (!s) throw new Error("Skript nicht gefunden");
    const { error } = await db
      .from("shoot_scripts")
      .update({ status: decision === "approved" ? "approved" : "draft", customer_feedback: fb || null, customer_decided_at: new Date().toISOString() })
      .eq("id", scriptId);
    if (error) throw new Error("Speichern fehlgeschlagen");
    await tell(shoot, decision === "approved" ? `Skript freigegeben: ${shoot.title}` : `Skript-Änderung gewünscht: ${shoot.title}`, `Video ${s.video_number ?? "–"}${s.title ? ` · ${s.title}` : ""}${fb ? `: ${fb.slice(0, 200)}` : ""}`);
    revalidatePath(`/shoot-review/${token}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function changeRequestAction(token: string, name: string, message: string): Promise<PublicResult> {
  try {
    const n = z.string().max(120).parse(name ?? "").trim();
    const m = z.string().trim().min(3, "Bitte beschreiben Sie kurz Ihre Wünsche.").max(5000).parse(message ?? "");
    await rateLimit("shoot_change", 10, 60);
    const shoot = await shootFor(token);
    const { error } = await createAdminClient().from("shoot_change_requests").insert({ shoot_id: shoot.id, name: n || null, message: m });
    if (error) throw new Error("Senden fehlgeschlagen, bitte erneut versuchen.");
    await tell(shoot, `Anpassungswunsch: ${shoot.title}`, `${n ? `${n}: ` : ""}${m.slice(0, 200)}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
