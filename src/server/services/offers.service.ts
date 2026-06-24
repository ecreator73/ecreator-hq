import { createCrudService } from "./_helpers";
import {
  offerInsertSchema,
  offerUpdateSchema,
  type OfferCreateInput,
  type OfferUpdateInput,
} from "@/lib/validation/offers";
import type { Offer } from "@/types/entities";

export const offersService = createCrudService<
  Offer,
  OfferCreateInput,
  OfferUpdateInput
>({
  table: "offers",
  entityType: "offer",
  insertSchema: offerInsertSchema,
  updateSchema: offerUpdateSchema,
  createStampColumns: ["created_by", "updated_by"],
  updateStampColumns: ["updated_by"],
  label: (o) => o.title,
});
