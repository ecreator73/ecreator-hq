/**
 * Einheitliche Kanalklassifizierung fuer First-Party-Leads und Buchungen.
 *
 * Regeln (Briefing «Traffic-Quellen»):
 *  - UTM-basiert; Klick-Kennungen der Werbeplattformen gehen vor.
 *  - Bezahlter Traffic wird NIE als Organic/Direct gezaehlt.
 *  - fbclid ohne UTM ist nicht eindeutig (Meta haengt fbclid auch an organische
 *    Klicks) -> eigener Kanal «Facebook/Instagram (bezahlt oder organisch)».
 *  - Ohne jede Herkunftsangabe: «Unknown / Unattributed», nicht «Direct».
 *
 * Reine Funktionen, keine Abhaengigkeiten - im Server und im UI nutzbar.
 */

export const CHANNELS = [
  { key: "google_ads", label: "Google Ads", paid: true },
  { key: "google_organic", label: "Google Organic", paid: false },
  { key: "meta_ads", label: "Facebook/Instagram Ads", paid: true },
  { key: "meta_organic", label: "Facebook/Instagram organisch", paid: false },
  { key: "meta_unclear", label: "Facebook/Instagram (bezahlt oder organisch)", paid: null },
  { key: "tiktok", label: "TikTok", paid: null },
  { key: "linkedin", label: "LinkedIn", paid: null },
  { key: "microsoft_ads", label: "Microsoft Ads", paid: true },
  { key: "other_paid", label: "Sonstige bezahlt", paid: true },
  { key: "other_search", label: "Andere Suchmaschinen", paid: false },
  { key: "email", label: "E-Mail", paid: false },
  { key: "referral", label: "Referral", paid: false },
  { key: "direct", label: "Direct", paid: false },
  { key: "other", label: "Sonstige", paid: null },
  { key: "unknown", label: "Unknown / Unattributed", paid: null },
] as const;

export type ChannelKey = (typeof CHANNELS)[number]["key"];

export const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  CHANNELS.map((c) => [c.key, c.label]),
);

export function channelLabel(key: string | null | undefined): string {
  if (!key) return CHANNEL_LABELS.unknown!;
  return CHANNEL_LABELS[key] ?? key;
}

/** Gruppen fuer «Leads nach Paid / Organic / Direct / Social». */
export function channelGroup(key: string | null | undefined): "paid" | "organic" | "social" | "direct" | "referral" | "email" | "unknown" {
  switch (key) {
    case "google_ads":
    case "meta_ads":
    case "microsoft_ads":
    case "other_paid":
      return "paid";
    case "google_organic":
    case "other_search":
      return "organic";
    case "meta_organic":
    case "meta_unclear":
    case "tiktok":
    case "linkedin":
      return "social";
    case "direct":
      return "direct";
    case "referral":
      return "referral";
    case "email":
      return "email";
    default:
      return "unknown";
  }
}

export const CHANNEL_GROUP_LABELS: Record<string, string> = {
  paid: "Paid",
  organic: "Organic Search",
  social: "Social",
  direct: "Direct",
  referral: "Referral",
  email: "E-Mail",
  unknown: "Unknown / Unattributed",
};

export const CONFIDENCE_LABELS: Record<string, string> = {
  utm_verified: "Verifiziert per UTM / Klick-ID",
  booking_data: "Aus Buchungsdaten (Calendly)",
  referrer: "Aus Referrer",
  derived: "Aus Aggregaten abgeleitet",
  unknown: "Unbekannt",
};

export interface AttributionInput {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  msclkid?: string | null;
  ttclid?: string | null;
  liFatId?: string | null;
}

export interface Classification {
  channel: ChannelKey;
  confidence: "utm_verified" | "referrer" | "unknown";
}

const PAID_MEDIUMS = new Set([
  "cpc", "ppc", "paid", "paidsearch", "paid_search", "paid-search", "sem", "display",
  "paid_social", "paidsocial", "paid-social", "cpm", "cpv", "banner", "retargeting", "ads", "ad",
]);
const SOCIAL_MEDIUMS = new Set(["social", "organic_social", "social-organic", "social_organic", "sm", "socialmedia"]);
const EMAIL_MEDIUMS = new Set(["email", "e-mail", "e_mail", "newsletter", "mail"]);

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

