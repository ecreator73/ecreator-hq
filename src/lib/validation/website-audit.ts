import { z } from "zod";
import * as f from "./common";

export const auditInsertSchema = z.object({
  url: f.optionalText(2048),
  lead_company_id: f.optionalUuid,
});
export type AuditCreateInput = z.input<typeof auditInsertSchema>;
