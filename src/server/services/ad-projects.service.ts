import { createProductionProjectService } from "./_production";
import {
  adProjectInsertSchema,
  adProjectUpdateSchema,
  type AdProjectCreateInput,
  type AdProjectUpdateInput,
} from "@/lib/validation/production";
import type { AdProjectWithRelations } from "@/types/entities";

export const adProjectsService = createProductionProjectService<
  AdProjectWithRelations,
  AdProjectCreateInput,
  AdProjectUpdateInput
>({
  table: "ad_projects",
  entityType: "ad_project",
  insertSchema: adProjectInsertSchema,
  updateSchema: adProjectUpdateSchema,
});
