import { z } from "zod";
import * as f from "./common";
import {
  AI_PROMPT_STATUS_KEYS,
  AI_PROMPT_CATEGORY_KEYS,
  AI_MODEL_KEYS,
  AUTOMATION_JOB_TYPE_KEYS,
  AUTOMATION_JOB_STATUS_KEYS,
  SCHEDULE_TYPE_KEYS,
  INTEGRATION_PROVIDER_KEYS,
} from "@/config/catalog";

/** Liste von Variablennamen (Bezeichner). */
const variableList = z.preprocess(
  (v) => (Array.isArray(v) ? v : []),
  z.array(z.string().trim().min(1).max(60)).max(50),
);
/** Freies JSON-Objekt (config). Leer -> undefined (DB-Default greift). */
const jsonObject = z.preprocess(
  (v) => (v == null || v === "" ? undefined : v),
  z.record(z.unknown()).optional(),
);
/** Temperatur 0..2, leer -> undefined. */
const temperature = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number().min(0).max(2).optional(),
);

/* -------------------------------------------------------------------------- */
/* AI-Prompt-Templates                                                        */
/* -------------------------------------------------------------------------- */
export const aiPromptInsertSchema = z.object({
  name: f.requiredText(120),
  category: f.optionalEnum(AI_PROMPT_CATEGORY_KEYS),
  description: f.optionalText(1000),
  system_prompt: f.optionalText(20000),
  user_prompt_template: f.optionalText(20000),
  variables: variableList.optional(),
  model: f.optionalEnum(AI_MODEL_KEYS),
  temperature: temperature,
  status: z.enum(AI_PROMPT_STATUS_KEYS).optional(),
});
export const aiPromptUpdateSchema = aiPromptInsertSchema.partial();
export type AiPromptCreateInput = z.input<typeof aiPromptInsertSchema>;
export type AiPromptUpdateInput = z.input<typeof aiPromptUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Automation-Jobs                                                            */
/* -------------------------------------------------------------------------- */
export const automationJobInsertSchema = z.object({
  name: f.requiredText(120),
  type: f.optionalEnum(AUTOMATION_JOB_TYPE_KEYS),
  status: z.enum(AUTOMATION_JOB_STATUS_KEYS).optional(),
  schedule: f.optionalEnum(SCHEDULE_TYPE_KEYS),
  next_run_at: f.optionalDateTime,
  config: jsonObject,
});
export const automationJobUpdateSchema = automationJobInsertSchema.partial();
export type AutomationJobCreateInput = z.input<typeof automationJobInsertSchema>;
export type AutomationJobUpdateInput = z.input<typeof automationJobUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Integrationen (Credentials werden im Service verschluesselt)               */
/* -------------------------------------------------------------------------- */
export const integrationInsertSchema = z.object({
  name: f.requiredText(120),
  provider: f.optionalEnum(INTEGRATION_PROVIDER_KEYS),
  status: f.optionalText(40),
  config: jsonObject,
  /** Klartext-Credentials (z.B. API-Key) - nur Eingabe, wird verschluesselt. */
  credentials: f.optionalText(8000),
});
export const integrationUpdateSchema = integrationInsertSchema.partial();
export type IntegrationCreateInput = z.input<typeof integrationInsertSchema>;
export type IntegrationUpdateInput = z.input<typeof integrationUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Webhooks                                                                   */
/* -------------------------------------------------------------------------- */
export const webhookInsertSchema = z.object({
  name: f.requiredText(120),
  provider: f.optionalEnum(INTEGRATION_PROVIDER_KEYS),
  endpoint_url: f.optionalText(2048),
  status: f.optionalText(40),
  secret: f.optionalText(500),
  config: jsonObject,
});
export const webhookUpdateSchema = webhookInsertSchema.partial();
export type WebhookCreateInput = z.input<typeof webhookInsertSchema>;
export type WebhookUpdateInput = z.input<typeof webhookUpdateSchema>;
