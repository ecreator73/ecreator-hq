import { z } from "zod";
import * as f from "./common";
import { MEETING_STATUS_KEYS, MEETING_TYPE_KEYS } from "@/config/catalog";

const participantSchema = z.object({
  name: f.requiredText(200),
  email: z.string().trim().email("Ungueltige E-Mail").optional(),
});

export const meetingInsertSchema = z.object({
  client_id: f.optionalUuid,
  lead_id: f.optionalUuid,
  title: f.requiredText(200),
  meeting_type: f.optionalEnum(MEETING_TYPE_KEYS),
  meeting_date: f.optionalDateTime,
  duration_minutes: f.optionalNonNegativeInt,
  status: z.enum(MEETING_STATUS_KEYS).optional(),
  participants: z.array(participantSchema).default([]),
  notes: f.optionalText(),
  decisions: f.optionalText(),
  next_steps: f.optionalText(),
  recording_url: f.optionalText(2048),
  transcript: f.optionalText(100000),
  summary: f.optionalText(20000),
  action_items: f.optionalText(20000),
});

export const meetingUpdateSchema = meetingInsertSchema.partial();

export type MeetingCreateInput = z.input<typeof meetingInsertSchema>;
export type MeetingUpdateInput = z.input<typeof meetingUpdateSchema>;
