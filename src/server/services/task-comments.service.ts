import { getContext, ServiceError } from "./_helpers";
import { commentInsertSchema, type CommentCreateInput } from "@/lib/validation/tasks";
import type { TaskComment, TaskActivity } from "@/types/entities";

const COMMENT_SELECT =
  "*, author:profiles!task_comments_user_id_fkey(id,full_name)";

export const taskCommentsService = {
  async listByTask(taskId: string): Promise<TaskComment[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("task_comments")
      .select(COMMENT_SELECT)
      .eq("task_id", taskId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) throw new ServiceError("Kommentare konnten nicht geladen werden", error);
    return (data ?? []) as unknown as TaskComment[];
  },

  async create(input: CommentCreateInput): Promise<TaskComment> {
    const parsed = commentInsertSchema.parse(input);
    const { supabase, userId } = await getContext();
    const { data, error } = await supabase
      .from("task_comments")
      .insert({ ...parsed, user_id: userId })
      .select(COMMENT_SELECT)
      .single();
    if (error) throw new ServiceError("Kommentar konnte nicht gespeichert werden", error);
    return data as unknown as TaskComment;
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("task_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new ServiceError("Kommentar konnte nicht geloescht werden", error);
  },
};

export const taskActivityService = {
  async listByTask(taskId: string, limit = 100): Promise<TaskActivity[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("task_activity")
      .select("*, actor:profiles!task_activity_user_id_fkey(id,full_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new ServiceError("Aktivitaet konnte nicht geladen werden", error);
    return (data ?? []) as unknown as TaskActivity[];
  },
};
