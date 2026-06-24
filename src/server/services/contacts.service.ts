import { createCrudService } from "./_helpers";
import {
  contactInsertSchema,
  contactUpdateSchema,
  type ContactCreateInput,
  type ContactUpdateInput,
} from "@/lib/validation/contacts";
import type { Contact } from "@/types/entities";

export const contactsService = createCrudService<
  Contact,
  ContactCreateInput,
  ContactUpdateInput
>({
  table: "contacts",
  entityType: "contact",
  insertSchema: contactInsertSchema,
  updateSchema: contactUpdateSchema,
  createStampColumns: ["created_by", "updated_by"],
  updateStampColumns: ["updated_by"],
  label: (c) => [c.first_name, c.last_name].filter(Boolean).join(" "),
});
