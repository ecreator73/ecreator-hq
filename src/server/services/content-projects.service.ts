import { createProductionProjectService } from "./_production";
import {
  contentProjectInsertSchema,
  contentProjectUpdateSchema,
  type ContentProjectCreateInput,
  type ContentProjectUpdateInput,
} from "@/lib/validation/production";
import type { ContentProjectWithRelations } from "@/types/entities";

export const contentProjectsService = createProductionProjectService<
  ContentProjectWithRelations,
  ContentProjectCreateInput,
  ContentProjectUpdateInput
>({
  table: "content_projects",
  entityType: "content_project",
  insertSchema: contentProjectInsertSchema,
  updateSchema: contentProjectUpdateSchema,
});
