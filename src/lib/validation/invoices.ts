import { z } from "zod";
import * as f from "./common";
import { INVOICE_STATUS_KEYS } from "@/config/catalog";

export const invoiceInsertSchema = z.object({
  client_id: f.optionalUuid,
  invoice_number: f.optionalText(60),
  title: f.optionalText(200),
  amount: f.optionalRappen,
  vat: f.optionalRappen,
  due_date: f.optionalDate,
  paid_date: f.optionalDate,
  status: z.enum(INVOICE_STATUS_KEYS).optional(),
  pdf_url: f.optionalText(2048),
  notes: f.optionalText(),
});
export const invoiceUpdateSchema = invoiceInsertSchema.partial();
export type InvoiceCreateInput = z.input<typeof invoiceInsertSchema>;
export type InvoiceUpdateInput = z.input<typeof invoiceUpdateSchema>;
