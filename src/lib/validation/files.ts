import { z } from "zod";
import * as f from "./common";
import { FILE_CATEGORY_KEYS } from "@/config/catalog";

export const fileInsertSchema = z
  .object({
    client_id: f.optionalUuid,
    project_id: f.optionalUuid,
    filename: f.requiredText(300),
    file_url: z.string().trim().url("Ungueltige URL").max(2048),
    mime_type: f.optionalText(150),
    size: f.optionalByteSize,
    category: z.enum(FILE_CATEGORY_KEYS).nullish(),
  })
  .refine((v) => v.client_id || v.project_id, {
    message: "Datei muss einem Kunden oder Projekt zugeordnet sein.",
    path: ["client_id"],
  });

export const fileUpdateSchema = z.object({
  filename: f.requiredText(300).optional(),
  mime_type: f.optionalText(150),
  category: z.enum(FILE_CATEGORY_KEYS).nullish(),
});

export type FileCreateInput = z.input<typeof fileInsertSchema>;
export type FileUpdateInput = z.input<typeof fileUpdateSchema>;
