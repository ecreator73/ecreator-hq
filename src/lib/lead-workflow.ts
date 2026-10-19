/**
 * Anruf-Workflow (uebernommen aus dem Lovable-CRM, `leadWorkflow`):
 * Ein Anruf-Ergebnis setzt Status, naechsten Schritt und Datum.
 * Reine Daten/Funktionen - im Server und im UI nutzbar.
 */

export interface CallOutcome {
  key: string;
  label: string;
  /** Lead-Status-Key nach dem Anruf (null = unveraendert) */
  status: string | null;
  /** Vorschlag fuer den naechsten Schritt ("" = Lead abschliessen) */
  nextAction: string;
  /** Werktage bis zum naechsten Schritt (null = kein Datum) */
  days: number | null;
  /** zaehlt als «erreicht» fuer die Erreicht-Quote */
  reached: boolean;
}

export const CALL_OUTCOMES: CallOutcome[] = [
  { key: "no_answer", label: "Nicht erreicht", status: "nicht_erreicht", nextAction: "Nochmals anrufen", days: 1, reached: false },
  { key: "reached", label: "Erreicht", status: "followup", nextAction: "Follow-up", days: 3, reached: true },
  { key: "interested", label: "Interessiert", status: "followup", nextAction: "Follow-up", days: 2, reached: true },
  { key: "follow_up", label: "Rückruf vereinbart", status: "followup", nextAction: "Follow-up Call", days: 3, reached: true },
  { key: "appointment", label: "Termin vereinbart", status: "termin_gebucht", nextAction: "Meeting", days: null, reached: true },
  { key: "offer", label: "Offerte", status: "vertrag_mail", nextAction: "Offerte nachfassen", days: 3, reached: true },
  { key: "not_interested", label: "Kein Interesse", status: "absage", nextAction: "", days: null, reached: true },
  { key: "wrong_number", label: "Falsche Nummer", status: "fehleintrag", nextAction: "", days: null, reached: false },
  { key: "lost", label: "Verloren", status: "absage", nextAction: "", days: null, reached: true },
  { key: "won", label: "Gewonnen", status: "abgeschlossen", nextAction: "In Kunde umwandeln", days: 0, reached: true },
];

export const OUTCOME_BY_KEY: Record<string, CallOutcome> = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.key, o]));

export function outcomeLabel(key: string | null | undefined): string {
  if (!key) return "–";
  return OUTCOME_BY_KEY[key]?.label ?? key;
}

/** Ab so vielen erfolglosen Versuchen gilt ein Lead als «Mehrfach nicht erreicht». */
export const MAX_NO_ANSWER = 3;

export const NEXT_ACTIONS = [
  "Nochmals anrufen",
  "Follow-up",
  "Follow-up Call",
  "Meeting",
  "Offerte senden",
  "Offerte nachfassen",
  "E-Mail senden",
  "WhatsApp senden",
  "In Kunde umwandeln",
] as const;

/** Lead-Status, die nicht mehr bearbeitet werden (Archiv). */
export const ARCHIVE_STATUSES = ["abgeschlossen", "absage", "fehleintrag", "andere"];

/** Heute + n Werktage (Samstag/Sonntag werden uebersprungen), YYYY-MM-DD. */
export function addWorkdays(fromIso: string, days: number): string {
  const d = new Date(`${fromIso}T12:00:00Z`);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  // Faellt «heute» (days = 0) auf ein Wochenende, auf Montag schieben
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Heutiges Datum in Zuerich, YYYY-MM-DD. */
export function zurichTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
