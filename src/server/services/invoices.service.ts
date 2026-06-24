import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { isoDay } from "@/lib/finance";
import {
  invoiceInsertSchema,
  invoiceUpdateSchema,
  type InvoiceCreateInput,
  type InvoiceUpdateInput,
} from "@/lib/validation/invoices";
import type { InvoiceWithClient } from "@/types/entities";

const SELECT = `*, client:clients!invoices_client_id_fkey(id,name)`;

export interface InvoiceFilters {
  clientId?: string;
  status?: string;
  statusIn?: string[];
  dueFrom?: string;
  dueTo?: string;
  search?: string;
}

function mapRow(row: Record<string, unknown>): InvoiceWithClient {
  const { client, ...rest } = row as Record<string, unknown> & { client?: unknown };
  return {
    ...(rest as object),
    client: (client as InvoiceWithClient["client"]) ?? null,
  } as InvoiceWithClient;
}

export const invoicesService = {
  async list(filters: InvoiceFilters = {}): Promise<InvoiceWithClient[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("invoices")
      .select(SELECT)
      .is("deleted_at", null)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (filters.clientId) q = q.eq("client_id", filters.clientId);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.statusIn?.length) q = q.in("status", filters.statusIn);
    if (filters.dueFrom) q = q.gte("due_date", filters.dueFrom);
    if (filters.dueTo) q = q.lte("due_date", filters.dueTo);
    if (filters.search) {
      const like = `%${filters.search.trim()}%`;
      q = q.or(`title.ilike.${like},invoice_number.ilike.${like}`);
    }
    const { data, error } = await q.limit(1000);
    if (error) throw new ServiceError("Rechnungen konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapRow);
  },

  async getById(id: string): Promise<InvoiceWithClient | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("invoices")
      .select(SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Rechnung konnte nicht geladen werden", error);
    return data ? mapRow(data as Record<string, unknown>) : null;
  },

  async create(input: InvoiceCreateInput): Promise<InvoiceWithClient> {
    const parsed = invoiceInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("invoices")
      .insert(parsed)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Rechnung konnte nicht erstellt werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "create", entityType: "invoice", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: InvoiceUpdateInput): Promise<InvoiceWithClient> {
    const parsed = invoiceUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("invoices")
      .update(parsed)
      .eq("id", id)
      .is("deleted_at", null)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Rechnung konnte nicht aktualisiert werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "update", entityType: "invoice", entityId: id, newValues: row });
    return row;
  },

  /** Status setzen; bei "paid" wird paid_date auf heute gesetzt (falls leer). */
  async setStatus(id: string, status: string): Promise<InvoiceWithClient> {
    const patch: InvoiceUpdateInput = { status: status as InvoiceUpdateInput["status"] };
    if (status === "paid") patch.paid_date = isoDay(new Date());
    return this.update(id, patch);
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("invoices")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Rechnung konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "invoice", entityId: id });
  },
};
