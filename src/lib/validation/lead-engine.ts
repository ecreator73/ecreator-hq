import { z } from "zod";
import * as f from "./common";
import {
  WATCHLIST_STATUS_KEYS,
  LEAD_DISCOVERY_SOURCE_TYPE_KEYS,
} from "@/config/catalog";

export const websiteScanSchema = z
  .object({
    has_website: z.boolean().optional(),
    https: z.boolean().optional(),
    mobile_friendly: z.boolean().optional(),
    load_time_ms: z.number().int().min(0).max(120000).optional(),
    has_contact_form: z.boolean().optional(),
    has_cta: z.boolean().optional(),
    has_social_links: z.boolean().optional(),
    has_imprint: z.boolean().optional(),
    has_tracking: z.boolean().optional(),
  })
  .partial();

const jsonObject = z.preprocess(
  (v) => (v == null || v === "" ? undefined : v),
  z.record(z.unknown()).optional(),
);

/* -------------------------------------------------------------------------- */
/* Discovery-Quellen                                                          */
/* -------------------------------------------------------------------------- */
export const leadSourceInsertSchema = z.object({
  name: f.requiredText(120),
  source_type: f.optionalEnum(LEAD_DISCOVERY_SOURCE_TYPE_KEYS),
  status: f.optionalText(40),
  config: jsonObject,
});
export const leadSourceUpdateSchema = leadSourceInsertSchema.partial();
export type LeadSourceCreateInput = z.input<typeof leadSourceInsertSchema>;
export type LeadSourceUpdateInput = z.input<typeof leadSourceUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Gefundene Firmen                                                           */
/* -------------------------------------------------------------------------- */
export const leadCompanyInsertSchema = z.object({
  name: f.requiredText(200),
  industry: f.optionalText(120),
  website: f.optionalText(2048),
  phone: f.optionalText(60),
  email: f.optionalEmail,
  city: f.optionalText(120),
  canton: f.optionalText(60),
  country: f.optionalText(120),
  contact_name: f.optionalText(120),
  source_id: f.optionalUuid,
  website_scan: websiteScanSchema.optional(),
  watchlist_status: z.enum(WATCHLIST_STATUS_KEYS).optional(),
  notes: f.optionalText(),
});
export const leadCompanyUpdateSchema = leadCompanyInsertSchema.partial();
export type LeadCompanyCreateInput = z.input<typeof leadCompanyInsertSchema>;
export type LeadCompanyUpdateInput = z.input<typeof leadCompanyUpdateSchema>;
