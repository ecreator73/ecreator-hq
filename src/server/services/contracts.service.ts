import { createCrudService } from "./_helpers";
import {
  contractInsertSchema,
  contractUpdateSchema,
  type ContractCreateInput,
  type ContractUpdateInput,
} from "@/lib/validation/contracts";
import type { Contract } from "@/types/entities";

export const contractsService = createCrudService<
  Contract,
  ContractCreateInput,
  ContractUpdateInput
>({
  table: "contracts",
  entityType: "contract",
  insertSchema: contractInsertSchema,
  updateSchema: contractUpdateSchema,
  createStampColumns: ["created_by", "updated_by"],
  updateStampColumns: ["updated_by"],
  label: (c) => c.title,
});
