import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { tasksService } from "./tasks.service";
import { aiRunsService } from "./ai.service";
import {
  meetingInsertSchema,
  meetingUpdateSchema,
  type MeetingCreateInput,
  type MeetingUpdateInput,
} from "@/lib/validation/meetings";
import type { MeetingWithRelations } from "@/types/entities";

const SELECT = `
  *,
  client:clients!meetings_client_id_fkey(id,name),
  lead:leads!meetings_lead_id_fkey(id,company_name)
`;

export interface MeetingAssistFilters {
  meetingType?: string;
  search?: string;
}

function mapRow(row: Record<string, unknown>): MeetingWithRelations {
  const { client, lead, ...rest } = row as Record<string, unknown> & { client?: unknown; lead?: unknown };
  return {
    ...(rest as object),
    client: (client as MeetingWithRelations["client"]) ?? null,
    lead: (lead as MeetingWithRelations["lead"]) ?? null,
  } as MeetingWithRelations;
}

export const meetingAssistantService = {
  async list(filters: MeetingAssistFilters = {}): Promise<MeetingWithRelations[]> {
    const { supabase } = await getContext();
    let q = supabase.from("meetings").select(SELECT).is("deleted_at", null).order("meeting_date", { ascending: false, nullsFirst: false });
    if (filters.meetingType) q = q.eq("meeting_type", filters.meetingType);
    if (filters.search) q = q.ilike("title", `%${filters.search.trim()}%`);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Meetings konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapRow);
  },

  async getById(id: string): Promise<MeetingWithRelations | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("meetings").select(SELECT).eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) throw new ServiceError("Meeting konnte nicht geladen werden", error);
    return data ? mapRow(data as Record<string, unknown>) : null;
  },

  async create(input: MeetingCreateInput): Promise<MeetingWithRelations> {
    const parsed = meetingInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("meetings").insert(parsed).select(SELECT).single();
    if (error) throw new ServiceError("Meeting konnte nicht erstellt werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "create", entityType: "meeting", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: MeetingUpdateInput): Promise<MeetingWithRelations> {
    const parsed = meetingUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("meetings").update(parsed).eq("id", id).is("deleted_at", null).select(SELECT).single();
    if (error) throw new ServiceError("Meeting konnte nicht aktualisiert werden", error);
    return mapRow(data as Record<string, unknown>);
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase.from("meetings").update({ deleted_at: new Date().toISOString(), updated_by: userId }).eq("id", id).is("deleted_at", null);
    if (error) throw new ServiceError("Meeting konnte nicht geloescht werden", error);
  },

  /**
   * "Zusammenfassung erstellen": erzeugt eine strukturierte Zusammenfassung
   * (Vorschau - keine Live-AI). Basiert auf Transkript/Notizen; befuellt summary
   * und (falls leer) action_items aus next_steps. Protokolliert einen ai_run.
   */
  async generateSummary(id: string): Promise<MeetingWithRelations> {
    const meeting = await this.getById(id);
    if (!meeting) throw new ServiceError("Meeting nicht gefunden");
    const basis = meeting.transcript?.trim() || meeting.notes?.trim() || "";
    const summary =
      `Zusammenfassung: "${meeting.title}" (Vorschau - keine Live-AI in dieser Phase).\n\n` +
      (basis
        ? `Auf Basis von ${meeting.transcript ? "Transkript" : "Notizen"}.\n`
        : "Bitte Transkript oder Notizen ergaenzen, damit die KI eine Zusammenfassung erstellen kann.\n") +
      `\nEntscheidungen: ${meeting.decisions || "-"}\nNaechste Schritte: ${meeting.next_steps || "-"}`;

    const updated = await this.update(id, {
      summary,
      action_items: meeting.action_items || meeting.next_steps || undefined,
    });
    await aiRunsService.log({
      entity_type: "meeting",
      entity_id: id,
      status: "success",
      output_data: { note: "Meeting-Zusammenfassung (Vorschau).", summary },
      token_usage: 0,
      cost_estimate: 0,
    });
    return updated;
  },

  /** "Aufgaben erstellen": erzeugt Tasks aus den action_items/next_steps. */
  async generateTasks(id: string): Promise<number> {
    const meeting = await this.getById(id);
    if (!meeting) throw new ServiceError("Meeting nicht gefunden");
    const source = (meeting.action_items || meeting.next_steps || "").split("\n").map((l) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean);
    const titles = source.length ? source : [`Meeting-Follow-up: ${meeting.title}`];
    for (const title of titles) {
      await tasksService.create({ title, client_id: meeting.client_id ?? undefined, priority: "medium" });
    }
    return titles.length;
  },
};
