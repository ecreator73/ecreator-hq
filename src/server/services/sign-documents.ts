import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Offerte/Vertrag fuer die oeffentliche Unterschriftsseite laden (nur ueber
 * das geheime sign_token, Service-Rolle). Liefert nur, was der Kunde sehen soll.
 */

export type SignKind = "offer" | "contract";

export function parseKind(raw: string): SignKind | null {
  if (raw === "offer" || raw === "offerte") return "offer";
  if (raw === "contract" || raw === "vertrag") return "contract";
  return null;
}

export interface SignItem {
  title: string;
  detail: string | null;
  quantity: number;
  unit_price: number;
  recurring: boolean;
}

export interface SignDocument {
  kind: SignKind;
  id: string;
  title: string;
  number: string | null;
  client: { name: string; lines: string[] };
  date: string | null;
  validUntil: string | null;
  start: string | null;
  end: string | null;
  durationMonths: number | null;
  /** Rappen netto */
  net: number;
  vatRate: number;
  monthly: number | null;
  paymentTerms: string | null;
  notes: string | null;
  items: SignItem[];
  status: string;
  signedAt: string | null;
  signedName: string | null;
  expired: boolean;
}

export async function loadSignDocument(kind: SignKind, token: string): Promise<SignDocument | null> {
  if (!/^[\w-]{20,100}$/.test(token)) return null;
  const db = createAdminClient();
  const table = kind === "offer" ? "offers" : "contracts";
  const { data: d } = await db.from(table).select("*").eq("sign_token", token).is("deleted_at", null).maybeSingle();
  if (!d) return null;
  const [{ data: client }, { data: items }] = await Promise.all([
    db.from("clients").select("name, address, zip_code, city, billing_name, billing_contact, billing_address, billing_zip, billing_city").eq("id", d.client_id).maybeSingle(),
    db.from("document_items").select("description, detail, quantity, unit_price, recurring").eq(kind === "offer" ? "offer_id" : "contract_id", d.id).order("sort_order"),
  ]);
  const its: SignItem[] = ((items ?? []) as Array<{ description: string; detail: string | null; quantity: number; unit_price: number; recurring: boolean }>).map((i) => ({
    title: i.description,
    detail: i.detail,
    quantity: Number(i.quantity),
    unit_price: Number(i.unit_price),
    recurring: !!i.recurring,
  }));
  const sum = its.reduce((s, i) => s + Math.round(i.quantity * i.unit_price), 0);
  const c = client as Record<string, string | null> | null;
  const billing = c?.billing_address
    ? [c.billing_contact ? `z. Hd. ${c.billing_contact}` : null, c.billing_address, [c.billing_zip, c.billing_city].filter(Boolean).join(" ")]
    : [c?.address ?? null, [c?.zip_code, c?.city].filter(Boolean).join(" ")];
  const today = new Date().toISOString().slice(0, 10);
  return {
    kind,
    id: d.id,
    title: d.title,
    number: kind === "offer" ? d.offer_number ?? null : d.contract_number ?? null,
    client: { name: (c?.billing_name || c?.name) ?? (kind === "offer" ? d.recipient_name ?? "Kunde" : "Kunde"), lines: billing.filter((l): l is string => !!l && l.trim() !== "") },
    date: kind === "offer" ? d.offer_date ?? d.created_at?.slice(0, 10) ?? null : d.created_at?.slice(0, 10) ?? null,
    validUntil: kind === "offer" ? d.valid_until ?? null : null,
    start: d.start_date ?? null,
    end: kind === "contract" ? d.end_date ?? null : null,
    durationMonths: d.duration_months ?? null,
    net: its.length ? sum : Number((kind === "offer" ? d.amount : d.value_monthly) ?? 0),
    vatRate: Number(d.vat_rate ?? 8.1),
    monthly: kind === "contract" ? (d.value_monthly ?? null) : null,
    paymentTerms: d.payment_terms ?? null,
    notes: kind === "offer" ? d.scope ?? null : d.notes ?? null,
    items: its,
    status: d.status,
    signedAt: d.signed_at ?? null,
    signedName: d.signed_name ?? null,
    expired: kind === "offer" && !!d.valid_until && d.valid_until < today && !d.signed_at,
  };
}
