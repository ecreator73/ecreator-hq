import { z } from "zod";
import * as f from "./common";
import {
  WEBSITE_PROJECT_STATUS_KEYS,
  AD_PROJECT_STATUS_KEYS,
  CRM_PROJECT_STATUS_KEYS,
  CONTENT_PROJECT_STATUS_KEYS,
  SHOOT_STATUS_KEYS,
  APPROVAL_STATUS_KEYS,
  AD_PLATFORM_KEYS,
  CONTENT_TYPE_KEYS,
  CONTENT_PLATFORM_KEYS,
  CMS_OPTION_KEYS,
  CRM_TYPE_KEYS,
  ASSET_CATEGORY_KEYS,
} from "@/config/catalog";

/* -------------------------------------------------------------------------- */
/* Website-Projekte                                                           */
/* -------------------------------------------------------------------------- */
export const websiteProjectInsertSchema = z.object({
  client_id: f.optionalUuid,
  project_id: f.optionalUuid,
  title: f.optionalText(200),
  domain: f.optionalText(255),
  cms: f.optionalEnum(CMS_OPTION_KEYS),
  hosting: f.optionalText(255),
  seo_status: f.optionalText(255),
  tracking_status: f.optionalText(255),
  launch_date: f.optionalDate,
  owner_id: f.optionalUuid,
  status: z.enum(WEBSITE_PROJECT_STATUS_KEYS).optional(),
});
export const websiteProjectUpdateSchema = websiteProjectInsertSchema.partial();
export type WebsiteProjectCreateInput = z.input<typeof websiteProjectInsertSchema>;
export type WebsiteProjectUpdateInput = z.input<typeof websiteProjectUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Ads-Projekte                                                               */
/* -------------------------------------------------------------------------- */
export const adProjectInsertSchema = z.object({
  client_id: f.optionalUuid,
  project_id: f.optionalUuid,
  title: f.optionalText(200),
  platform: f.optionalEnum(AD_PLATFORM_KEYS),
  budget: f.optionalRappen,
  objective: f.optionalText(),
  owner_id: f.optionalUuid,
  status: z.enum(AD_PROJECT_STATUS_KEYS).optional(),
});
export const adProjectUpdateSchema = adProjectInsertSchema.partial();
export type AdProjectCreateInput = z.input<typeof adProjectInsertSchema>;
export type AdProjectUpdateInput = z.input<typeof adProjectUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* CRM-Projekte                                                               */
/* -------------------------------------------------------------------------- */
export const crmProjectInsertSchema = z.object({
  client_id: f.optionalUuid,
  project_id: f.optionalUuid,
  title: f.optionalText(200),
  crm_type: f.optionalEnum(CRM_TYPE_KEYS),
  go_live_date: f.optionalDate,
  owner_id: f.optionalUuid,
  status: z.enum(CRM_PROJECT_STATUS_KEYS).optional(),
});
export const crmProjectUpdateSchema = crmProjectInsertSchema.partial();
export type CrmProjectCreateInput = z.input<typeof crmProjectInsertSchema>;
export type CrmProjectUpdateInput = z.input<typeof crmProjectUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Content-Projekte                                                           */
/* -------------------------------------------------------------------------- */
export const contentProjectInsertSchema = z.object({
  client_id: f.optionalUuid,
  project_id: f.optionalUuid,
  title: f.optionalText(200),
  content_type: f.optionalEnum(CONTENT_TYPE_KEYS),
  platform: f.optionalEnum(CONTENT_PLATFORM_KEYS),
  owner_id: f.optionalUuid,
  status: z.enum(CONTENT_PROJECT_STATUS_KEYS).optional(),
});
export const contentProjectUpdateSchema = contentProjectInsertSchema.partial();
export type ContentProjectCreateInput = z.input<typeof contentProjectInsertSchema>;
export type ContentProjectUpdateInput = z.input<typeof contentProjectUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Shootings                                                                  */
/* -------------------------------------------------------------------------- */
export const shootInsertSchema = z.object({
  client_id: f.optionalUuid,
  content_project_id: f.optionalUuid,
  title: f.requiredText(200),
  shooting_date: f.optionalDateTime,
  location: f.optionalText(255),
  videographer: f.optionalText(255),
  status: z.enum(SHOOT_STATUS_KEYS).optional(),
  notes: f.optionalText(),
});
export const shootUpdateSchema = shootInsertSchema.partial();
export type ShootCreateInput = z.input<typeof shootInsertSchema>;
export type ShootUpdateInput = z.input<typeof shootUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Assets                                                                     */
/* -------------------------------------------------------------------------- */
export const assetInsertSchema = z.object({
  client_id: f.optionalUuid,
  project_id: f.optionalUuid,
  title: f.optionalText(200),
  category: f.optionalEnum(ASSET_CATEGORY_KEYS),
  file_url: f.optionalText(2048),
  tags: f.optionalTags,
});
export const assetUpdateSchema = assetInsertSchema.partial();
export type AssetCreateInput = z.input<typeof assetInsertSchema>;
export type AssetUpdateInput = z.input<typeof assetUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Freigaben (approvals)                                                      */
/* -------------------------------------------------------------------------- */
export const approvalInsertSchema = z.object({
  client_id: f.optionalUuid,
  project_id: f.optionalUuid,
  asset_id: f.optionalUuid,
  title: f.optionalText(200),
  status: z.enum(APPROVAL_STATUS_KEYS).optional(),
  notes: f.optionalText(),
  requested_at: f.optionalDateTime,
  approved_at: f.optionalDateTime,
});
export const approvalUpdateSchema = approvalInsertSchema.partial();
export type ApprovalCreateInput = z.input<typeof approvalInsertSchema>;
export type ApprovalUpdateInput = z.input<typeof approvalUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Meilensteine                                                               */
/* -------------------------------------------------------------------------- */
export const milestoneInsertSchema = z.object({
  project_id: f.uuid,
  title: f.requiredText(200),
  due_date: f.optionalDate,
  completed: f.optionalBoolean,
});
export const milestoneUpdateSchema = milestoneInsertSchema.partial();
export type MilestoneCreateInput = z.input<typeof milestoneInsertSchema>;
export type MilestoneUpdateInput = z.input<typeof milestoneUpdateSchema>;
