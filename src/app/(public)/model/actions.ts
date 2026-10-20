"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyRoles, rateLimit, safeName, type PublicResult } from "@/lib/public-forms";
import { normalizeLanguages, socialHandle } from "@/lib/languages";

/**
 * Oeffentliche Creator-Bewerbung (/model). Dateien gehen ueber einmalige
 * Upload-Links direkt in den privaten Speicher «creator-media»
 * (applications/<id>/...), die Bewerbung wird serverseitig gespeichert.
 * Vom Geburtsdatum wird nur der Jahrgang gespeichert.
 */

const BUCKET = "creator-media";
const MAX_MB = { video: 50, photo: 20 } as const;
const TYPES = {
  video: ["video/mp4", "video/quicktime", "video/webm"],
  photo: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
} as const;
const EXPERIENCE = ["Keine Erfahrung", "Erste Erfahrungen", "Regelmässig vor der Kamera", "Professionelles Model / Creator"] as const;

const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Bitte Angaben prüfen" : e instanceof Error ? e.message : "Unbekannter Fehler",
});

/** Einmaligen Upload-Link fuer Video oder Foto/Dokument holen. */
export async function prepareCreatorUploadAction(input: { applicationId?: string | null; kind: "video" | "photo"; name: string; size: number; type: string }): Promise<PublicResult<{ applicationId: string; path: string; url: string }>> {
  try {
    const v = z
      .object({
        applicationId: z.string().uuid().nullish(),
        kind: z.enum(["video", "photo"]),
        name: z.string().min(1).max(200),
        size: z.number().int().positive(),
        type: z.string().max(100),
      })
      .parse(input);
    if (!(TYPES[v.kind] as readonly string[]).includes(v.type)) throw new Error(v.kind === "video" ? "Bitte MP4, MOV oder WEBM wählen" : "Bitte JPG, PNG, WEBP oder PDF wählen");
    if (v.size > MAX_MB[v.kind] * 1024 * 1024) throw new Error(`Datei zu gross (max. ${MAX_MB[v.kind]} MB)${v.kind === "video" ? ". Grössere Videos bitte als Link angeben." : ""}`);
    await rateLimit("creator_upload", 12, 60);
    const id = v.applicationId ?? randomUUID();
    const path = `applications/${id}/${v.kind}_${Date.now()}_${safeName(v.name)}`;
    const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new Error("Upload konnte nicht vorbereitet werden");
    return { ok: true, data: { applicationId: id, path, url: data.signedUrl } };
  } catch (e) {
    return fail(e);
  }
}

const schema = z.object({
  applicationId: z.string().uuid().nullish(),
  first_name: z.string().trim().min(1, "Bitte Vorname angeben").max(80),
  last_name: z.string().trim().min(1, "Bitte Nachname angeben").max(80),
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail angeben").max(200),
  phone: z.string().trim().min(5, "Bitte Telefonnummer angeben").max(40),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte Geburtsdatum angeben"),
  location: z.string().trim().min(2, "Bitte Wohnort / Kanton angeben").max(120),
  instagram: z.string().max(200).optional(),
  tiktok: z.string().max(200).optional(),
  languages: z.string().trim().min(2, "Bitte Sprachen angeben").max(200),
  experience: z.enum(EXPERIENCE, { errorMap: () => ({ message: "Bitte Erfahrung auswählen" }) }),
  rate_expectation: z.string().max(200).optional(),
  portfolio_url: z.string().max(500).optional(),
  about: z.string().max(3000).optional(),
  privacy: z.literal(true, { errorMap: () => ({ message: "Bitte Datenschutz bestätigen" }) }),
  videoPath: z.string().max(300).nullish(),
  photoPath: z.string().max(300).nullish(),
  utm: z.record(z.string().max(200)).optional(),
  referrer: z.string().max(300).optional(),
  website: z.string().max(0).optional(), // Honeypot: muss leer bleiben
});

export async function submitCreatorApplicationAction(input: z.input<typeof schema>): Promise<PublicResult> {
  try {
    const v = schema.parse(input);
    await rateLimit("creator_application", 5, 60);
    const year = Number(v.birthdate.slice(0, 4));
    const now = new Date().getFullYear();
    if (year < now - 90 || year > now - 14) throw new Error("Bitte gültiges Geburtsdatum angeben");
    const id = v.applicationId ?? randomUUID();
    const db = createAdminClient();

    // Dateien muessen im eigenen Ordner liegen und vorhanden sein
    const files: Record<"photo" | "video", string | null> = { photo: null, video: null };
    for (const [k, p] of [["photo", v.photoPath], ["video", v.videoPath]] as const) {
      if (!p) continue;
      if (!p.startsWith(`applications/${id}/${k}_`)) throw new Error("Upload ungültig, bitte Datei erneut wählen");
      const name = p.slice(p.lastIndexOf("/") + 1);
      const { data } = await db.storage.from(BUCKET).list(`applications/${id}`, { search: name });
      if (!data?.some((o) => o.name === name)) throw new Error("Upload nicht vollständig, bitte Datei erneut wählen");
      files[k] = p;
    }

    const utm = v.utm ?? {};
    const { error } = await db.from("creator_applications").insert({
      id,
      status: "new",
      first_name: v.first_name,
      last_name: v.last_name,
      email: v.email,
      phone: v.phone,
      birth_year: year,
      city: v.location,
      instagram_handle: socialHandle(v.instagram),
      tiktok_handle: socialHandle(v.tiktok),
      languages: normalizeLanguages(v.languages),
      experience: v.experience,
      about: v.about?.trim() || null,
      portfolio_url: v.portfolio_url?.trim() || null,
      rate_expectation: v.rate_expectation?.trim() || null,
      photo_file: files.photo,
      video_file: files.video,
      source: "creator_landingpage",
      utm_source: utm.utm_source ?? null,
      utm_medium: utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
      referrer: v.referrer ? v.referrer.replace(/^https?:\/\//, "").split("/")[0] : null,
      privacy_consent: true,
      privacy_consent_at: new Date().toISOString(),
    });
    if (error) throw new Error(/duplicate/i.test(error.message) ? "Diese Bewerbung wurde bereits gesendet." : "Bewerbung konnte nicht gespeichert werden. Bitte später erneut versuchen.");
    await notifyRoles(["super_admin", "ceo", "project_manager", "creative"], {
      type: "creator_application",
      title: `Neue Creator-Bewerbung: ${v.first_name} ${v.last_name.slice(0, 1)}.`,
      body: `${v.location} · ${v.experience}`,
      entityType: "creator_application",
      entityId: id,
    });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
