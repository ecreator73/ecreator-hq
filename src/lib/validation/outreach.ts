import { z } from "zod";
import * as f from "./common";
import {
  CAMPAIGN_TYPE_KEYS,
  CAMPAIGN_STATUS_KEYS,
  EMAIL_TEMPLATE_CATEGORY_KEYS,
  OUTREACH_MESSAGE_STATUS_KEYS,
  BOOKED_MEETING_STATUS_KEYS,
  MEETING_SOURCE_KEYS,
} from "@/config/catalog";

const variableList = z.preprocess(
  (v) => (Array.isArray(v) ? v : []),
  z.array(z.string().trim().min(1).max(60)).max(50),
);

/* Kampagnen */
export const campaignInsertSchema = z.object({
  name: f.requiredText(120),
  campaign_type: f.optionalEnum(CAMPAIGN_TYPE_KEYS),
  status: z.enum(CAMPAIGN_STATUS_KEYS).optional(),
});
export const campaignUpdateSchema = campaignInsertSchema.partial();
export type CampaignCreateInput = z.input<typeof campaignInsertSchema>;
export type CampaignUpdateInput = z.input<typeof campaignUpdateSchema>;

/* E-Mail-Templates */
export const emailTemplateInsertSchema = z.object({
  name: f.requiredText(120),
  category: f.optionalEnum(EMAIL_TEMPLATE_CATEGORY_KEYS),
  subject: f.optionalText(500),
  body: f.optionalText(20000),
  variables: variableList.optional(),
  active: f.optionalBoolean,
});
export const emailTemplateUpdateSchema = emailTemplateInsertSchema.partial();
export type EmailTemplateCreateInput = z.input<typeof emailTemplateInsertSchema>;
export type EmailTemplateUpdateInput = z.input<typeof emailTemplateUpdateSchema>;

/* Nachrichten */
export const outreachMessageInsertSchema = z.object({
  lead_id: f.optionalUuid,
  campaign_id: f.optionalUuid,
  template_id: f.optionalUuid,
  subject: f.optionalText(500),
  body: f.optionalText(20000),
  status: z.enum(OUTREACH_MESSAGE_STATUS_KEYS).optional(),
});
export const outreachMessageUpdateSchema = outreachMessageInsertSchema.partial();
export type OutreachMessageCreateInput = z.input<typeof outreachMessageInsertSchema>;
export type OutreachMessageUpdateInput = z.input<typeof outreachMessageUpdateSchema>;

/* Follow-up-Sequenzen */
export const followUpSequenceInsertSchema = z.object({
  name: f.requiredText(120),
  active: f.optionalBoolean,
  description: f.optionalText(1000),
  steps: z
    .array(z.object({ day: z.number().int().min(0), label: z.string().trim().min(1).max(120) }))
    .max(20)
    .optional(),
});
export type FollowUpSequenceCreateInput = z.input<typeof followUpSequenceInsertSchema>;

/* Termine */
export const bookedMeetingInsertSchema = z.object({
  lead_id: f.optionalUuid,
  title: f.optionalText(200),
  date: f.optionalDateTime,
  status: z.enum(BOOKED_MEETING_STATUS_KEYS).optional(),
  source: f.optionalEnum(MEETING_SOURCE_KEYS),
  notes: f.optionalText(1000),
});
export const bookedMeetingUpdateSchema = bookedMeetingInsertSchema.partial();
export type BookedMeetingCreateInput = z.input<typeof bookedMeetingInsertSchema>;
export type BookedMeetingUpdateInput = z.input<typeof bookedMeetingUpdateSchema>;

/* Opt-out */
export const unsubscribeInsertSchema = z.object({
  email: z.string().trim().email("Ungueltige E-Mail").max(320),
  reason: f.optionalText(500),
});
export type UnsubscribeCreateInput = z.input<typeof unsubscribeInsertSchema>;
