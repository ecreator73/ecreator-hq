import { z } from "zod";
import { getContext, ServiceError } from "./_helpers";
import * as f from "@/lib/validation/common";
import type { DocumentItem } from "@/types/entities";

/**
 * Positionen von Offerten und Vertraege (Pos. | Beschreibung | Menge |
 * Einzelpreis | Gesamt). Nach jeder Aenderung wird der Betrag am Beleg
 * nachgefuehrt, damit Dashboards und Kennzahlen stimmen.
 */

export const documentItemSchema = z.object({
  offer_id: f.optionalUuid,
  contract_id: f.optionalUuid,
  description: f.requiredText(300),
  detail: f.optionalText(1000),
  quantity: z.coerce.number().positive().max(100000).default(1),
  /** Einzelpreis in Rappen. */
  unit_price: z.coerce.number().int().min(0).default(0),
  recurring: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).default(0),
});
export const documentItemUpdateSchema = documentItemSchema.partial();
export type DocumentItemCreateInput = z.input<typeof documentItemSchema>;
export type DocumentItemUpdateInput = z.input<typeof documentItemUpdateSchema>;

/** Zeilensumme in Rappen. */
export function itemTotal(i: Pick<DocumentItem, "quantity" | "unit_price">): number {
  return Math.round(Number(i.quantity) * Number(i.unit_price));
}

/** Summen getrennt nach einmalig / monatlich. */
export function sumItems(items: DocumentItem[]): {
  once: number;
  monthly: number;
  total: number;
} {
  let once = 0;
  let monthly = 0;
  for (const i of items) {
    const t = itemTotal(i);
    if (i.recurring) monthly += t;
    else once += t;
  }
  return { once, monthly, total: once + monthly };
}

export const documentItemsService = {
  async listForOffer(offerId: string): Promise<DocumentItem[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("document_items")
      .select("*")
      .eq("offer_id", offerId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new ServiceError("Positionen konnten nicht geladen werden", error);
    return (data ?? []) as DocumentItem[];
  },

  async listForContract(contractId: string): Promise<DocumentItem[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("document_items")
      .select("*")
      .eq("contract_id", contractId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new ServiceError("Positionen konnten nicht geladen werden", error);
    return (data ?? []) as DocumentItem[];
  },

  async create(input: DocumentItemCreateInput): Promise<void> {
    const parsed = documentItemSchema.parse(input);
    if (!parsed.offer_id && !parsed.contract_id) {
      throw new ServiceError("Position braucht ein Angebot oder einen Vertrag");
    }
    const { supabase } = await getContext();
    const { error } = await supabase.from("document_items").insert(parsed);
    if (error) throw new ServiceError("Position konnte nicht erstellt werden", error);
    await this.syncParentTotals(parsed.offer_id ?? null, parsed.contract_id ?? null);
  },

  async update(id: string, input: DocumentItemUpdateInput): Promise<void> {
    const parsed = documentItemUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data: existing } = await supabase
      .from("document_items")
      .select("offer_id, contract_id")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase.from("document_items").update(parsed).eq("id", id);
    if (error) throw new ServiceError("Position konnte nicht aktualisiert werden", error);
    await this.syncParentTotals(
      (existing?.offer_id as string | null) ?? null,
      (existing?.contract_id as string | null) ?? null,
    );
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { data: existing } = await supabase
      .from("document_items")
      .select("offer_id, contract_id")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase.from("document_items").delete().eq("id", id);
    if (error) throw new ServiceError("Position konnte nicht geloescht werden", error);
    await this.syncParentTotals(
      (existing?.offer_id as string | null) ?? null,
      (existing?.contract_id as string | null) ?? null,
    );
  },

  /**
   * Betrag am Beleg aus den Positionen nachfuehren:
   * - Angebot: amount = Summe aller Positionen
   * - Vertrag: value_monthly = Summe der monatlichen Positionen
   * Ohne Positionen bleibt der manuell erfasste Betrag unveraendert.
   */
  async syncParentTotals(offerId: string | null, contractId: string | null): Promise<void> {
    const { supabase } = await getContext();
    try {
      if (offerId) {
        const items = await this.listForOffer(offerId);
        if (items.length === 0) return;
        const { total } = sumItems(items);
        await supabase.from("offers").update({ amount: total }).eq("id", offerId);
      }
      if (contractId) {
        const items = await this.listForContract(contractId);
        if (items.length === 0) return;
        const { monthly } = sumItems(items);
        if (monthly > 0) {
          await supabase.from("contracts").update({ value_monthly: monthly }).eq("id", contractId);
        }
      }
    } catch {
      // Betrag ist eine abgeleitete Groesse - ein Fehler hier darf die
      // Positionsbearbeitung nicht blockieren.
    }
  },
};
