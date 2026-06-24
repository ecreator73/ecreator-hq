import type { WebsiteScan, AuditCategoryScore } from "@/types/entities";
import { AUDIT_CATEGORIES, auditScoreLevel } from "@/config/catalog";

/**
 * Regelbasierte Audit-Engine (Struktur, kein Live-Fetch, keine tiefe AI - das
 * kommt spaeter). Hoher Score = gute Website. Leitet aus dem Website-Scan die
 * 8 Kategorie-Scores, Findings, Opportunities und eine AI-artige Zusammenfassung
 * ab.
 */

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const on = (b: boolean | undefined, pts: number) => (b === true ? pts : 0);

export interface AuditScores {
  design: number;
  conversion: number;
  seo: number;
  trust: number;
  performance: number;
  mobile: number;
  content: number;
  tracking: number;
  overall: number;
}

export function computeAuditScores(scan: WebsiteScan | null | undefined): AuditScores {
  const s = scan ?? {};
  if (s.has_website === false) {
    return { design: 5, conversion: 5, seo: 5, trust: 5, performance: 5, mobile: 5, content: 5, tracking: 5, overall: 5 };
  }
  const lt = s.load_time_ms ?? 0;
  const fast = lt > 0 && lt < 1500;
  const slow = lt > 3000;

  const design = clamp(40 + on(s.mobile_friendly, 25) + on(s.has_cta, 20) + on(s.has_social_links, 15));
  const conversion = clamp(25 + on(s.has_contact_form, 35) + on(s.has_cta, 30) + on(s.has_imprint, 10));
  const seo = clamp(40 + on(s.https, 20) + on(s.has_imprint, 15) + on(s.mobile_friendly, 15) + on(s.has_social_links, 10));
  const trust = clamp(30 + on(s.https, 20) + on(s.has_imprint, 30) + on(s.has_social_links, 20));
  const performance = clamp(fast ? 90 : slow ? 35 : 65);
  const mobile = s.mobile_friendly === true ? 90 : s.mobile_friendly === false ? 30 : 55;
  const content = clamp(45 + on(s.has_social_links, 20) + on(s.has_cta, 15) + on(s.has_contact_form, 10));
  const tracking = s.has_tracking === true ? 85 : s.has_tracking === false ? 25 : 50;

  const vals = [design, conversion, seo, trust, performance, mobile, content, tracking];
  const overall = clamp(vals.reduce((a, b) => a + b, 0) / vals.length);
  return { design, conversion, seo, trust, performance, mobile, content, tracking, overall };
}

export function categoryScores(scores: AuditScores): AuditCategoryScore[] {
  return AUDIT_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    score: (scores as unknown as Record<string, number>)[`${c.key}`] ?? 0,
  }));
}

const FINDING_TEXT: Record<string, { title: string; description: string; recommendation: string }> = {
  design: { title: "Design wirkt veraltet", description: "Das Design entspricht nicht modernen Standards und wirkt wenig vertrauenswuerdig.", recommendation: "Modernes, klares Redesign mit starker Markenpraesenz." },
  conversion: { title: "Schwache Conversion-Elemente", description: "Es fehlen klare Handlungsaufforderungen, Kontaktmoeglichkeiten oder Terminbuchung.", recommendation: "Klare CTAs, Kontaktformular und Terminbuchung ergaenzen." },
  seo: { title: "SEO-Potenzial ungenutzt", description: "Grundlegende SEO-Elemente (Struktur, Local SEO) sind nicht optimal.", recommendation: "On-Page-SEO und Local-SEO-Setup." },
  trust: { title: "Wenig Vertrauenselemente", description: "Bewertungen, Referenzen, Team oder Impressum fehlen oder sind schwach.", recommendation: "Testimonials, Referenzen und Trust-Elemente integrieren." },
  performance: { title: "Langsame Ladezeit", description: "Die Seite laedt langsam - das kostet Besucher und Rankings.", recommendation: "Performance-Optimierung (Bilder, Hosting, Code)." },
  mobile: { title: "Nicht mobil-optimiert", description: "Die Seite ist auf Mobilgeraeten schlecht nutzbar.", recommendation: "Responsive-Optimierung und mobile CTAs." },
  content: { title: "Duenner Content", description: "Es fehlt ueberzeugender, aktueller Content.", recommendation: "Content-Produktion (Texte, Reels, Ad-Creatives)." },
  tracking: { title: "Kein Tracking erkennbar", description: "Ohne Tracking sind Marketing-Massnahmen nicht messbar.", recommendation: "Meta-Pixel, Google Analytics und Conversion-Tracking einrichten." },
};

