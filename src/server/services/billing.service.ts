import { getContext } from "./_helpers";
import type { Invoice } from "@/types/entities";

/**
 * Rechnungen mit Positionen, Zahlungen und QR-Daten (Kunden-CRM-Uebernahme).
 * Betraege in Rappen; amount = netto, vat = MWST, Total = amount + vat.
 * Liest mit der Session (RLS: Super Admin, CEO, Finance).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BillingClient {
  id: string;
  name: string;
  customer_number: number | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  contact_name: string | null;
  billing_name: string | null;
  billing_contact: string | null;
  billing_address: string | null;
  billing_zip: string | null;
  billing_city: string | null;
  billing_email: string | null;
  billing_email_cc: string | null;
}

export interface InvoiceItemRow {
  id: string;
  position: number;
  title: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
}

export interface PaymentRow {
  id: string;
  amount: number;
  paid_on: string;
  source: "manual" | "camt";
  reference: string | null;
  note: string | null;
}

export interface BillingInvoice extends Invoice {
  contract_id: string | null;
  issue_date: string | null;
  period_from: string | null;
  period_to: string | null;
  vat_rate: number;
  invoice_seq: number | null;
  qr_reference: string | null;
  sent_at: string | null;
  reminder_stage: number;
  last_reminder_at: string | null;
  cancelled_at: string | null;
  client: { id: string; name: string; customer_number: number | null } | null;
  /** Total inkl. MWST (Rappen) */
  total: number;
  /** Bereits bezahlt (Rappen) */
  paid: number;
}

export interface BillingInvoiceDetail extends BillingInvoice {
  items: InvoiceItemRow[];
  payments: PaymentRow[];
  billing: BillingClient | null;
  contract: { id: string; title: string; contract_number: string | null } | null;
}

function shape(r: any): BillingInvoice {
  const paid = ((r.payments ?? []) as Array<{ amount: number }>).reduce((s, p) => s + Number(p.amount), 0);
  const { payments: _p, ...rest } = r;
  void _p;
  return { ...rest, vat_rate: Number(r.vat_rate ?? 8.1), total: Number(r.amount ?? 0) + Number(r.vat ?? 0), paid };
}

/** Empfaengeradresse: Rechnungsadresse vor Firmenadresse. */
export function billTo(c: BillingClient | null) {
  if (!c) return null;
  const name = c.billing_name || c.name;
  const street = c.billing_address || c.address;
  const zip = c.billing_address ? c.billing_zip : c.zip_code;
  const city = c.billing_address ? c.billing_city : c.city;
  return { name, contact: c.billing_contact || c.contact_name, street, zip, city, country: c.country, email: c.billing_email || c.email, cc: c.billing_email_cc };
}

export const billingService = {
  async list(): Promise<BillingInvoice[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("invoices")
      .select("*, client:clients!invoices_client_id_fkey(id,name,customer_number), payments:invoice_payments(amount)")
      .is("deleted_at", null)
      .order("issue_date", { ascending: false, nullsFirst: true })
      .order("invoice_seq", { ascending: false, nullsFirst: true })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []).map(shape);
  },

  async get(id: string): Promise<BillingInvoiceDetail | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("invoices")
      .select("*, client:clients!invoices_client_id_fkey(id,name,customer_number), payments:invoice_payments(id,amount,paid_on,source,reference,note)")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const [items, client, contract] = await Promise.all([
      supabase.from("invoice_items").select("id, position, title, description, quantity, unit, unit_price").eq("invoice_id", id).order("position"),
      data.client_id
        ? supabase
            .from("clients")
            .select("id, name, customer_number, address, zip_code, city, country, email, contact_name, billing_name, billing_contact, billing_address, billing_zip, billing_city, billing_email, billing_email_cc")
            .eq("id", data.client_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      data.contract_id ? supabase.from("contracts").select("id, title, contract_number").eq("id", data.contract_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const payments = ((data as any).payments ?? []) as PaymentRow[];
    return {
      ...shape(data),
      items: ((items.data ?? []) as any[]).map((i) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
      payments: payments.sort((a, b) => a.paid_on.localeCompare(b.paid_on)),
      billing: (client.data as BillingClient | null) ?? null,
      contract: (contract.data as BillingInvoiceDetail["contract"]) ?? null,
    };
  },
};
