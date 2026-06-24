import { z } from "zod";
import * as f from "./common";
import { REPORTING_CALL_STATUS_KEYS } from "@/config/catalog";

const base = z.object({
  client_id: f.uuid,
  owner_id: f.optionalUuid,
  scheduled_date: f.optionalDateTime,
  status: z.enum(REPORTING_CALL_STATUS_KEYS).optional(),
  meeting_link: f.optionalUrl,
  agenda: f.optionalText(),
  topics: f.optionalText(),
  results: f.optionalText(),
  challenges: f.optionalText(),
  notes: f.optionalText(),
  summary: f.optionalText(),
  next_steps: f.optionalText(),
  responsibilities: f.optionalText(),
});

export const reportingCallInsertSchema = base;
export const reportingCallUpdateSchema = base.partial();

export type ReportingCallCreateInput = z.input<typeof reportingCallInsertSchema>;
export type ReportingCallUpdateInput = z.input<typeof reportingCallUpdateSchema>;