export interface BuiltFinding {
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
}

function severityFor(score: number): string {
  if (score < 40) return "critical";
  if (score < 55) return "high";
  if (score < 70) return "medium";
  return "low";
}

export function buildFindings(scores: AuditScores): BuiltFinding[] {
  const out: BuiltFinding[] = [];
  for (const c of AUDIT_CATEGORIES) {
    const score = (scores as unknown as Record<string, number>)[c.key] ?? 0;
    if (score < 70) {
      const t = FINDING_TEXT[c.key]!;
      out.push({ category: c.key, severity: severityFor(score), ...t });
    }
  }
  const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return out.sort((a, b) => rank[a.severity]! - rank[b.severity]!);
}

export interface BuiltAuditOpportunity {
  opportunity_type: string;
  score: number;
  reason: string;
  recommendation: string;
}

export function buildAuditOpportunities(scores: AuditScores): BuiltAuditOpportunity[] {
  const out: BuiltAuditOpportunity[] = [];
  const push = (type: string, score: number, reason: string, recommendation: string) => {
    if (score >= 40) out.push({ opportunity_type: type, score: clamp(score), reason, recommendation });
  };
  const designConv = Math.min(scores.design, scores.conversion);
  if (designConv < 35) push("new_website", 100 - designConv, "Website veraltet / schwache Conversion.", "Komplett neue, conversion-optimierte Website.");
  else if (designConv < 60) push("relaunch", 100 - designConv, "Design und Conversion ausbaufaehig.", "Website-Relaunch mit Conversion-Fokus.");
  if (scores.seo < 65) push("seo", 100 - scores.seo, "SEO-Potenzial ungenutzt.", "On-Page- und Local-SEO-Setup.");
  if (scores.tracking < 55) {
    push("meta_ads", 100 - scores.tracking, "Kein Tracking - Ads aktuell nicht messbar.", "Tracking + Meta-Ads-Kampagnen.");
    push("google_ads", 95 - scores.tracking, "Suchpotenzial ungenutzt.", "Google-Ads mit sauberem Tracking.");
  }
  if (scores.conversion < 55) push("crm", 100 - scores.conversion, "Anfragen koennen verloren gehen.", "Lead-CRM mit Pipeline und Automationen.");
  if (scores.content < 60) push("content", 100 - scores.content, "Wenig ueberzeugender Content.", "Content-Produktion fuer Reichweite und Vertrauen.");
  return out.sort((a, b) => b.score - a.score);
}

export interface AuditSummary {
  executive_summary: string;
  top_problems: string[];
  quick_wins: string[];
  sales_opportunity: string;
}

export function buildSummary(
  scores: AuditScores,
  findings: BuiltFinding[],
  opportunities: BuiltAuditOpportunity[],
  label: string,
): AuditSummary {
  const level = auditScoreLevel(scores.overall).label;
  const executive_summary =
    `${label} erreicht einen Gesamtscore von ${scores.overall}/100 (${level}). ` +
    `Die groessten Hebel liegen bei ${findings.slice(0, 3).map((f) => f.title.toLowerCase()).join(", ") || "der Gesamtoptimierung"}. ` +
    `Mit gezielten Massnahmen laesst sich die Wirkung deutlich steigern.`;
  const top_problems = findings.slice(0, 5).map((f) => f.title);
  const quick_wins = findings
    .filter((f) => f.severity === "medium" || f.severity === "high")
    .slice(0, 5)
    .map((f) => f.recommendation);
  const topOpp = opportunities[0];
  const sales_opportunity = topOpp
    ? `Groesste Chance: ${topOpp.recommendation} eCreator kann hier direkt unterstuetzen.`
    : "eCreator kann die Website ganzheitlich optimieren.";
  return { executive_summary, top_problems, quick_wins: quick_wins.length ? quick_wins : top_problems, sales_opportunity };
}
