import { getContext, ServiceError } from "./_helpers";
import {
  milestoneInsertSchema,
  type MilestoneCreateInput,
} from "@/lib/validation/production";
import type { ProjectMilestone } from "@/types/entities";

export const projectMilestonesService = {
  async listByProject(projectId: string): Promise<ProjectMilestone[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw new ServiceError("Meilensteine konnten nicht geladen werden", error);
    return (data ?? []) as unknown as ProjectMilestone[];
  },

  /** Offene, ueberfaellige Meilensteine (fuer Produktions-Alerts/at-risk). */
  async listOverdueOpen(): Promise<ProjectMilestone[]> {
    const { supabase } = await getContext();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("completed", false)
      .lt("due_date", today)
      .order("due_date", { ascending: true });
    if (error) throw new ServiceError("Meilensteine konnten nicht geladen werden", error);
    return (data ?? []) as unknown as ProjectMilestone[];
  },

  async create(input: MilestoneCreateInput): Promise<ProjectMilestone> {
    const parsed = milestoneInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("project_milestones")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Meilenstein konnte nicht erstellt werden", error);
    return data as unknown as ProjectMilestone;
  },

  async toggle(id: string, completed: boolean): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("project_milestones")
      .update({ completed })
      .eq("id", id);
    if (error) throw new ServiceError("Meilenstein konnte nicht aktualisiert werden", error);
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("project_milestones").delete().eq("id", id);
    if (error) throw new ServiceError("Meilenstein konnte nicht geloescht werden", error);
  },
};
