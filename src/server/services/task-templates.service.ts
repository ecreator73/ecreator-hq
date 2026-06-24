import { getContext, ServiceError } from "./_helpers";
import { tasksService } from "./tasks.service";
import { PRIORITY_KEYS, type Priority } from "@/config/catalog";
import type { TaskTemplate } from "@/types/entities";

const VALID_PRIORITIES = new Set<string>(PRIORITY_KEYS);

/**
 * Task-Vorlagen (Vorbereitung "automatische Aufgaben"). Erlaubt, aus einer
 * Vorlage (z.B. "Website Projekt") eine Reihe Aufgaben zu generieren.
 */
export const taskTemplatesService = {
  async list(): Promise<TaskTemplate[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("task_templates")
      .select("*, items:task_template_items(*)")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw new ServiceError("Vorlagen konnten nicht geladen werden", error);
    return (data ?? []) as unknown as TaskTemplate[];
  },

  /** Erstellt aus einer Vorlage Aufgaben (optional an Kunde/Projekt gebunden). */
  async apply(
    templateId: string,
    opts: { project_id?: string | null; client_id?: string | null } = {},
  ): Promise<number> {
    const { supabase } = await getContext();
    const { data: items, error } = await supabase
      .from("task_template_items")
      .select("*")
      .eq("template_id", templateId)
      .order("order_index", { ascending: true });
    if (error)
      throw new ServiceError("Vorlagen-Aufgaben konnten nicht geladen werden", error);

    const list = (items ?? []) as Array<{
      title: string;
      description: string | null;
      priority_key: string | null;
      due_offset_days: number | null;
    }>;

    let created = 0;
    for (const item of list) {
      await tasksService.create({
        title: item.title,
        description: item.description ?? undefined,
        project_id: opts.project_id ?? undefined,
        client_id: opts.client_id ?? undefined,
        priority:
          item.priority_key && VALID_PRIORITIES.has(item.priority_key)
            ? (item.priority_key as Priority)
            : undefined,
        due_date:
          item.due_offset_days != null
            ? offsetDate(item.due_offset_days)
            : undefined,
      });
      created++;
    }
    return created;
  },
};

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
