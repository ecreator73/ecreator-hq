import {
  LINKEDIN_TERMINAL_STATUSES,
  type LinkedInProspectStatus,
} from "@/config/catalog";
import type { LinkedInProspect } from "@/types/entities";

/**
 * LinkedIn-Sales-Fachlogik: Lead-Score, Follow-up-Regeln und regelbasierte
 * Insights. ALLES rein datenbasiert - keine Halluzinationen, kein LLM-Call.
 */

export function isTerminalProspectStatus(status: string): boolean {
  return (LINKEDIN_TERMINAL_STATUSES as readonly string[]).includes(status);
}

/* --------------------------------------------------------------------------
 * Follow-up-Regeln: Statuswechsel -> automatische Aufgabe + Termin
 * ------------------------------------------------------------------------ */

export interface FollowupRule {
  days: number;
  taskTitle: string;
}

/** Status -> automatisches Follow-up (Tage + Aufgabentitel). */
export const LINKEDIN_FOLLOWUP_RULES: Partial<Record<LinkedInProspectStatus, FollowupRule>> = {
  neu: { days: 1, taskTitle: "Prospect recherchieren und Kontaktanfrage vorbereiten" },
  zu_recherchieren: { days: 2, taskTitle: "Recherche abschliessen" },
  kontaktanfrage_gesendet: { days: 3, taskTitle: "Kontaktanfrage nachfassen" },
  verbunden: { days: 1, taskTitle: "Erste Nachricht senden" },
  erste_nachricht_gesendet: { days: 7, taskTitle: "Follow-up zur ersten Nachricht" },
  antwort_erhalten: { days: 1, taskTitle: "Antworten und Gespraech vorschlagen" },
  termin_vereinbart: { days: 1, taskTitle: "Termin vorbereiten" },
  angebot: { days: 5, taskTitle: "Angebot nachfassen" },
  spaeter_kontaktieren: { days: 30, taskTitle: "Reaktivierung: erneut kontaktieren" },
};

export function followupDateFor(status: LinkedInProspectStatus, from = new Date()): string | null {
  const rule = LINKEDIN_FOLLOWUP_RULES[status];
  if (!rule) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + rule.days);
  return d.toISOString().slice(0, 10);
}

/* --------------------------------------------------------------------------
 * Lead-Score (0-100, regelbasiert)
 * ------------------------------------------------------------------------ */

const STATUS_SCORE: Record<string, number> = {
  neu: 5,
  zu_recherchieren: 8,
  kontaktanfrage_gesendet: 15,
  verbunden: 30,
  erste_nachricht_gesendet: 35,
  antwort_erhalten: 55,
  termin_vereinbart: 75,
  angebot: 85,
  gewonnen: 100,
  verloren: 0,
  nicht_interessiert: 0,
  spaeter_kontaktieren: 20,
};

export interface ProspectScoreInput {
  status: string;
  priority: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  company_description?: string | null;
  possible_problems?: string | null;
  potential_marketing?: string | null;
  potential_crm?: string | null;
  potential_seo?: string | null;
  potential_ads?: string | null;
  potential_website?: string | null;
}

/**
 * Score = Prozessfortschritt (max 60) + Datenqualitaet (max 20)
 *       + erkanntes Potenzial (max 15) + Prioritaet (max 5).
 */
export function computeProspectScore(p: ProspectScoreInput): number {
  let score = Math.round((STATUS_SCORE[p.status] ?? 0) * 0.6);

  // Datenqualitaet: erreichbar + recherchiert
  if (p.email) score += 5;
  if (p.phone) score += 5;
  if (p.linkedin_url) score += 3;
  if (p.website) score += 3;
  if (p.company_description) score += 4;

  // Potenzial: je gefuelltem Potenzial-Feld
  const potentials = [
    p.potential_marketing,
    p.potential_crm,
    p.potential_seo,
    p.potential_ads,
    p.potential_website,
  ].filter((v) => (v ?? "").trim().length > 0).length;
  score += Math.min(12, potentials * 3);
  if ((p.possible_problems ?? "").trim()) score += 3;

  if (p.priority === "high") score += 5;
  else if (p.priority === "medium") score += 2;

  if (p.status === "verloren" || p.status === "nicht_interessiert") return 0;
  return Math.max(0, Math.min(100, score));
}

export const HOT_PROSPECT_THRESHOLD = 70;

/* --------------------------------------------------------------------------
 * KI-Insights (regelbasiert; nur aus vorhandenen Daten)
 * ------------------------------------------------------------------------ */

