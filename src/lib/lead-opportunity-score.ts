import type { WebsiteScan } from "@/types/entities";

/**
 * Regelbasierte Opportunity-Bewertung aus dem Website-Scan (Struktur, keine
 * tiefe AI-Analyse - das kommt spaeter als eigene Engine). Hoher Score =
 * grosse Chance fuer eCreator (z.B. schlechte/fehlende Website => hoher
 * Website-Score).
 */

export interface OpportunityScores {
  website: number;
  ads: number;
  content: number;
  recruiting: number;
  crm: number;
  overall: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeScores(scan: WebsiteScan | null | undefined): OpportunityScores {
  const s = scan ?? {};
  const hasWebsite = s.has_website !== false; // unbekannt -> als vorhanden behandeln
  const slow = (s.load_time_ms ?? 0) > 3000;

  // Website: je schlechter/fehlender, desto groesser die Chance
  let website = 0;
  if (s.has_website === false) {
    website = 95;
  } else {
    if (s.mobile_friendly === false) website += 25;
    if (s.https === false) website += 15;
    if (s.has_contact_form === false) website += 15;
    if (s.has_cta === false) website += 12;
    if (s.has_imprint === false) website += 8;
    if (slow) website += 15;
    if (s.has_social_links === false) website += 5;
  }

  // Ads: braucht Website + Tracking + Conversion-Elemente
  let ads = 0;
  if (hasWebsite) {
    ads += 20;
    if (s.has_tracking === false) ads += 40;
    if (s.has_cta === false) ads += 20;
    if (s.has_contact_form === false) ads += 15;
  } else {
    ads = 15; // erst Website noetig
  }

  // Content: fast immer relevant, mehr wenn keine Social-Praesenz
  let content = 45;
  if (s.has_social_links === false) content += 30;
  if (hasWebsite) content += 10;

  // Recruiting: generelle Grundchance
  const recruiting = 40;

  // CRM: wenn Leads reinkommen (Formular) aber kein System sichtbar
  let crm = 0;
  if (s.has_contact_form === true) crm += 45;
  if (hasWebsite) crm += 30;
  if (s.has_cta === true) crm += 10;

  const scores = {
    website: clamp(website),
    ads: clamp(ads),
    content: clamp(content),
    recruiting: clamp(recruiting),
    crm: clamp(crm),
  };
  const max = Math.max(...Object.values(scores));
  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 5;
  const overall = clamp(0.6 * max + 0.4 * avg);

  return { ...scores, overall };
}

export interface BuiltOpportunity {
  opportunity_type: string;
  score: number;
  findings: string;
  recommendations: string;
}

const RECOMMENDATIONS: Record<string, string> = {
  website: "Moderner Website-Relaunch mit klarer Struktur, mobiler Optimierung und Conversion-Fokus.",
  ads: "Tracking aufsetzen und performante Meta-/Google-Ads-Kampagnen mit passender Landingpage.",
  content: "Content-Produktion (Reels, UGC, Ads-Creatives) fuer mehr Reichweite und Vertrauen.",
  recruiting: "Recruiting-Funnel mit Video-Ads und Bewerber-CRM aufbauen.",
  crm: "Lead-CRM mit Pipeline und Automationen, damit keine Anfrage verloren geht.",
};

/** Opportunities (>= Schwelle) mit Begruendung und Empfehlung erzeugen. */
export function buildOpportunities(
  scan: WebsiteScan | null | undefined,
  threshold = 50,
): BuiltOpportunity[] {
  const scores = computeScores(scan);
  const s = scan ?? {};
  const out: BuiltOpportunity[] = [];

  const push = (type: keyof typeof RECOMMENDATIONS, score: number, findings: string) => {
    if (score >= threshold) {
      out.push({ opportunity_type: type, score, findings, recommendations: RECOMMENDATIONS[type]! });
    }
  };

  push(
    "website",
    scores.website,
    s.has_website === false
      ? "Keine Website vorhanden."
      : [
          s.mobile_friendly === false ? "nicht mobil-optimiert" : null,
          s.https === false ? "kein HTTPS" : null,
          s.has_contact_form === false ? "kein Kontaktformular" : null,
          s.has_cta === false ? "kein klarer CTA" : null,
        ]
          .filter(Boolean)
          .join(", ") || "Website mit Verbesserungspotenzial.",
  );
  push("ads", scores.ads, s.has_tracking === false ? "Kein Tracking erkennbar - Ads aktuell nicht messbar." : "Ads-Potenzial vorhanden.");
  push("content", scores.content, s.has_social_links === false ? "Keine Social-Praesenz erkennbar." : "Content-Potenzial vorhanden.");
  push("crm", scores.crm, s.has_contact_form === true ? "Anfragen kommen rein, aber kein CRM erkennbar." : "CRM-Potenzial vorhanden.");
  push("recruiting", scores.recruiting, "Recruiting-Funnel koennte Bewerber bringen.");

  return out.sort((a, b) => b.score - a.score);
}
