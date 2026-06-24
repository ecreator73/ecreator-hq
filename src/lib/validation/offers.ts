import { z } from "zod";
import * as f from "./common";
import { OFFER_STATUS_KEYS, OFFER_TYPE_KEYS } from "@/config/catalog";

const offerBase = z.object({
  client_id: f.optionalUuid,
  lead_id: f.optionalUuid,
  title: f.requiredText(200),
  offer_type: z.enum(OFFER_TYPE_KEYS).nullish(),
  /** Betrag in Rappen. */
  amount: f.optionalRappen,
  currency: f.currency,
  status: z.enum(OFFER_STATUS_KEYS).optional(),
  sent_date: f.optionalDate,
  accepted_date: f.optionalDate,
  valid_until: f.optionalDate,
  owner_id: f.optionalUuid,
  pdf_url: f.optionalUrl,
});

export const offerInsertSchema = offerBase.refine(
  (v) => v.client_id || v.lead_id,
  {
    message: "Angebot muss einem Kunden oder Lead zugeordnet sein.",
    path: ["lead_id"],
  },
);

export const offerUpdateSchema = offerBase.partial();

export type OfferCreateInput = z.input<typeof offerInsertSchema>;
export type OfferUpdateInput = z.input<typeof offerUpdateSchema>;
