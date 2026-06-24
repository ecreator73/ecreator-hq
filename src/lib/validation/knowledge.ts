import { z } from "zod";
import * as f from "./common";
import {
  KNOWLEDGE_CATEGORY_KEYS,
  ARTICLE_STATUS_KEYS,
  SOP_STATUS_KEYS,
  PROMPT_LIBRARY_CATEGORY_KEYS,
} from "@/config/catalog";

const variableList = z.preprocess(
  (v) => (Array.isArray(v) ? v : []),
  z.array(z.string().trim().min(1).max(60)).max(50),
);

/* Knowledge-Artikel */
export const articleInsertSchema = z.object({
  title: f.requiredText(200),
  content: f.optionalText(100000),
  category: f.optionalEnum(KNOWLEDGE_CATEGORY_KEYS),
  tags: f.optionalTags,
  status: z.enum(ARTICLE_STATUS_KEYS).optional(),
});
export const articleUpdateSchema = articleInsertSchema.partial();
export type ArticleCreateInput = z.input<typeof articleInsertSchema>;
export type ArticleUpdateInput = z.input<typeof articleUpdateSchema>;

/* SOPs */
const sopStepSchema = z.object({
  title: f.requiredText(200),
  description: z.string().trim().max(4000).optional(),
});
export const sopInsertSchema = z.object({
  title: f.requiredText(200),
  category: f.optionalEnum(KNOWLEDGE_CATEGORY_KEYS),
  steps: z.array(sopStepSchema).max(50).optional(),
  status: z.enum(SOP_STATUS_KEYS).optional(),
});
export const sopUpdateSchema = sopInsertSchema.partial();
export type SopCreateInput = z.input<typeof sopInsertSchema>;
export type SopUpdateInput = z.input<typeof sopUpdateSchema>;

/* Prompt Library */
export const promptLibraryInsertSchema = z.object({
  title: f.requiredText(200),
  category: f.optionalEnum(PROMPT_LIBRARY_CATEGORY_KEYS),
  prompt: f.optionalText(20000),
  variables: variableList.optional(),
  tags: f.optionalTags,
});
export const promptLibraryUpdateSchema = promptLibraryInsertSchema.partial();
export type PromptLibraryCreateInput = z.input<typeof promptLibraryInsertSchema>;
export type PromptLibraryUpdateInput = z.input<typeof promptLibraryUpdateSchema>;