export interface ProspectInsight {
  tone: "green" | "amber" | "red" | "blue";
  title: string;
  detail: string;
}

const POTENTIAL_SERVICES: Array<{
  field: keyof LinkedInProspect;
  service: string;
}> = [
  { field: "potential_website", service: "Webseiten" },
  { field: "potential_seo", service: "SEO" },
  { field: "potential_ads", service: "Performance Marketing" },
  { field: "potential_crm", service: "CRM & Automatisierungen" },
  { field: "potential_marketing", service: "Marketing-Strategie" },
];

/** Passende eCreator-Dienstleistungen aus den gefuellten Potenzial-Feldern. */
export function matchingServices(p: LinkedInProspect): string[] {
  return POTENTIAL_SERVICES.filter(({ field }) => {
    const v = p[field];
    return typeof v === "string" && v.trim().length > 0;
  }).map((x) => x.service);
}

/**
 * Regelbasierte Analyse "Warum koennte eCreator helfen?" - ausschliesslich
 * aus den erfassten Recherche-Daten abgeleitet. Fehlt die Recherche, sagt
 * das System das ehrlich, statt zu erfinden.
 */
export function buildProspectInsights(
  p: LinkedInProspect,
  ctx: { openTasks: number; daysSinceActivity: number | null },
): ProspectInsight[] {
  const out: ProspectInsight[] = [];
  const services = matchingServices(p);

  if (services.length) {
    out.push({
      tone: "green",
      title: `Passende Dienstleistungen: ${services.join(", ")}`,
      detail: "Abgeleitet aus den gefuellten Potenzial-Feldern der Recherche.",
    });
  }
  if ((p.possible_problems ?? "").trim()) {
    out.push({
      tone: "amber",
      title: "Sichtbare Schwachstellen dokumentiert",
      detail: String(p.possible_problems).slice(0, 240),
    });
  }
  if (!p.website) {
    out.push({
      tone: "amber",
      title: "Keine Website hinterlegt",
      detail: "Pruefen, ob das Unternehmen eine (gute) Website hat - moeglicher Einstieg fuer Webseiten/SEO.",
    });
  }
  if (p.industry) {
    out.push({
      tone: "blue",
      title: `Branche: ${p.industry}`,
      detail: "Gespraechseinstieg ueber branchentypische Herausforderungen in Sichtbarkeit und Kundengewinnung.",
    });
  }
  if (ctx.daysSinceActivity != null && ctx.daysSinceActivity >= 7 && !isTerminalProspectStatus(p.status)) {
    out.push({
      tone: "red",
      title: `Seit ${ctx.daysSinceActivity} Tagen keine Aktivitaet`,
      detail: "Follow-up senden oder Status aktualisieren, damit der Prospect nicht liegen bleibt.",
    });
  }
  if (p.next_followup_date && p.next_followup_date < new Date().toISOString().slice(0, 10)) {
    out.push({
      tone: "red",
      title: "Follow-up ueberfaellig",
      detail: `Geplant fuer ${p.next_followup_date} - heute nachfassen.`,
    });
  }
  if (ctx.openTasks > 0) {
    out.push({
      tone: "blue",
      title: `${ctx.openTasks} offene Aufgabe(n) zu diesem Prospect`,
      detail: "Im Aufgaben-Tab priorisieren.",
    });
  }
  const researchEmpty =
    !(p.company_description ?? "").trim() && !(p.possible_problems ?? "").trim() && services.length === 0;
  if (researchEmpty) {
    out.push({
      tone: "amber",
      title: "Recherche unvollstaendig",
      detail: "Unternehmensbeschreibung, Probleme und Potenziale ergaenzen - erst dann sind fundierte Insights und personalisierte Nachrichten moeglich.",
    });
  }
  return out;
}

/* --------------------------------------------------------------------------
 * Personalisierung: Variablen aus dem Prospect fuer Nachrichten-Vorlagen
 * ------------------------------------------------------------------------ */

/** Variablen ({{vorname}}, {{firma}}, ...) aus echten Prospect-Daten. */
export function prospectTemplateVariables(p: LinkedInProspect): Record<string, string> {
  const vorname = p.full_name.trim().split(/\s+/)[0] ?? p.full_name;
  return {
    name: p.full_name,
    vorname,
    firma: p.company_name ?? "",
    position: p.position ?? "",
    branche: p.industry ?? "",
    standort: p.location ?? "",
    website: p.website ?? "",
  };
}
