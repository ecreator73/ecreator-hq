/**
 * Regelbasiertes Lead-Scoring (0-100). Spaeter durch AI erweiterbar.
 * Faktoren: Pipeline-Stufe (Status), Budget (estimated_value in Rappen),
 * Unternehmensgroesse, aktives Follow-up.
 */

const STAGE_SCORE: Record<string, number> = {
  neu: 10,
  nicht_erreicht: 18,
  mehrfach_nicht_erreicht: 12,
  followup: 35,
  mail_gesendet: 45,
  termin_gebucht: 65,
  vertrag_mail: 85,
  abgeschlossen: 100,
  absage: 0,
  fehleintrag: 0,
  andere: 5,
};

const SIZE_BONUS: Record<string, number> = {
  solo: 0,
  small: 3,
  medium: 7,
  large: 12,
};

export interface LeadScoreInput {
  status?: string | null;
  estimated_value?: number | null; // Rappen
  company_size?: string | null;
  next_action_date?: string | null;
}

export function computeLeadScore(input: LeadScoreInput): number {
  const status = input.status ?? "neu";
  if (status === "abgeschlossen") return 100;
  if (status === "absage" || status === "fehleintrag") return 0;

  let score = STAGE_SCORE[status] ?? 10;

  // Budget (Rappen) - hoechste zutreffende Stufe
  const value = input.estimated_value ?? 0;
  if (value >= 50_000_00) score += 15;
  else if (value >= 20_000_00) score += 10;
  else if (value >= 5_000_00) score += 5;

  // Unternehmensgroesse
  if (input.company_size) score += SIZE_BONUS[input.company_size] ?? 0;

  // Aktives Follow-up
  if (input.next_action_date) score += 3;

  return Math.max(0, Math.min(100, score));
}

/** Schwelle fuer "heisse" Leads (Dashboard). */
export const HOT_LEAD_THRESHOLD = 70;