function isMeta(source: string): boolean {
  return /(^|[^a-z])(facebook|fb|instagram|ig|meta)([^a-z]|$)/.test(source) || source === "facebook" || source === "instagram";
}

function hostOf(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function paidBySource(source: string): ChannelKey {
  if (source.includes("google") || source === "adwords" || source === "gads") return "google_ads";
  if (isMeta(source)) return "meta_ads";
  if (source.includes("tiktok")) return "tiktok";
  if (source.includes("linkedin")) return "linkedin";
  if (source.includes("bing") || source.includes("microsoft")) return "microsoft_ads";
  return "other_paid";
}

export function classifyAttribution(a: AttributionInput): Classification {
  const source = norm(a.utmSource);
  const medium = norm(a.utmMedium);

  // 1) Klick-Kennungen der Werbeplattformen (eindeutig bezahlt)
  if (a.gclid || a.gbraid || a.wbraid) return { channel: "google_ads", confidence: "utm_verified" };
  if (a.msclkid) return { channel: "microsoft_ads", confidence: "utm_verified" };
  if (a.ttclid) return { channel: "tiktok", confidence: "utm_verified" };
  if (a.liFatId) return { channel: "linkedin", confidence: "utm_verified" };

  // 2) UTM-Parameter
  if (source || medium) {
    if (PAID_MEDIUMS.has(medium)) return { channel: paidBySource(source), confidence: "utm_verified" };
    if (EMAIL_MEDIUMS.has(medium) || EMAIL_MEDIUMS.has(source)) return { channel: "email", confidence: "utm_verified" };
    if (isMeta(source)) {
      if (SOCIAL_MEDIUMS.has(medium)) return { channel: "meta_organic", confidence: "utm_verified" };
      return { channel: a.fbclid ? "meta_unclear" : "meta_organic", confidence: "utm_verified" };
    }
    if (source.includes("tiktok")) return { channel: "tiktok", confidence: "utm_verified" };
    if (source.includes("linkedin")) return { channel: "linkedin", confidence: "utm_verified" };
    if (source.includes("google") && (medium === "organic" || medium === "")) return { channel: "google_organic", confidence: "utm_verified" };
    if (medium === "referral") return { channel: "referral", confidence: "utm_verified" };
    return { channel: "other", confidence: "utm_verified" };
  }

  // 3) fbclid ohne UTM: bezahlt oder organisch nicht unterscheidbar
  if (a.fbclid) return { channel: "meta_unclear", confidence: "utm_verified" };

  // 4) Referrer
  const host = hostOf(a.referrer);
  if (host) {
    if (/(^|\.)google\.[a-z.]+$/.test(host)) return { channel: "google_organic", confidence: "referrer" };
    if (/(^|\.)(bing\.com|duckduckgo\.com|ecosia\.org|yahoo\.[a-z.]+|search\.brave\.com|startpage\.com|qwant\.com)$/.test(host))
      return { channel: "other_search", confidence: "referrer" };
    if (/(^|\.)(facebook\.com|fb\.com|instagram\.com|messenger\.com|threads\.net)$/.test(host))
      return { channel: "meta_organic", confidence: "referrer" };
    if (/(^|\.)(linkedin\.com|lnkd\.in)$/.test(host)) return { channel: "linkedin", confidence: "referrer" };
    if (/(^|\.)tiktok\.com$/.test(host)) return { channel: "tiktok", confidence: "referrer" };
    if (/(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com)$/.test(host)) return { channel: "email", confidence: "referrer" };
    return { channel: "referral", confidence: "referrer" };
  }

  // 5) Einstieg bekannt, aber keine Herkunft -> Direct; sonst unbekannt
  if (a.landingPage) return { channel: "direct", confidence: "unknown" };
  return { channel: "unknown", confidence: "unknown" };
}

/** GA4 «Quelle / Medium» auf dieselben Kanaele abbilden (fuer Traffic-Quellen). */
export function classifyGa4(source: string, medium: string): ChannelKey {
  const src = norm(source);
  const med = norm(medium);
  if (src === "(direct)" && (med === "(none)" || med === "(not set)" || med === "")) return "direct";
  if (src === "(not set)" && med === "(not set)") return "unknown";
  if (med === "organic") return src.includes("google") ? "google_organic" : "other_search";
  return classifyAttribution({ utmSource: src, utmMedium: med === "(none)" || med === "(not set)" ? "" : med }).channel;
}
