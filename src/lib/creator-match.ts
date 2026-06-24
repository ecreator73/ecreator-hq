import { EXPERIENCE_LEVEL_RANK } from "@/config/catalog";
import type { Creator, MatchCriteria } from "@/types/entities";

/**
 * Regelbasierte Matching-Engine (kein AI/Scraping - das kommt spaeter als eigene
 * AI-Engine). Bewertet, wie gut ein Creator zu Shooting-Kriterien passt: 0-100,
 * gewichtet ueber Kategorie, Region, Preis, Verfuegbarkeit, Score, Erfahrung,
 * Sprache. Die Verfuegbarkeit fuer das Zieldatum loest der Service auf und
 * uebergibt sie (available/limited/unavailable/null = unbekannt).
 */

const WEIGHTS = {
  type: 25,
  region: 20,
  price: 20,
  availability: 15,
  score: 10,
  experience: 5,
  language: 5,
} as const;

export type MatchBreakdown = Record<keyof typeof WEIGHTS, number>;

/** Relevanter Tagessatz (Rappen) fuer den Preisvergleich. */
function relevantRate(c: Creator): number | null {
  return c.full_day_rate ?? c.half_day_rate ?? c.hourly_rate ?? null;
}

export interface MatchOptions {
  /** Aufgeloeste Verfuegbarkeit fuer das Zieldatum, falls bekannt. */
  availabilityType?: "available" | "limited" | "unavailable" | null;
}

export function computeMatchScore(
  creator: Creator,
  criteria: MatchCriteria,
  options: MatchOptions = {},
): { total: number; breakdown: MatchBreakdown } {
  // Kategorie
  const typeFactor = criteria.creatorType
    ? creator.creator_types.includes(criteria.creatorType)
      ? 1
      : 0
    : 0.6;

  // Region
  let regionFactor = 0.6;
  if (criteria.canton) {
    regionFactor =
      creator.canton && creator.canton.toLowerCase() === criteria.canton.toLowerCase()
        ? 1
        : creator.travel_available
          ? 0.5
          : 0.1;
  } else if (criteria.city) {
    regionFactor =
      creator.city && creator.city.toLowerCase() === criteria.city.toLowerCase()
        ? 1
        : 0.3;
  }

  // Preis
  let priceFactor = 0.6;
  if (criteria.maxBudget != null) {
    const rate = relevantRate(creator);
    if (rate == null) priceFactor = 0.4;
    else if (rate <= criteria.maxBudget) priceFactor = 1;
    else if (rate <= criteria.maxBudget * 1.2) priceFactor = 0.5;
    else priceFactor = 0.1;
  }

  // Verfuegbarkeit
  let availFactor: number;
  switch (options.availabilityType) {
    case "available":
      availFactor = 1;
      break;
    case "limited":
      availFactor = 0.5;
      break;
    case "unavailable":
      availFactor = 0;
      break;
    default:
      availFactor = criteria.date ? 0.4 : 0.6;
  }

  // Score (Qualifikations-Score 0-100)
  const scoreFactor = Math.max(0, Math.min(100, creator.score)) / 100;

  // Erfahrung
  let expFactor = 0.6;
  if (criteria.experienceLevel) {
    const need = EXPERIENCE_LEVEL_RANK[criteria.experienceLevel] ?? 0;
    const have = creator.experience_level
      ? (EXPERIENCE_LEVEL_RANK[creator.experience_level] ?? 0)
      : 0;
    expFactor = have >= need && have > 0 ? 1 : have > 0 ? 0.4 : 0.2;
  }

  // Sprache
  const langFactor = criteria.language
    ? creator.languages.includes(criteria.language)
      ? 1
      : 0.1
    : 0.6;

  const breakdown: MatchBreakdown = {
    type: round(WEIGHTS.type * typeFactor),
    region: round(WEIGHTS.region * regionFactor),
    price: round(WEIGHTS.price * priceFactor),
    availability: round(WEIGHTS.availability * availFactor),
    score: round(WEIGHTS.score * scoreFactor),
    experience: round(WEIGHTS.experience * expFactor),
    language: round(WEIGHTS.language * langFactor),
  };

  const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
  return { total: Math.round(total), breakdown };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
