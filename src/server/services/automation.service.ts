import { getContext, ServiceError } from "./_helpers";
import { recordAudit, logActivity } from "@/lib/activity";
import {
  automationJobInsertSchema,
  automationJobUpdateSchema,
  type AutomationJobCreateInput,
  type AutomationJobUpdateInput,
} from "@/lib/validation/ai";
import type { AutomationJob, AutomationRun } from "@/types/entities";

export interface JobFilters {
  status?: string;
  type?: string;
}

export const automationJobsService = {
  async list(filters: JobFilters = {}): Promise<AutomationJob[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("automation_jobs")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.type) q = q.eq("type", filters.type);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Jobs konnten nicht geladen werden", error);
    return (data ?? []) as unknown as AutomationJob[];
  },

  async getById(id: string): Promise<AutomationJob | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("automation_jobs")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Job konnte nicht geladen werden", error);
    return (data as unknown as AutomationJob) ?? null;
  },

  async create(input: AutomationJobCreateInput): Promise<AutomationJob> {
    const parsed = automationJobInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("automation_jobs")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Job konnte nicht erstellt werden", error);
    const row = data as unknown as AutomationJob;
    await recordAudit({ action: "create", entityType: "automation_job", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: AutomationJobUpdateInput): Promise<AutomationJob> {
    const parsed = automationJobUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("automation_jobs")
      .update(parsed)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw new ServiceError("Job konnte nicht aktualisiert werden", error);
    const row = data as unknown as AutomationJob;
    await recordAudit({ action: "update", entityType: "automation_job", entityId: id, newValues: row });
    return row;
  },

  async setStatus(id: string, status: string): Promise<AutomationJob> {
    const row = await this.update(id, { status: status as AutomationJobUpdateInput["status"] });
    await logActivity({
      action: status === "active" ? "automation_job.activated" : "automation_job.deactivated",
      entityType: "automation_job",
      entityId: id,
      summary: `Job "${row.name}" ${status === "active" ? "aktiviert" : "deaktiviert"}`,
    });
    return row;
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("automation_jobs")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Job konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "automation_job", entityId: id });
  },

  /**
   * Manueller Job-Lauf. In dieser Phase wird KEINE echte Logik ausgefuehrt -
   * es wird nur ein automation_run protokolliert (Architektur-Vorbereitung).
   */
  async runNow(id: string): Promise<AutomationRun> {
    const job = await this.getById(id);
    if (!job) throw new ServiceError("Job nicht gefunden");
    const { supabase } = await getContext();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("automation_runs")
      .insert({
        job_id: id,
        status: "success",
        started_at: now,
        finished_at: now,
        result: { note: "Architektur vorbereitet - keine Live-Ausfuehrung in dieser Phase." },
        logs: `Manueller Lauf fuer Job "${job.name}" (Typ: ${job.type ?? "-"}).`,
      })
      .select("*")
      .single();
    if (error) throw new ServiceError("Job-Lauf konnte nicht protokolliert werden", error);
    await supabase
      .from("automation_jobs")
      .update({ last_run_at: now })
      .eq("id", id);
    await recordAudit({ action: "automation_run.started", entityType: "automation_run", entityId: (data as { id: string }).id });
    return data as unknown as AutomationRun;
  },
};

export const automationRunsService = {
  async listByJob(jobId: string): Promise<AutomationRun[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("automation_runs")
      .select("*")
      .eq("job_id", jobId)
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) throw new ServiceError("Job-Laeufe konnten nicht geladen werden", error);
    return (data ?? []) as unknown as AutomationRun[];
  },

  /** Letzte Laeufe ueber alle Jobs (mit Job-Name) fuer die Logs-Ansicht. */
  async recent(limit = 100): Promise<AutomationRun[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("automation_runs")
      .select("*, job:automation_jobs!automation_runs_job_id_fkey(id,name)")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) throw new ServiceError("Job-Laeufe konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
      const { job, ...rest } = row as Record<string, unknown> & { job?: unknown };
      return { ...(rest as object), job: (job as AutomationRun["job"]) ?? null } as AutomationRun;
    });
  },
};
