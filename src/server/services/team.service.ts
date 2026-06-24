import { getContext, ServiceError } from "./_helpers";
import type { ProfileMini } from "@/types/entities";

/** Aktive Team-Mitglieder (fuer Zuweisungs-Dropdowns). */
export const teamService = {
  async listMembers(): Promise<ProfileMini[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name", { ascending: true });
    if (error) throw new ServiceError("Team konnte nicht geladen werden", error);
    return (data ?? []) as unknown as ProfileMini[];
  },
};
