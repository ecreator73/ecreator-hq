import { z } from "zod";
import * as f from "./common";
import {
  REVENUE_STAGE_KEYS,
  JOURNEY_STATUS_KEYS,
  RECOMMENDATION_PRIORITY_KEYS,
  RECOMMENDATION_STATUS_KEYS,
  ORCHESTRATION_STATUS_KEYS,
  ALERT_SEVERITY_KEYS,
} from "@/config/catalog";

/* Phase 17 - Autonomous Growth Engine: Zod-Schemas (app-seitige Validierung). */

/* --- Revenue Journey --- */
export const revenueJourneyInsertSchema = z.object({
  lead_id: f.optionalUuid,
  client_id: f.optionalUuid,
  current_stage: f.optionalEnum(REVENUE_STAGE_KEYS),
  next_recommended_action: f.optionalText(500),
  estimated_value: f.optionalRappen,
  owner_id: f.optionalUuid,
  status: z.enum(JOURNEY_STATUS_KEYS).optional(),
});
export const revenueJourneyUpdateSchema = revenueJourneyInsertSchema.partial();
export type RevenueJourneyCreateInput = z.input<typeof revenueJourneyInsertSchema>;
export type RevenueJourneyUpdateInput = z.input<typeof revenueJourneyUpdateSchema>;

/* --- Growth Recommendation --- */
export const growthRecommendationInsertSchema = z.object({
  entity_type: f.requiredText(50),
  entity_id: f.optionalUuid,
  title: f.requiredText(200),
  recommendation: f.optionalText(1000),
  reason: f.optionalText(1000),
  priority: z.enum(RECOMMENDATION_PRIORITY_KEYS).optional(),
  estimated_value: f.optionalRappen,
  href: f.optionalText(500),
  status: z.enum(RECOMMENDATION_STATUS_KEYS).optional(),
});
export type GrowthRecommendationCreateInput = z.input<
  typeof growthRecommendationInsertSchema
>;

/* --- Automation Orchestration --- */
export const orchestrationInsertSchema = z.object({
  name: f.requiredText(200),
  trigger: f.requiredText(200),
  action: f.requiredText(200),
  description: f.optionalText(1000),
  status: z.enum(ORCHESTRATION_STATUS_KEYS).optional(),
});
export const orchestrationUpdateSchema = orchestrationInsertSchema.partial();
export type OrchestrationCreateInput = z.input<typeof orchestrationInsertSchema>;
export type OrchestrationUpdateInput = z.input<typeof orchestrationUpdateSchema>;

/* --- Growth Alert --- */
export const growthAlertInsertSchema = z.object({
  severity: z.enum(ALERT_SEVERITY_KEYS).optional(),
  title: f.requiredText(200),
  description: f.optionalText(1000),
  entity_type: f.optionalText(50),
  entity_id: f.optionalUuid,
});
export type GrowthAlertCreateInput = z.input<typeof growthAlertInsertSchema>;
