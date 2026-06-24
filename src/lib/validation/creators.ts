import { z } from "zod";
import * as f from "./common";
import {
  CREATOR_STATUS_KEYS,
  SHOOT_ASSIGNMENT_STATUS_KEYS,
  GENDER_KEYS,
  EXPERIENCE_LEVEL_KEYS,
  CREATOR_GROUP_STATUS_KEYS,
  CREATOR_ASSET_CATEGORY_KEYS,
  AVAILABILITY_TYPE_KEYS,
} from "@/config/catalog";

/** Ganzzahl 0..100 (Score), leer -> undefined (DB-Default greift). */
const optionalScore = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number().int().min(0).max(100).optional(),
);
/** Sterne 1..5, leer -> null. */
const optionalStar = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number().int().min(1).max(5).nullable(),
);
/** Pflicht-Datum YYYY-MM-DD. */
const requiredDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD");

/* -------------------------------------------------------------------------- */
/* Creator                                                                    */
/* -------------------------------------------------------------------------- */
export const creatorInsertSchema = z.object({
  first_name: f.requiredText(120),
  last_name: f.optionalText(120),
  email: f.optionalEmail,
  phone: f.optionalText(50),
  city: f.optionalText(120),
  canton: f.optionalText(60),
  country: f.optionalText(120),
  birth_year: f.optionalNonNegativeInt,
  gender: f.optionalEnum(GENDER_KEYS),
  languages: f.optionalTags,
  instagram_handle: f.optionalText(120),
  instagram_followers: f.optionalNonNegativeInt,
  tiktok_handle: f.optionalText(120),
  tiktok_followers: f.optionalNonNegativeInt,
  creator_types: f.optionalTags,
  experience_level: f.optionalEnum(EXPERIENCE_LEVEL_KEYS),
  hourly_rate: f.optionalRappen,
  half_day_rate: f.optionalRappen,
  full_day_rate: f.optionalRappen,
  travel_costs: f.optionalRappen,
  additional_costs: f.optionalRappen,
  travel_available: f.optionalBoolean,
  status: z.enum(CREATOR_STATUS_KEYS).optional(),
  score: optionalScore,
  creator_group_status: f.optionalEnum(CREATOR_GROUP_STATUS_KEYS),
  tags: f.optionalTags,
  consent_given: f.optionalBoolean,
  consent_date: f.optionalDateTime,
  consent_note: f.optionalText(500),
  notes: f.optionalText(),
});
export const creatorUpdateSchema = creatorInsertSchema.partial();
export type CreatorCreateInput = z.input<typeof creatorInsertSchema>;
export type CreatorUpdateInput = z.input<typeof creatorUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Creator-Portfolio-Asset                                                    */
/* -------------------------------------------------------------------------- */
export const creatorAssetInsertSchema = z.object({
  creator_id: f.uuid,
  title: f.optionalText(200),
  category: f.optionalEnum(CREATOR_ASSET_CATEGORY_KEYS),
  file_url: f.optionalText(2048),
  tags: f.optionalTags,
});
export const creatorAssetUpdateSchema = creatorAssetInsertSchema.partial();
export type CreatorAssetCreateInput = z.input<typeof creatorAssetInsertSchema>;
export type CreatorAssetUpdateInput = z.input<typeof creatorAssetUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Verfuegbarkeit                                                             */
/* -------------------------------------------------------------------------- */
export const creatorAvailabilityInsertSchema = z.object({
  creator_id: f.uuid,
  start_date: requiredDate,
  end_date: f.optionalDate,
  availability_type: z.enum(AVAILABILITY_TYPE_KEYS).optional(),
  note: f.optionalText(500),
});
export type CreatorAvailabilityCreateInput = z.input<
  typeof creatorAvailabilityInsertSchema
>;

/* -------------------------------------------------------------------------- */
/* Bewertung (1-5 Sterne)                                                     */
/* -------------------------------------------------------------------------- */
export const creatorRatingInsertSchema = z.object({
  creator_id: f.uuid,
  shoot_id: f.optionalUuid,
  punctuality: optionalStar,
  appearance: optionalStar,
  camera_quality: optionalStar,
  communication: optionalStar,
  professionalism: optionalStar,
  comment: f.optionalText(1000),
});
export type CreatorRatingCreateInput = z.input<typeof creatorRatingInsertSchema>;

/* -------------------------------------------------------------------------- */
/* Shoot-Besetzung                                                            */
/* -------------------------------------------------------------------------- */
export const shootAssignmentInsertSchema = z.object({
  shoot_id: f.uuid,
  creator_id: f.uuid,
  status: z.enum(SHOOT_ASSIGNMENT_STATUS_KEYS).optional(),
  agreed_rate: f.optionalRappen,
  note: f.optionalText(500),
});
export const shootAssignmentUpdateSchema = shootAssignmentInsertSchema
  .partial()
  .omit({ shoot_id: true, creator_id: true });
export type ShootAssignmentCreateInput = z.input<
  typeof shootAssignmentInsertSchema
>;
export type ShootAssignmentUpdateInput = z.input<
  typeof shootAssignmentUpdateSchema
>;
