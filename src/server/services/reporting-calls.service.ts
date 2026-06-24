import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { tasksService } from "./tasks.service";
import {
  reportingCallInsertSchema,
  reportingCallUpdateSchema,
  type ReportingCallCreateInput,
  type ReportingCallUpdateInput,
} from "@/lib/validation/reporting-calls";
import type { ReportingCallWithRelations } from "@/types/entities";

const RC_SELECT = `
  *,
  client:clients!reporting_calls_client_id_fkey(id,name),
  owner:profiles!reporting_calls_owner_id_fkey(id,full_name)
`;

export interface ReportingCallFilters {
  clientId?: string;
  status?: string;
  statusIn?: string[];
  scheduledFrom?: string;
  scheduledTo?: string;
  overdue?: boolean;
}

function mapRC(row: Record<string, unknown>): ReportingCallWithRelations {
  const { client, owner, ...rest } = row as Record<string, unknown> & {
    client?: unknown;
    owner?: unknown;
  };
  return {
    ...(rest as object),
    client: (client as ReportingCallWithRelations["client"]) ?? null,
    owner: (owner as ReportingCallWithRelations["owner"]) ?? null,
  } as ReportingCallWithRelations;
}

export const reportingCallsService = {
  async list(filters: ReportingCallFilters = {}): Promise<ReportingCallWithRelations[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("reporting_calls")
      .select(RC_SELECT)
      .is("deleted_at", null)
      .order("scheduled_date", { ascending: true });
    if (filters.clientId) q = q.eq("client_id", filters.clientId);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.statusIn?.length) q = q.in("status", filters.statusIn);
    if (filters.scheduledFrom) q = q.gte("scheduled_date", filters.scheduledFrom);
    if (filters.scheduledTo) q = q.lte("scheduled_date", filters.scheduledTo);
    if (filters.overdue) q = q.lt("scheduled_date", new Date().toISOString());
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Reporting-Calls konnten nicht geladen werden", error);
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapRC);
  },

  async listByClient(clientId: string): Promise<ReportingCallWithRelations[]> {
    return this.list({ clientId });
  },

  async getById(id: string): Promise<ReportingCallWithRelations | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("reporting_calls")
      .select(RC_SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Reporting-Call konnte nicht geladen werden", error);
    return data ? mapRC(data as Record<string, unknown>) : null;
  },

  async create(input: ReportingCallCreateInput): Promise<ReportingCallWithRelations> {
    const parsed = reportingCallInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("reporting_calls")
      .insert(parsed)
      .select(RC_SELECT)
      .single();
    if (error) throw new ServiceError("Reporting-Call konnte nicht erstellt werden", error);
    const rc = mapRC(data as Record<string, unknown>);
    await recordAudit({ action: "create", entityType: "reporting_call", entityId: rc.id, newValues: rc });
    return rc;
  },

  async update(id: string, input: ReportingCallUpdateInput): Promise<ReportingCallWithRelations> {
    const parsed = reportingCallUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("reporting_calls")
      .update(parsed)
      .eq("id", id)
      .is("deleted_at", null)
      .select(RC_SELECT)
      .single();
    if (error) throw new ServiceError("Reporting-Call konnte nicht aktualisiert werden", error);
    const rc = mapRC(data as Record<string, unknown>);
    await recordAudit({ action: "update", entityType: "reporting_call", entityId: id, newValues: rc });
    return rc;
  },

  async markStatus(id: string, status: string): Promise<ReportingCallWithRelations> {
    return this.update(id, { status: status as ReportingCallUpdateInput["status"] });
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("reporting_calls")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Reporting-Call konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "reporting_call", entityId: id });
  },

  /** Aus next_steps des Calls direkt Aufgaben erstellen ("Aufgaben erstellen"). */
  async createTasksFrom(id: string): Promise<number> {
    const call = await this.getById(id);
    if (!call) throw new ServiceError("Reporting-Call nicht gefunden");
    const lines = (call.next_steps ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const titles = lines.length
      ? lines
      : [`Reporting Follow-up: ${call.client?.name ?? "Kunde"}`];
    for (const title of titles) {
      await tasksService.create({
        title,
        client_id: call.client_id,
        priority: "medium",
      });
    }
    return titles.length;
  },
};
