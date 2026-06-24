import { createCrudService } from "./_helpers";
import {
  fileInsertSchema,
  fileUpdateSchema,
  type FileCreateInput,
  type FileUpdateInput,
} from "@/lib/validation/files";
import type { FileRecord } from "@/types/entities";

// Dateien tragen `uploaded_by` (kein created_by/updated_by).
export const filesService = createCrudService<
  FileRecord,
  FileCreateInput,
  FileUpdateInput
>({
  table: "files",
  entityType: "file",
  insertSchema: fileInsertSchema,
  updateSchema: fileUpdateSchema,
  createStampColumns: ["uploaded_by"],
  updateStampColumns: ["updated_by"],
  label: (f) => f.filename,
});
