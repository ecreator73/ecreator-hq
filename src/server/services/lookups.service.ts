import { getContext, ServiceError } from "./_helpers";
import type { StatusRow, PriorityRow } from "@/types/entities";

/**
 * Lesezugriff auf die zentrale Registry (statuses / priorities).
 * Liefert die DB-Wahrheit fuer Statuswerte und Prioritaeten.
 */
export const lookupsService = {
  async statuses(entityType?: string): Promise<StatusRow[]> {
    const { supabase } = await getContext();
    let query = supabase
      .from("statuses")
      .select("*")
      .eq("is_active", true)
      .order("entity_type", { ascending: true })
      .order("sort_order", { ascending: true });
    if (entityType) query = query.eq("entity_type", entityType);
    const { data, error } = await query;
    if (error)
      throw new ServiceError("statuses: Laden fehlgeschlagen", error);
    return (data ?? []) as unknown as StatusRow[];
  },

  async priorities(): Promise<PriorityRow[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("priorities")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error)
      throw new ServiceError("priorities: Laden fehlgeschlagen", error);
    return (data ?? []) as unknown as PriorityRow[];
  },
};
