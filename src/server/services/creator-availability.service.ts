import { getContext, ServiceError } from "./_helpers";
import {
  creatorAvailabilityInsertSchema,
  type CreatorAvailabilityCreateInput,
} from "@/lib/validation/creators";
import type { CreatorAvailability } from "@/types/entities";

export const creatorAvailabilityService = {
  async listByCreator(creatorId: string): Promise<CreatorAvailability[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("creator_availability")
      .select("*")
      .eq("creator_id", creatorId)
      .order("start_date", { ascending: true });
    if (error) throw new ServiceError("Verfuegbarkeiten konnten nicht geladen werden", error);
    return (data ?? []) as unknown as CreatorAvailability[];
  },

  async create(
    input: CreatorAvailabilityCreateInput,
  ): Promise<CreatorAvailability> {
    const parsed = creatorAvailabilityInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("creator_availability")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Verfuegbarkeit konnte nicht erstellt werden", error);
    return data as unknown as CreatorAvailability;
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("creator_availability")
      .delete()
      .eq("id", id);
    if (error) throw new ServiceError("Verfuegbarkeit konnte nicht geloescht werden", error);
  },
};
