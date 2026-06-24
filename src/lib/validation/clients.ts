import { z } from "zod";
import * as f from "./common";
import { CLIENT_STATUS_KEYS, COMPANY_TYPE_KEYS } from "@/config/catalog";

export const clientInsertSchema = z.object({
  name: f.requiredText(200),
  company_type: z.enum(COMPANY_TYPE_KEYS).nullish(),
  website: f.optionalUrl,
  email: f.optionalEmail,
  phone: f.optionalText(50),
  address: f.optionalText(300),
  city: f.optionalText(120),
  country: f.optionalText(120),
  industry: f.optionalText(120),
  status: z.enum(CLIENT_STATUS_KEYS).optional(),
  account_manager_id: f.optionalUuid,
  start_date: f.optionalDate,
  notes: f.optionalText(),
  package: f.optionalText(60),
});

export const clientUpdateSchema = clientInsertSchema.partial();

export type ClientCreateInput = z.input<typeof clientInsertSchema>;
export type ClientUpdateInput = z.input<typeof clientUpdateSchema>;
