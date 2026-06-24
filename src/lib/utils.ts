import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Klassen-Helper: kombiniert clsx (bedingte Klassen) mit tailwind-merge
 * (loest Tailwind-Konflikte deterministisch auf).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Initialen aus einem Namen (max. 2 Buchstaben) fuer Avatare. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Datum huebsch auf Deutsch (Schweiz) formatieren. */
export function formatDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Geldbetrag aus Rappen (Ganzzahl) als CHF formatieren. */
export function formatCHF(
  rappen: number | null | undefined,
  currency = "CHF",
): string {
  if (rappen == null) return "-";
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(rappen / 100);
}
