/**
 * Status-Gruppen der Kunden-Leads (Leads aus den Kampagnen fuer Kunden),
 * uebernommen aus dem Lovable-Reporting. Pro Kunde kann eine eigene
 * Zuordnung (clients.reporting_status_map: Rohstatus -> Gruppe) die
 * Standardregeln ueberschreiben.
 */

export const CLIENT_LEAD_GROUPS = [
  { key: "neu", label: "Neu / offen", tone: "bg-neutral-300", temp: "warm" },
  { key: "unreachable", label: "Nicht erreicht", tone: "bg-amber-400", temp: "warm" },
  { key: "mail", label: "Mail", tone: "bg-sky-400", temp: "warm" },
  { key: "hot", label: "Termin", tone: "bg-brand-500", temp: "hot" },
  { key: "won", label: "Kunde gewonnen", tone: "bg-emerald-600", temp: "hot" },
  { key: "no_interest", label: "Absage", tone: "bg-rose-400", temp: "cold" },
  { key: "wrong", label: "Falsche Daten", tone: "bg-neutral-500", temp: "cold" },
] as const;

export type ClientLeadGroup = (typeof CLIENT_LEAD_GROUPS)[number]["key"];

export const GROUP_LABEL: Record<string, string> = Object.fromEntries(CLIENT_LEAD_GROUPS.map((g) => [g.key, g.label]));

const WRONG = ["fehleintrag", "wrong_number", "invalid", "ausversehen angemeldet", "hat sich verklickt", "nr. / kontakt ungültig", "ungültige/kein bedarf", "nie erreicht - festnetz nr.", "kein deutsch"];
const NO = ["absage", "andere (job etc )", "not_interested", "kein interesse", "lost", "abgelehnt", "abgesagt", "absage (termin)", "jobsuche", "sucht einen job", "nicht qualifiziert", "wollte sich informieren", "andere spitex", "nur hauswirtschaft", "nicht erfüllt", "aufgehängt"];
const HOT = ["termin", "appointment", "terminiert", "termin gesetzt", "onboarding office termin", "erreicht - termin ausstehend"];
const WON = ["won", "vertrag / mail gemacht", "aufgenommen", "neukunde gewonnen - mit abschluss", "neukunde gewonnen - ohne abschluss", "kunde gewonnen", "gewonnen"];
const UNREACH = ["mehrfach nicht erreicht", "3x nicht erreicht", "nie erreicht", "🚫 3x nicht erreicht"];

const norm = (s: string | null | undefined) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .trim();

/** Standardregel (ohne kundeneigene Zuordnung). */
export function defaultGroup(raw: string | null | undefined): ClientLeadGroup {
  const c = norm(raw);
  if (WON.includes(c) || c === "abgeschlossen") return "won";
  if (HOT.includes(c)) return "hot";
  if (WRONG.includes(c)) return "wrong";
  if (NO.includes(c)) return "no_interest";
  if (UNREACH.includes(c)) return "unreachable";
  if (c === "mail" || c.startsWith("mail")) return "mail";
  return "neu";
}

const VALID = new Set<string>(CLIENT_LEAD_GROUPS.map((g) => g.key));

/** Gruppe mit kundeneigener Zuordnung. */
export function groupFor(raw: string | null | undefined, map?: Record<string, string> | null): ClientLeadGroup {
  const own = raw != null ? map?.[raw] : undefined;
  if (own) {
    const v = own === "closed" ? "won" : own === "warm" ? "neu" : own;
    if (VALID.has(v)) return v as ClientLeadGroup;
  }
  return defaultGroup(raw);
}
