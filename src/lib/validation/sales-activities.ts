import { z } from "zod";
import * as f from "./common";
import { SALES_ACTIVITY_TYPE_KEYS } from "@/config/catalog";

export const salesActivityInsertSchema = z.object({
  lead_id: f.uuid,
  type: z.enum(SALES_ACTIVITY_TYPE_KEYS),
  subject: f.optionalText(200),
  body: f.optionalText(),
  activity_date: f.optionalDateTime,
});

export type SalesActivityCreateInput = z.input<typeof salesActivityInsertSchema>;
