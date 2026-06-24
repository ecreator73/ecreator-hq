import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  pricingItemInsertSchema,
  pricingItemUpdateSchema,
  type PricingItemCreateInput,
  type PricingItemUpdateInput,
} from "@/lib/validation/proposals";
import type { PricingItem } from "@/types/entities";

export const pricingItemsService = {
  async list(activeOnly = false): Promise<PricingItem[]> {
    const { supabase } = await getContext();
    let q = supabase.from("pricing_items").select("*").order("category", { ascending: true }).order("name", { ascending: true });
    if (activeOnly) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw new ServiceError("Preise konnten nicht geladen werden", error);
    return (data ?? []) as unknown as PricingItem[];
  },
  async create(input: PricingItemCreateInput): Promise<PricingItem> {
    const parsed = pricingItemInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("pricing_items").insert(parsed).select("*").single();
    if (error) throw new ServiceError("Preis konnte nicht erstellt werden", error);
    const row = data as unknown as PricingItem;
    await recordAudit({ action: "create", entityType: "pricing_item", entityId: row.id, newValues: row });
    return row;
  },
  async update(id: string, input: PricingItemUpdateInput): Promise<PricingItem> {
    const parsed = pricingItemUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("pricing_items").update(parsed).eq("id", id).select("*").single();
    if (error) throw new ServiceError("Preis konnte nicht aktualisiert werden", error);
    return data as unknown as PricingItem;
  },
  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("pricing_items").delete().eq("id", id);
    if (error) throw new ServiceError("Preis konnte nicht geloescht werden", error);
  },
};
