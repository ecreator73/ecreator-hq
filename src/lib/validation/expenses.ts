import { z } from "zod";
import * as f from "./common";
import {
  EXPENSE_CATEGORY_KEYS,
  RECURRING_FREQUENCY_KEYS,
} from "@/config/catalog";

export const expenseInsertSchema = z.object({
  title: f.requiredText(200),
  category: f.optionalEnum(EXPENSE_CATEGORY_KEYS),
  amount: f.optionalRappen,
  recurring: f.optionalBoolean,
  recurring_frequency: f.optionalEnum(RECURRING_FREQUENCY_KEYS),
  date: f.optionalDate,
  notes: f.optionalText(),
});
export const expenseUpdateSchema = expenseInsertSchema.partial();
export type ExpenseCreateInput = z.input<typeof expenseInsertSchema>;
export type ExpenseUpdateInput = z.input<typeof expenseUpdateSchema>;
