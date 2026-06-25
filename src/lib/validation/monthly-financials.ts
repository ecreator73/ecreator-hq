import { z } from "zod";
import * as f from "./common";

/**
 * Manuelle Monatsfinanzen: eine Zeile = ein Umsatz- oder Kostenposten in einem
 * bestimmten Monat. Betraege in Rappen (Ganzzahl).
 */
export const monthlyEntryInsertSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Monat im Format YYYY-MM-01"),
  kind: z.enum(["revenue", "cost"]),
  label: f.requiredText(200),
  amount: z.number().int("Betrag in Rappen (Ganzzahl)").min(0).default(0),
  category: f.optionalText(100),
  note: f.optionalText(),
  sort_order: z.number().int().min(0).optional(),
});

export const monthlyEntryUpdateSchema = monthlyEntryInsertSchema.partial();

export type MonthlyEntryCreateInput = z.input<typeof monthlyEntryInsertSchema>;
export type MonthlyEntryUpdateInput = z.input<typeof monthlyEntryUpdateSchema>;
