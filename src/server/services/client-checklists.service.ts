import { getContext, ServiceError } from "./_helpers";
import { tasksService } from "./tasks.service";
import { CHECKLIST_TEMPLATES } from "@/config/catalog";
import type { ClientChecklist } from "@/types/entities";

export const clientChecklistsService = {
  async listByClient(clientId: string): Promise<ClientChecklist[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("client_checklists")
      .select("*, items:client_checklist_items(*)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw new ServiceError("Checklisten konnten nicht geladen werden", error);
    return (data ?? []) as unknown as ClientChecklist[];
  },

  /** Checkliste aus Standard-Vorlage (onboarding/offboarding) erstellen. */
  async create(clientId: string, kind: string): Promise<ClientChecklist> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("client_checklists")
      .insert({ client_id: clientId, kind })
      .select("*")
      .single();
    if (error) throw new ServiceError("Checkliste konnte nicht erstellt werden", error);
    const checklist = data as unknown as ClientChecklist;

    const titles = CHECKLIST_TEMPLATES[kind] ?? [];
    if (titles.length) {
      await supabase.from("client_checklist_items").insert(
        titles.map((title, i) => ({
          checklist_id: checklist.id,
          title,
          order_index: i + 1,
        })),
      );
    }
    return checklist;
  },

  async toggleItem(itemId: string, completed: boolean): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("client_checklist_items")
      .update({ completed })
      .eq("id", itemId);
    if (error) throw new ServiceError("Checklisten-Punkt konnte nicht aktualisiert werden", error);
  },

  async remove(checklistId: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("client_checklists")
      .delete()
      .eq("id", checklistId);
    if (error) throw new ServiceError("Checkliste konnte nicht geloescht werden", error);
  },

  /** Onboarding starten: Standard-Checkliste + Kickoff-/Reporting-Aufgaben. */
  async startOnboarding(clientId: string): Promise<void> {
    await this.create(clientId, "onboarding");
    await tasksService.create({
      title: "Kickoff-Call planen",
      client_id: clientId,
      priority: "high",
    });
    await tasksService.create({
      title: "Ersten Reporting-Call vorbereiten",
      client_id: clientId,
      priority: "medium",
    });
  },
};
