/**
 * Regelbasiertes Lead-Scoring (0-100). Spaeter durch AI erweiterbar.
 * Faktoren: Pipeline-Stufe (Status), Budget (estimated_value in Rappen),
 * Unternehmensgroesse, aktives Follow-up.
 */

const STAGE_SCORE: Record<string, number> = {
  new: 10,
  contacted: 25,
  interested: 45,
  meeting_booked: 60,
  offer_created: 70,
  offer_sent: 78,
  negotiation: 88,
  won: 100,
  lost: 0,
  paused: 20,
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
  const status = input.status ?? "new";
  if (status === "won") return 100;
  if (status === "lost") return 0;

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
