import { z } from "zod";
import * as f from "./common";
import {
  TESTIMONIAL_TYPE_KEYS,
  TESTIMONIAL_STATUS_KEYS,
  REVIEW_STATUS_KEYS,
} from "@/config/catalog";

export const testimonialInsertSchema = z.object({
  client_id: f.uuid,
  type: f.optionalEnum(TESTIMONIAL_TYPE_KEYS),
  status: z.enum(TESTIMONIAL_STATUS_KEYS).optional(),
  content: f.optionalText(4000),
});
export const testimonialUpdateSchema = testimonialInsertSchema.partial();
export type TestimonialCreateInput = z.input<typeof testimonialInsertSchema>;
export type TestimonialUpdateInput = z.input<typeof testimonialUpdateSchema>;

export const reviewRequestInsertSchema = z.object({
  client_id: f.uuid,
  request_date: f.optionalDate,
  status: z.enum(REVIEW_STATUS_KEYS).optional(),
  review_url: f.optionalText(2048),
});
export type ReviewRequestCreateInput = z.input<typeof reviewRequestInsertSchema>;
