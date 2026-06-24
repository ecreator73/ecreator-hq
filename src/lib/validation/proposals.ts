import { z } from "zod";
import * as f from "./common";
import {
  PROPOSAL_TYPE_KEYS,
  PROPOSAL_STATUS_KEYS,
  PRICING_CATEGORY_KEYS,
} from "@/config/catalog";

const optionalQuantity = z.preprocess(
  (v) => (v === "" || v == null ? 1 : Number(v)),
  z.number().min(0).max(100000),
);

/* Preislogik */
export const pricingItemInsertSchema = z.object({
  name: f.requiredText(160),
  category: f.optionalEnum(PRICING_CATEGORY_KEYS),
  unit_price: f.optionalRappen,
  recurring: f.optionalBoolean,
  active: f.optionalBoolean,
});
export const pricingItemUpdateSchema = pricingItemInsertSchema.partial();
export type PricingItemCreateInput = z.input<typeof pricingItemInsertSchema>;
export type PricingItemUpdateInput = z.input<typeof pricingItemUpdateSchema>;

/* Proposals */
export const proposalInsertSchema = z.object({
  lead_id: f.optionalUuid,
  client_id: f.optionalUuid,
  title: f.requiredText(200),
  proposal_type: f.optionalEnum(PROPOSAL_TYPE_KEYS),
  status: z.enum(PROPOSAL_STATUS_KEYS).optional(),
  amount: f.optionalRappen,
  monthly_amount: f.optionalRappen,
  setup_fee: f.optionalRappen,
  contract_duration_months: f.optionalNonNegativeInt,
  situation: f.optionalText(),
  goal: f.optionalText(),
  solution: f.optionalText(),
  next_steps: f.optionalText(),
  contract_start_date: f.optionalDate,
  payment_terms: f.optionalText(2000),
  cancellation_terms: f.optionalText(2000),
});
export const proposalUpdateSchema = proposalInsertSchema.partial();
export type ProposalCreateInput = z.input<typeof proposalInsertSchema>;
export type ProposalUpdateInput = z.input<typeof proposalUpdateSchema>;

/* Proposal-Generierung */
export const proposalGenerateSchema = z.object({
  proposal_type: z.enum(PROPOSAL_TYPE_KEYS),
  lead_id: f.optionalUuid,
  client_id: f.optionalUuid,
  title: f.optionalText(200),
  goal: f.optionalText(),
});
export type ProposalGenerateInput = z.input<typeof proposalGenerateSchema>;

/* Proposal-Positionen */
export const proposalItemInsertSchema = z.object({
  proposal_id: f.uuid,
  title: f.requiredText(200),
  description: f.optionalText(2000),
  quantity: optionalQuantity,
  unit_price: f.optionalRappen,
  recurring: f.optionalBoolean,
  category: f.optionalEnum(PRICING_CATEGORY_KEYS),
  order_index: f.optionalNonNegativeInt,
});
export type ProposalItemCreateInput = z.input<typeof proposalItemInsertSchema>;
