import { z } from "zod";
import * as f from "./common";
import {
  PROJECT_STATUS_KEYS,
  PROJECT_TYPE_KEYS,
  PRIORITY_KEYS,
} from "@/config/catalog";

export const projectInsertSchema = z.object({
  client_id: f.optionalUuid,
  title: f.requiredText(200),
  description: f.optionalText(),
  project_type: z.enum(PROJECT_TYPE_KEYS),
  status: z.enum(PROJECT_STATUS_KEYS).optional(),
  priority: z.enum(PRIORITY_KEYS).optional(),
  start_date: f.optionalDate,
  due_date: f.optionalDate,
  owner_id: f.optionalUuid,
});

export const projectUpdateSchema = projectInsertSchema.partial();

export type ProjectCreateInput = z.input<typeof projectInsertSchema>;
export type ProjectUpdateInput = z.input<typeof projectUpdateSchema>;
