import { z } from "zod";
import * as f from "./common";
import {
  LINKEDIN_PROSPECT_STATUS_KEYS,
  LINKEDIN_PRIORITY_KEYS,
  LINKEDIN_TEMPLATE_CATEGORY_KEYS,
  LINKEDIN_ACTIVITY_TYPE_KEYS,
} from "@/config/catalog";

/* Kampagnen */
export const linkedinCampaignInsertSchema = z.object({
  name: f.requiredText(120),
  description: f.optionalText(2000),
  target_audience: f.optionalText(500),
  status: z.enum(["active", "paused", "archived"]).optional(),
});
export const linkedinCampaignUpdateSchema = linkedinCampaignInsertSchema.partial();
export type LinkedInCampaignCreateInput = z.input<typeof linkedinCampaignInsertSchema>;
export type LinkedInCampaignUpdateInput = z.input<typeof linkedinCampaignUpdateSchema>;

/* Prospects */
export const linkedinProspectInsertSchema = z.object({
  full_name: f.requiredText(200),
  company_name: f.optionalText(200),
  position: f.optionalText(200),
  industry: f.optionalText(120),
  company_size: f.optionalText(60),
  location: f.optionalText(120),
  linkedin_url: f.optionalUrl,
  website: f.optionalUrl,
  phone: f.optionalText(60),
  email: f.optionalEmail,
  status: z.enum(LINKEDIN_PROSPECT_STATUS_KEYS).optional(),
  campaign_id: f.optionalUuid,
  owner_id: f.optionalUuid,
  priority: z.enum(LINKEDIN_PRIORITY_KEYS).optional(),
  next_followup_date: f.optionalDate,
  // Recherche-Felder (manuell heute, KI-ergaenzt spaeter)
  company_description: f.optionalText(5000),
  services: f.optionalText(3000),
  social_links: f.optionalText(2000),
  google_reviews: f.optionalText(2000),
  possible_problems: f.optionalText(3000),
  potential_marketing: f.optionalText(2000),
  potential_crm: f.optionalText(2000),
  potential_seo: f.optionalText(2000),
  potential_ads: f.optionalText(2000),
  potential_website: f.optionalText(2000),
  notes_md: f.optionalText(50000),
});
export const linkedinProspectUpdateSchema = linkedinProspectInsertSchema.partial();
export type LinkedInProspectCreateInput = z.input<typeof linkedinProspectInsertSchema>;
export type LinkedInProspectUpdateInput = z.input<typeof linkedinProspectUpdateSchema>;

/* Aktivitaeten */
export const linkedinActivityInsertSchema = z.object({
  prospect_id: f.uuid,
  type: z.enum(LINKEDIN_ACTIVITY_TYPE_KEYS),
  subject: f.optionalText(300),
  body: f.optionalText(10000),
  occurred_at: f.optionalDateTime,
});
export type LinkedInActivityCreateInput = z.input<typeof linkedinActivityInsertSchema>;

/* Nachrichten-Vorlagen */
export const linkedinTemplateInsertSchema = z.object({
  name: f.requiredText(120),
  category: z.enum(LINKEDIN_TEMPLATE_CATEGORY_KEYS).optional(),
  body: f.optionalText(10000),
  active: f.optionalBoolean,
});
export const linkedinTemplateUpdateSchema = linkedinTemplateInsertSchema.partial();
export type LinkedInTemplateCreateInput = z.input<typeof linkedinTemplateInsertSchema>;
export type LinkedInTemplateUpdateInput = z.input<typeof linkedinTemplateUpdateSchema>;

/* Nachrichten (Entwuerfe / manuell gesendete / erhaltene) */
export const linkedinMessageInsertSchema = z.object({
  prospect_id: f.uuid,
  template_id: f.optionalUuid,
  direction: z.enum(["out", "in"]).optional(),
  status: z.enum(["draft", "sent", "received"]).optional(),
  body: f.requiredText(10000),
});
export const linkedinMessageUpdateSchema = z.object({
  body: f.optionalText(10000),
  status: z.enum(["draft", "sent", "received"]).optional(),
});
export type LinkedInMessageCreateInput = z.input<typeof linkedinMessageInsertSchema>;
export type LinkedInMessageUpdateInput = z.input<typeof linkedinMessageUpdateSchema>;

/* CSV-Import (Name, Firma, Position, LinkedIn URL, Website, Standort, Branche) */
export const linkedinImportRowSchema = z.object({
  full_name: f.requiredText(200),
  company_name: f.optionalText(200),
  position: f.optionalText(200),
  linkedin_url: f.optionalText(500),
  website: f.optionalText(500),
  location: f.optionalText(120),
  industry: f.optionalText(120),
});
export type LinkedInImportRow = z.input<typeof linkedinImportRowSchema>;
