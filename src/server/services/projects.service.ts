import { createCrudService } from "./_helpers";
import {
  projectInsertSchema,
  projectUpdateSchema,
  type ProjectCreateInput,
  type ProjectUpdateInput,
} from "@/lib/validation/projects";
import type { Project } from "@/types/entities";

export const projectsService = createCrudService<
  Project,
  ProjectCreateInput,
  ProjectUpdateInput
>({
  table: "projects",
  entityType: "project",
  insertSchema: projectInsertSchema,
  updateSchema: projectUpdateSchema,
  createStampColumns: ["created_by", "updated_by"],
  updateStampColumns: ["updated_by"],
  label: (p) => p.title,
});
