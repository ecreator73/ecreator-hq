"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyRoles, rateLimit, safeName, type PublicResult } from "@/lib/public-forms";

/**
 * Oeffentliches Kunden-Onboarding (/onboarding). Mit persoenlichem Link
 * (?k=<onboarding_token>) wird die Einsendung direkt dem Kunden zugeordnet.
 * Unterlagen gehen in den privaten Speicher «client-uploads».
 */

const BUCKET = "client-uploads";
const MAX_FILE = 20 * 1024 * 1024;
const MAX_FILES = 10;

const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Bitte Angaben prüfen" : e instanceof Error ? e.message : "Unbekannter Fehler",
});

export async function prepareOnboardingUploadAction(input: { submissionId?: string | null; name: string; size: number; type: string }): Promise<PublicResult<{ submissionId: string; path: string; url: string }>> {
  try {
    const v = z.object({ submissionId: z.string().uuid().nullish(), name: z.string().min(1).max(200), size: z.number().int().positive(), type: z.string().max(120) }).parse(input);
    if (v.size > MAX_FILE) throw new Error("Datei zu gross (max. 20 MB)");
    await rateLimit("onboarding_upload", 30, 60);
    const id = v.submissionId ?? randomUUID();
    const path = `onboarding/${id}/${Date.now()}_${safeName(v.name)}`;
    const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new Error("Dieser Dateityp wird nicht unterstützt");
    return { ok: true, data: { submissionId: id, path, url: data.signedUrl } };
  } catch (e) {
    return fail(e);
  }
}

const text = (max: number) => z.string().max(max).optional();
const schema = z.object({
  token: z.string().max(100).nullish(),
  submissionId: z.string().uuid().nullish(),
  firma: z.string().trim().min(2, "Bitte Firma angeben").max(200),
  name: z.string().trim().min(2, "Bitte deinen Namen angeben").max(120),
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail angeben").max(200),
  telefon: z.string().trim().min(5, "Bitte Telefonnummer angeben").max(40),
  adresse: text(200),
  plz: text(10),
  ort: text(100),
  website: text(200),
  branche: text(120),
  beschreibung: text(3000),
  angebot: text(3000),
  usp: text(3000),
  konkurrenz: text(500),
  ziele: text(3000),
  zielgruppe: text(3000),
  region: text(300),
  budget: text(20),
  zugaenge: text(2000),
  unterlagen: text(2000),
  ansprechpartner: text(120),
  ansprechpartner_kontakt: text(200),
  kommunikation: text(120),
  startdatum: text(10),
  bemerkungen: text(3000),
  files: z.array(z.object({ path: z.string().max(300), name: z.string().max(200), size: z.number().int().nonnegative() })).max(MAX_FILES).default([]),
  hp: z.string().max(0).optional(), // Honeypot
});

export async function submitOnboardingAction(input: z.input<typeof schema>): Promise<PublicResult> {
  try {
    const v = schema.parse(input);
    await rateLimit("onboarding", 5, 60);
    const db = createAdminClient();
    let clientId: string | null = null;
    if (v.token) {
      const { data } = await db.from("clients").select("id").eq("onboarding_token", v.token).maybeSingle();
      clientId = data?.id ?? null;
    }
    const id = v.submissionId ?? randomUUID();
    const total = v.files.reduce((s, f) => s + f.size, 0);
    if (total > 50 * 1024 * 1024) throw new Error("Zusammen max. 50 MB an Dateien");
    // Nur Dateien aus dem eigenen Upload-Ordner, die wirklich vorhanden sind
    const listed = v.files.length ? ((await db.storage.from(BUCKET).list(`onboarding/${id}`, { limit: 100 })).data ?? []) : [];
    const names = new Set(listed.map((o) => o.name));
    const files = v.files.filter((f) => f.path.startsWith(`onboarding/${id}/`) && names.has(f.path.slice(f.path.lastIndexOf("/") + 1)));

    const answers = Object.fromEntries(
      (["beschreibung", "angebot", "usp", "konkurrenz", "ziele", "zielgruppe", "zugaenge", "unterlagen", "ansprechpartner", "ansprechpartner_kontakt", "kommunikation", "startdatum", "bemerkungen"] as const)
        .map((k) => [k, v[k]?.trim() || null])
        .filter(([, val]) => val),
    );
    const { error } = await db.from("client_onboarding_submissions").insert({
      id,
      client_id: clientId,
      status: "open",
      company: v.firma,
      name: v.name,
      email: v.email,
      phone: v.telefon,
      address: v.adresse?.trim() || null,
      zip_code: v.plz?.trim() || null,
      city: v.ort?.trim() || null,
      website: v.website?.trim() || null,
      industry: v.branche?.trim() || null,
      region: v.region?.trim() || null,
      monthly_ad_budget: v.budget?.trim() || null,
      answers,
      files,
    });
    if (error) throw new Error(/duplicate/i.test(error.message) ? "Das Onboarding wurde bereits gesendet." : "Speichern fehlgeschlagen. Bitte später erneut versuchen.");
    await notifyRoles(["super_admin", "ceo", "cso", "project_manager"], {
      type: "client_onboarding",
      title: `Onboarding eingegangen: ${v.firma}`,
      body: clientId ? "Dem Kunden zugeordnet" : "Bitte einem Kunden zuweisen",
      entityType: "client_onboarding",
      entityId: id,
    });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
