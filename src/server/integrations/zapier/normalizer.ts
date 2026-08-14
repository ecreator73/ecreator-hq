import type { NormalizedLead } from "@/server/integrations/meta/normalizer";

/**
 * Zapier schickt je nach Zap unterschiedlich benannte Felder ("Full Name",
 * "full_name", "email", "E-Mail", ...). Diese Normalisierung ist deshalb
 * bewusst tolerant: Schluessel werden vereinheitlicht (klein, ohne Sonder-
 * zeichen) und ueber Alias-Listen gesucht. ALLE Felder bleiben zusaetzlich
 * vollstaendig in metadata_json erhalten - es geht nichts verloren.
 */

/** "Full Name" / "full_name" / "Full-Name" -> "fullname" */
function normKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Flacht verschachtelte Objekte eine Ebene auf (Zapier liefert oft {data:{...}}). */
function flatten(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (key: string, value: unknown) => {
    if (value === null || value === undefined) return;
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        const first = value[0];
        if (first !== undefined && typeof first !== "object") out[normKey(key)] = String(first);
      }
      return;
    }
    const s = String(value).trim();
    if (s !== "") out[normKey(key)] = s;
  };

  for (const [k, v] of Object.entries(input)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) add(k2, v2);
      continue;
    }
    add(k, v);
  }
  return out;
}

function pick(f: Record<string, string>, ...aliases: string[]): string | null {
  for (const a of aliases) {
    const v = f[normKey(a)];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export interface ZapierNormalizeResult {
  lead: NormalizedLead;
  /** true, wenn weder E-Mail noch Telefon noch Name erkennbar waren. */
  empty: boolean;
}

/**
 * Wandelt einen beliebigen Zapier-Payload in einen internen Lead um.
 * `defaultSource` greift, wenn der Payload keine Quelle mitliefert.
 */
export function normalizeZapierLead(
  raw: Record<string, unknown>,
  defaultSource = "meta_ads",
): ZapierNormalizeResult {
  const f = flatten(raw);

  const first = pick(f, "first_name", "firstname", "vorname", "given_name");
  const last = pick(f, "last_name", "lastname", "nachname", "surname", "family_name");
  const full =
    pick(f, "full_name", "fullname", "name", "contact_name", "vollstaendiger_name") ||
    [first, last].filter(Boolean).join(" ").trim() ||
    null;

  const email = pick(f, "email", "e_mail", "emailaddress", "email_address", "work_email", "mail");
  const phone = pick(
    f,
    "phone_number",
    "phone",
    "telefon",
    "telefonnummer",
    "mobile",
    "handy",
    "tel",
  );
  const company = pick(f, "company_name", "company", "firma", "unternehmen", "organisation");

  // Quelle: explizit im Payload, sonst Standard (i.d.R. Meta Lead Ads).
  const rawSource = pick(f, "source", "quelle", "platform", "plattform");
  const source = mapSource(rawSource) ?? defaultSource;

  const externalId =
    pick(f, "lead_id", "leadid", "leadgen_id", "id", "external_lead_id") ??
    // Ohne ID vom Anbieter: stabiler Ersatzschluessel aus Kontaktdaten,
    // damit Wiederholungen desselben Zaps nicht doppelt anlegen.
    `zapier:${(email ?? phone ?? full ?? "unbekannt").toLowerCase()}`;

  return {
    empty: !email && !phone && !full,
    lead: {
      external_lead_id: externalId,
      contact_name: full || company || "Unbekannt",
      first_name: first,
      last_name: last,
      company_name: company || full || "Unbekannt",
      email,
      phone,
      source,
      form_id: pick(f, "form_id", "formid"),
      form_name: pick(f, "form_name", "formname", "formular"),
      ad_id: pick(f, "ad_id", "adid"),
      ad_name: pick(f, "ad_name", "adname", "anzeige"),
      adset_id: pick(f, "adset_id", "adsetid"),
      adset_name: pick(f, "adset_name", "adsetname", "anzeigengruppe"),
      campaign_id: pick(f, "campaign_id", "campaignid"),
      campaign_name: pick(f, "campaign_name", "campaignname", "kampagne"),
      created_at: pick(f, "created_time", "createdtime", "created_at", "datum"),
      metadata_json: {
        provider: "zapier",
        fields: f,
        raw,
      },
    },
  };
}

/** Bekannte Quellen auf unsere Lead-Quellen abbilden (sonst null). */
function mapSource(v: string | null): string | null {
  if (!v) return null;
  const s = normKey(v);
  if (s.includes("facebook") || s.includes("meta") || s.includes("instagram")) return "meta_ads";
  if (s.includes("linkedin")) return "linkedin";
  if (s.includes("google")) return "google_ads";
  if (s.includes("tiktok")) return "tiktok_ads";
  if (s.includes("website") || s.includes("webseite")) return "website";
  return null;
}
