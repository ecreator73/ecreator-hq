import { createProductionProjectService } from "./_production";
import {
  crmProjectInsertSchema,
  crmProjectUpdateSchema,
  type CrmProjectCreateInput,
  type CrmProjectUpdateInput,
} from "@/lib/validation/production";
import type { CrmProjectWithRelations } from "@/types/entities";

export const crmProjectsService = createProductionProjectService<
  CrmProjectWithRelations,
  CrmProjectCreateInput,
  CrmProjectUpdateInput
>({
  table: "crm_projects",
  entityType: "crm_project",
  insertSchema: crmProjectInsertSchema,
  updateSchema: crmProjectUpdateSchema,
});
