import { z } from "zod";
import * as f from "./common";
import { ALERT_CATEGORY_KEYS, ALERT_SEVERITY_KEYS } from "@/config/catalog";

const optionalNumber = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number().optional(),
);

export const executiveAlertInsertSchema = z.object({
  category: f.optionalEnum(ALERT_CATEGORY_KEYS),
  severity: f.optionalEnum(ALERT_SEVERITY_KEYS),
  title: f.requiredText(200),
  description: f.optionalText(2000),
  entity_type: f.optionalText(60),
  entity_id: f.optionalUuid,
});
export type ExecutiveAlertCreateInput = z.input<typeof executiveAlertInsertSchema>;

export const companyGoalInsertSchema = z.object({
  title: f.requiredText(200),
  target_value: optionalNumber,
  current_value: optionalNumber,
  unit: f.optionalText(40),
  due_date: f.optionalDate,
  owner_id: f.optionalUuid,
});
export const companyGoalUpdateSchema = companyGoalInsertSchema.partial();
export type CompanyGoalCreateInput = z.input<typeof companyGoalInsertSchema>;
export type CompanyGoalUpdateInput = z.input<typeof companyGoalUpdateSchema>;
