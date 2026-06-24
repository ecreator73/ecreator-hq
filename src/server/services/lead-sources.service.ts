import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  leadSourceInsertSchema,
  leadSourceUpdateSchema,
  type LeadSourceCreateInput,
  type LeadSourceUpdateInput,
} from "@/lib/validation/lead-engine";
import type { LeadSourceRow, LeadDiscoveryRun } from "@/types/entities";

export const leadSourcesService = {
  async list(): Promise<LeadSourceRow[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("lead_sources")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new ServiceError("Quellen konnten nicht geladen werden", error);
    return (data ?? []) as unknown as LeadSourceRow[];
  },

  async create(input: LeadSourceCreateInput): Promise<LeadSourceRow> {
    const parsed = leadSourceInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("lead_sources")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Quelle konnte nicht erstellt werden", error);
    const row = data as unknown as LeadSourceRow;
    await recordAudit({ action: "create", entityType: "lead_source", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: LeadSourceUpdateInput): Promise<LeadSourceRow> {
    const parsed = leadSourceUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("lead_sources")
      .update(parsed)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new ServiceError("Quelle konnte nicht aktualisiert werden", error);
    return data as unknown as LeadSourceRow;
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("lead_sources").delete().eq("id", id);
    if (error) throw new ServiceError("Quelle konnte nicht geloescht werden", error);
  },
};

export const leadDiscoveryRunsService = {
  async recent(limit = 50): Promise<LeadDiscoveryRun[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("lead_discovery_runs")
      .select("*, source:lead_sources!lead_discovery_runs_source_id_fkey(id,name)")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) throw new ServiceError("Discovery-Laeufe konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
      const { source, ...rest } = row as Record<string, unknown> & { source?: unknown };
      return { ...(rest as object), source: (source as LeadDiscoveryRun["source"]) ?? null } as LeadDiscoveryRun;
    });
  },

  /** Discovery-Lauf protokollieren (Architektur-Vorbereitung, keine Live-Suche). */
  async log(sourceId: string | null, leadsFound: number, logs: string): Promise<void> {
    const { supabase } = await getContext();
    const now = new Date().toISOString();
    const { error } = await supabase.from("lead_discovery_runs").insert({
      source_id: sourceId,
      status: "success",
      started_at: now,
      finished_at: now,
      leads_found: leadsFound,
      logs,
    });
    if (error) throw new ServiceError("Discovery-Lauf konnte nicht protokolliert werden", error);
  },
};
