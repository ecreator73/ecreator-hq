import { z } from "zod";
import * as f from "./common";
import { CONTRACT_STATUS_KEYS, CONTRACT_TYPE_KEYS, RENEWAL_TYPE_KEYS } from "@/config/catalog";

export const contractInsertSchema = z.object({
  client_id: f.uuid,
  title: f.requiredText(200),
  contract_type: z.enum(CONTRACT_TYPE_KEYS).nullish(),
  start_date: f.optionalDate,
  end_date: f.optionalDate,
  renewal_type: z.enum(RENEWAL_TYPE_KEYS).nullish(),
  cancellation_notice_days: f.optionalNonNegativeInt,
  /** Monatswert in Rappen. */
  value_monthly: f.optionalRappen,
  /** Gesamtwert in Rappen. */
  value_total: f.optionalRappen,
  currency: f.currency,
  status: z.enum(CONTRACT_STATUS_KEYS).optional(),
  document_url: f.optionalUrl,
  offer_id: f.optionalUuid,
});

export const contractUpdateSchema = contractInsertSchema.partial();

export type ContractCreateInput = z.input<typeof contractInsertSchema>;
export type ContractUpdateInput = z.input<typeof contractUpdateSchema>;
