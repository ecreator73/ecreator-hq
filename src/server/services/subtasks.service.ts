import { getContext, ServiceError } from "./_helpers";
import {
  subtaskInsertSchema,
  subtaskUpdateSchema,
  type SubtaskCreateInput,
  type SubtaskUpdateInput,
} from "@/lib/validation/tasks";
import type { Subtask } from "@/types/entities";

export const subtasksService = {
  async listByTask(taskId: string): Promise<Subtask[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("subtasks")
      .select("*")
      .eq("task_id", taskId)
      .order("order_index", { ascending: true });
    if (error) throw new ServiceError("Subtasks konnten nicht geladen werden", error);
    return (data ?? []) as unknown as Subtask[];
  },

  async create(input: SubtaskCreateInput): Promise<Subtask> {
    const parsed = subtaskInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("subtasks")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Subtask konnte nicht erstellt werden", error);
    return data as unknown as Subtask;
  },

  async update(id: string, input: SubtaskUpdateInput): Promise<Subtask> {
    const parsed = subtaskUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("subtasks")
      .update(parsed)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new ServiceError("Subtask konnte nicht aktualisiert werden", error);
    return data as unknown as Subtask;
  },

  async toggle(id: string, completed: boolean): Promise<Subtask> {
    return this.update(id, { completed });
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("subtasks").delete().eq("id", id);
    if (error) throw new ServiceError("Subtask konnte nicht geloescht werden", error);
  },
};
