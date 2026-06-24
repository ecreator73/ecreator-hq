import { z } from "zod";
import * as f from "./common";
import {
  LEAD_STATUS_KEYS,
  LEAD_SOURCE_KEYS,
  COMPANY_SIZE_KEYS,
} from "@/config/catalog";

/**
 * Hinweis: status wird als Key entgegengenommen und im Service zu status_id
 * (FK in die Registry) aufgeloest. Die Follow-up-Pflicht (next_action_date,
 * ausser bei won/lost) wird im Service gegen den effektiven Zustand geprueft.
 */
export const leadInsertSchema = z.object({
  company_name: f.requiredText(200),
  contact_name: f.optionalText(150),
  email: f.optionalEmail,
  phone: f.optionalText(50),
  website: f.optionalUrl,
  industry: f.optionalText(120),
  company_size: z.enum(COMPANY_SIZE_KEYS).nullish(),
  city: f.optionalText(120),
  country: f.optionalText(120),
  source: z.enum(LEAD_SOURCE_KEYS).nullish(),
  estimated_value: f.optionalRappen,
  currency: f.currency,
  status: z.enum(LEAD_STATUS_KEYS).optional(),
  owner_id: f.optionalUuid,
  notes: f.optionalText(),
  next_action_date: f.optionalDate,
});

export const leadUpdateSchema = leadInsertSchema.partial();

export type LeadCreateInput = z.input<typeof leadInsertSchema>;
export type LeadUpdateInput = z.input<typeof leadUpdateSchema>;
