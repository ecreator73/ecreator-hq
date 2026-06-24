import { getContext, ServiceError } from "./_helpers";
import type { Notification } from "@/types/entities";

/**
 * Benachrichtigungs-Infrastruktur (kein Versand in dieser Phase).
 * RLS scoped automatisch auf den eingeloggten Nutzer.
 */
export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

export const notificationsService = {
  /**
   * Benachrichtigung fuer einen (beliebigen) Nutzer erstellen - via
   * SECURITY-DEFINER-Funktion `create_notification` (umgeht die user-scoped
   * Insert-Policy kontrolliert). Fundament fuer Engines/Automationen.
   */
  async create(input: NotificationInput): Promise<string | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.rpc("create_notification", {
      p_user_id: input.userId,
      p_type: input.type,
      p_title: input.title,
      p_body: input.body ?? null,
      p_entity_type: input.entityType ?? null,
      p_entity_id: input.entityId ?? null,
    });
    if (error) throw new ServiceError("Benachrichtigung konnte nicht erstellt werden", error);
    return (data as string | null) ?? null;
  },

  async listForUser(limit = 50): Promise<Notification[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new ServiceError("Benachrichtigungen konnten nicht geladen werden", error);
    return (data ?? []) as unknown as Notification[];
  },

  async unreadCount(): Promise<number> {
    const { supabase } = await getContext();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    if (error) return 0;
    return count ?? 0;
  },

  async markRead(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new ServiceError("Benachrichtigung konnte nicht aktualisiert werden", error);
  },

  async markAllRead(userId: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw new ServiceError("Benachrichtigungen konnten nicht aktualisiert werden", error);
  },
};
