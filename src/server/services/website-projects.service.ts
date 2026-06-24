import { createProductionProjectService } from "./_production";
import {
  websiteProjectInsertSchema,
  websiteProjectUpdateSchema,
  type WebsiteProjectCreateInput,
  type WebsiteProjectUpdateInput,
} from "@/lib/validation/production";
import type { WebsiteProjectWithRelations } from "@/types/entities";

export const websiteProjectsService = createProductionProjectService<
  WebsiteProjectWithRelations,
  WebsiteProjectCreateInput,
  WebsiteProjectUpdateInput
>({
  table: "website_projects",
  entityType: "website_project",
  insertSchema: websiteProjectInsertSchema,
  updateSchema: websiteProjectUpdateSchema,
});
