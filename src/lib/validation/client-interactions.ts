import { z } from "zod";
import * as f from "./common";
import { CLIENT_INTERACTION_TYPE_KEYS } from "@/config/catalog";

export const clientInteractionInsertSchema = z.object({
  client_id: f.uuid,
  type: z.enum(CLIENT_INTERACTION_TYPE_KEYS),
  subject: f.optionalText(200),
  body: f.optionalText(),
  interaction_date: f.optionalDateTime,
});

export type ClientInteractionCreateInput = z.input<
  typeof clientInteractionInsertSchema
>;
