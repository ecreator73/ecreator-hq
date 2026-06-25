import type { MetaLeadRaw } from "./client";

export interface NormalizedLead {
  external_lead_id: string;
  contact_name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string;
  email: string | null;
  phone: string | null;
  source: string; // "meta_ads"
  form_id: string | null;
  form_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  created_at: string | null;
  /** Vollstaendige Rohdaten + alle (auch unbekannten) Formularfelder. */
  metadata_json: Record<string, unknown>;
}

const pick = (f: Record<string, string>, ...keys: string[]): string | null => {
  for (const k of keys) {
    const v = f[k];
    if (v && v.trim()) return v.trim();
  }
  return null;
};

/**
 * Wandelt einen Meta-Rohlead in das interne Lead-Format um. Alle Formularfelder
 * (auch unbekannte) bleiben unter metadata_json.fields erhalten; die komplette
 * Rohantwort unter metadata_json.raw.
 */
export function normalizeMetaLead(
  raw: MetaLeadRaw,
  ctx: { form_name?: string | null } = {},
): NormalizedLead {
  const fields: Record<string, string> = {};
  for (const fd of raw.field_data ?? []) {
    fields[fd.name] = (fd.values ?? [])[0] ?? "";
  }

  const first = pick(fields, "first_name", "vorname");
  const last = pick(fields, "last_name", "nachname");
  const full =
    pick(fields, "full_name", "name") ||
    [first, last].filter(Boolean).join(" ") ||
    null;
  const company = pick(fields, "company_name", "company", "firma");
  const email = pick(fields, "email", "e-mail", "work_email");
  const phone = pick(fields, "phone_number", "phone", "telefon", "telefonnummer");

  return {
    external_lead_id: raw.id,
    contact_name: full || "Unbekannt",
    first_name: first,
    last_name: last,
    company_name: company || full || "Unbekannt",
    email,
    phone,
    source: "meta_ads",
    form_id: raw.form_id ?? null,
    form_name: ctx.form_name ?? null,
    ad_id: raw.ad_id ?? null,
    ad_name: raw.ad_name ?? null,
    adset_id: raw.adset_id ?? null,
    adset_name: raw.adset_name ?? null,
    campaign_id: raw.campaign_id ?? null,
    campaign_name: raw.campaign_name ?? null,
    created_at: raw.created_time ?? null,
    metadata_json: {
      provider: "meta",
      fields,
      raw: raw as unknown as Record<string, unknown>,
    },
  };
}
