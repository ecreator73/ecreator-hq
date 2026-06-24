import { createCrudService } from "./_helpers";
import {
  clientInsertSchema,
  clientUpdateSchema,
  type ClientCreateInput,
  type ClientUpdateInput,
} from "@/lib/validation/clients";
import type { Client } from "@/types/entities";

export const clientsService = createCrudService<
  Client,
  ClientCreateInput,
  ClientUpdateInput
>({
  table: "clients",
  entityType: "client",
  insertSchema: clientInsertSchema,
  updateSchema: clientUpdateSchema,
  createStampColumns: ["created_by", "updated_by"],
  updateStampColumns: ["updated_by"],
  label: (c) => c.name,
  defaultOrder: { column: "name", ascending: true },
});
