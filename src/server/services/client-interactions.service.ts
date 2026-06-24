import { getContext, ServiceError } from "./_helpers";
import {
  clientInteractionInsertSchema,
  type ClientInteractionCreateInput,
} from "@/lib/validation/client-interactions";
import type { ClientInteraction } from "@/types/entities";

const CI_SELECT =
  "*, author:profiles!client_interactions_created_by_fkey(id,full_name)";

export const clientInteractionsService = {
  async listByClient(clientId: string): Promise<ClientInteraction[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("client_interactions")
      .select(CI_SELECT)
      .eq("client_id", clientId)
      .order("interaction_date", { ascending: false });
    if (error) throw new ServiceError("Kontaktverlauf konnte nicht geladen werden", error);
    return (data ?? []) as unknown as ClientInteraction[];
  },

  async create(input: ClientInteractionCreateInput): Promise<ClientInteraction> {
    const parsed = clientInteractionInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("client_interactions")
      .insert(parsed)
      .select(CI_SELECT)
      .single();
    if (error) throw new ServiceError("Interaktion konnte nicht gespeichert werden", error);
    return data as unknown as ClientInteraction;
  },
};
