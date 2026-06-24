import { getContext, ServiceError } from "./_helpers";
import type { Meeting, SalesMeetingRow } from "@/types/entities";

const SM_SELECT = `
  *,
  lead:leads!meetings_lead_id_fkey(id,company_name),
  client:clients!meetings_client_id_fkey(id,name)
`;

/** Sales-Termine = Lead-verknuepfte Eintraege der gemeinsamen meetings-Tabelle. */
export const salesMeetingsService = {
  async list(): Promise<SalesMeetingRow[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("meetings")
      .select(SM_SELECT)
      .not("lead_id", "is", null)
      .is("deleted_at", null)
      .order("meeting_date", { ascending: false });
    if (error) throw new ServiceError("Termine konnten nicht geladen werden", error);
    return (data ?? []) as unknown as SalesMeetingRow[];
  },

  async listByLead(leadId: string): Promise<Meeting[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("lead_id", leadId)
      .is("deleted_at", null)
      .order("meeting_date", { ascending: false });
    if (error) throw new ServiceError("Termine konnten nicht geladen werden", error);
    return (data ?? []) as unknown as Meeting[];
  },
};
