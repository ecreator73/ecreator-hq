import { getContext, ServiceError } from "./_helpers";
import {
  salesActivityInsertSchema,
  type SalesActivityCreateInput,
} from "@/lib/validation/sales-activities";
import type { SalesActivity } from "@/types/entities";

const ACT_SELECT =
  "*, author:profiles!sales_activities_created_by_fkey(id,full_name)";

export const salesActivitiesService = {
  async listByLead(leadId: string): Promise<SalesActivity[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("sales_activities")
      .select(ACT_SELECT)
      .eq("lead_id", leadId)
      .order("activity_date", { ascending: false });
    if (error) throw new ServiceError("Aktivitaeten konnten nicht geladen werden", error);
    return (data ?? []) as unknown as SalesActivity[];
  },

  async create(input: SalesActivityCreateInput): Promise<SalesActivity> {
    const parsed = salesActivityInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("sales_activities")
      .insert(parsed)
      .select(ACT_SELECT)
      .single();
    if (error) throw new ServiceError("Aktivitaet konnte nicht gespeichert werden", error);
    return data as unknown as SalesActivity;
  },

  async recent(limit = 60): Promise<SalesActivity[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("sales_activities")
      .select(
        ACT_SELECT + ", lead:leads!sales_activities_lead_id_fkey(id,company_name)",
      )
      .order("activity_date", { ascending: false })
      .limit(limit);
    if (error) throw new ServiceError("Aktivitaeten konnten nicht geladen werden", error);
    return (data ?? []) as unknown as SalesActivity[];
  },
};
