import { z } from "zod";
import * as f from "./common";

export const contactInsertSchema = z.object({
  client_id: f.uuid,
  first_name: f.requiredText(120),
  last_name: f.optionalText(120),
  email: f.optionalEmail,
  phone: f.optionalText(50),
  position: f.optionalText(150),
  is_primary: f.optionalBoolean,
  notes: f.optionalText(),
});

export const contactUpdateSchema = contactInsertSchema.partial();

export type ContactCreateInput = z.input<typeof contactInsertSchema>;
export type ContactUpdateInput = z.input<typeof contactUpdateSchema>;
