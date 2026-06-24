import {
  NEXT_BEST_ACTION_LABELS,
  type NextBestActionKey,
  type RevenueStage,
} from "@/config/catalog";
import type { NextBestAction } from "@/types/entities";

/**
 * Reine Geschaeftslogik der Autonomous Growth Engine: Growth-Scores (0-100),
 * Funnel-Stage-Mapping und Next-Best-Action-Ableitung. Keine DB-Zugriffe -
 * damit testbar und seiteneffektfrei. Der Service ruft diese Helfer auf.
 */

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/* --------------------------------------------------------------------------
 * Growth Score
 * ------------------------------------------------------------------------ */

/**
 * Lead-Growth-Score (0-100) aus Opportunity (lead_score), Interesse (Status),
 * Budget (geschaetzter Wert) und Branche (Zielbranche bekannt).
 */
export function computeLeadGrowthScore(input: {
  leadScore: number; // 0-100, Opportunity
  estimatedValue: number | null; // Rappen, Budget
  statusKey: string | null; // Interesse
  industryKnown: boolean; // Branche
}): number {
  let score = clamp(input.leadScore, 0, 100) * 0.45; // Opportunity (max 45)
  score += leadInterestPoints(input.statusKey); // Interesse (max 25)
  const chf = (input.estimatedValue ?? 0) / 100; // Budget (max 20)
  if (chf >= 30000) score += 20;
  else if (chf >= 15000) score += 15;
  else if (chf >= 5000) score += 10;
  else if (chf > 0) score += 5;
  if (input.industryKnown) score += 10; // Branche (max 10)
  return clamp(Math.round(score), 0, 100);
}

function leadInterestPoints(statusKey: string | null): number {
  switch (statusKey) {
    case "negotiation":
      return 25;
    case "offer_sent":
    case "offer_created":
      return 22;
    case "meeting_booked":
      return 18;
    case "interested":
      return 15;
    case "contacted":
      return 8;
    case "new":
      return 4;
    default:
      return 0;
  }
}

/**
 * Kunden-Growth-Score (0-100) aus Zufriedenheit, Laufzeit, Umsatz (MRR) und
 * Potenzial (Anzahl noch nicht genutzter Leistungen).
 */
export function computeClientGrowthScore(input: {
  satisfactionOk: boolean;
  runtimeMonths: number;
  mrr: number; // Rappen
  missingServices: number;
}): number {
  let score = input.satisfactionOk ? 30 : 8; // Zufriedenheit (max 30)
  if (input.runtimeMonths >= 12) score += 20; // Laufzeit (max 20)
  else if (input.runtimeMonths >= 6) score += 14;
  else if (input.runtimeMonths >= 3) score += 8;
  else score += 3;
  const mrrChf = input.mrr / 100; // Umsatz (max 25)
  if (mrrChf >= 3000) score += 25;
  else if (mrrChf >= 1500) score += 18;
  else if (mrrChf >= 500) score += 10;
  else if (mrrChf > 0) score += 4;
  score += Math.min(25, input.missingServices * 6); // Potenzial (max 25)
  return clamp(Math.round(score), 0, 100);
}

/* --------------------------------------------------------------------------
 * Funnel-Stage-Mapping
 * ------------------------------------------------------------------------ */

/** Lead-Status -> Revenue-Journey-Stage. */
export function stageFromLeadStatus(statusKey: string | null): RevenueStage {
  switch (statusKey) {
    case "contacted":
    case "interested":
      return "outreach";
    case "meeting_booked":
      return "meeting";
    case "offer_created":
    case "offer_sent":
    case "negotiation":
      return "proposal";
    case "won":
      return "client";
    default:
      return "discovery";
  }
}

/** Kunden-Signale -> Revenue-Journey-Stage (Bestandskunde). */
export function stageFromClient(input: {
  contractExpiring: boolean;
  hasUpsell: boolean;
  referralReady: boolean;
}): RevenueStage {
  if (input.contractExpiring) return "renewal";
  if (input.referralReady) return "referral";
  if (input.hasUpsell) return "expansion";
  return "client";
}

/* --------------------------------------------------------------------------
 * Next Best Action
 * ------------------------------------------------------------------------ */

export function makeAction(
  action: NextBestActionKey,
  priority: "critical" | "high" | "medium" | "low",
  reason: string,
  opts: { href?: string; estimatedValue?: number | null } = {},
): NextBestAction {
  return {
    action,
    label: NEXT_BEST_ACTION_LABELS[action],
    priority,
    reason,
    href: opts.href,
    estimatedValue: opts.estimatedValue ?? null,
  };
}

/**
 * Next-Best-Action fuer einen Lead anhand des Funnel-Fortschritts. Spiegelt die
 * Funnel-Logik: kein Audit -> Audit; Audit aber kein Outreach -> Outreach;
 * positiver Kontakt -> Termin; Termin durchgefuehrt -> Proposal; Angebot offen
 * -> Follow-Up.
 */
export function leadNextBestAction(input: {
  statusKey: string | null;
  hasAudit: boolean;
  hasOutreach: boolean;
  positiveContact: boolean;
  hasMeeting: boolean;
  meetingDone: boolean;
  hasOpenProposal: boolean;
  estimatedValue?: number | null;
  href?: string;
}): NextBestAction {
  const v = { estimatedValue: input.estimatedValue, href: input.href };
  if (input.hasOpenProposal)
    return makeAction("send_followup", "high", "Angebot offen - Follow-Up senden.", v);
  if (input.meetingDone)
    return makeAction("create_proposal", "high", "Termin durchgefuehrt - Proposal erstellen.", v);
  if (input.positiveContact && !input.hasMeeting)
    return makeAction("book_meeting", "high", "Positiver Kontakt - Termin buchen.", v);
  if (input.hasAudit && !input.hasOutreach)
    return makeAction("prepare_outreach", "medium", "Audit vorhanden - Outreach vorbereiten.", v);
  if (!input.hasAudit)
    return makeAction("create_audit", "medium", "Lead ohne Audit - Audit erstellen.", v);
  if (input.statusKey === "new")
    return makeAction("contact_lead", "medium", "Neuer Lead - Erstkontakt herstellen.", v);
  return makeAction("monitor", "low", "Kein dringender Schritt - beobachten.", v);
}
