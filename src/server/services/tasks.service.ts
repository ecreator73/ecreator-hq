import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  taskInsertSchema,
  taskUpdateSchema,
  taskMoveSchema,
  type TaskCreateInput,
  type TaskUpdateInput,
  type TaskMoveInput,
} from "@/lib/validation/tasks";
import type { TaskWithRelations } from "@/types/entities";

/**
 * Tasks-Service - das Herzstueck. Status/Prioritaet werden als Keys entgegen-
 * genommen und in die FK-IDs (statuses/priorities) aufgeloest. Lesezugriffe
 * liefern aufgeloeste Beziehungen (status/priority/assignee/client/project)
 * sowie Subtask-Fortschritt und Kommentaranzahl.
 */

const TASK_SELECT = `
  id, org_id, title, description, client_id, project_id, lead_id, assigned_to,
  created_by, updated_by, status_id, priority_id, due_date, start_date,
  completed_at, estimated_hours, actual_hours, tags, position,
  deleted_at, created_at, updated_at,
  status:statuses!tasks_status_id_fkey(key,label,color),
  priority:priorities!tasks_priority_id_fkey(key,label,color,level),
  assignee:profiles!tasks_assigned_to_fkey(id,full_name),
  client:clients!tasks_client_id_fkey(id,name),
  project:projects!tasks_project_id_fkey(id,title),
  subtasks(id,completed),
  task_comments(count)
`;

type AnyClient = Awaited<ReturnType<typeof getContext>>["supabase"];

interface Registry {
  statusByKey: Map<string, string>;
  priorityByKey: Map<string, string>;
}

async function resolveRegistry(supabase: AnyClient): Promise<Registry> {
  const [{ data: statuses }, { data: priorities }] = await Promise.all([
    supabase.from("statuses").select("id,key").eq("entity_type", "task"),
    supabase.from("priorities").select("id,key"),
  ]);
  return {
    statusByKey: new Map(
      ((statuses ?? []) as Array<{ id: string; key: string }>).map((s) => [
        s.key,
        s.id,
      ]),
    ),
    priorityByKey: new Map(
      ((priorities ?? []) as Array<{ id: string; key: string }>).map((p) => [
        p.key,
        p.id,
      ]),
    ),
  };
}

function mapTask(row: Record<string, unknown>): TaskWithRelations {
  const {
    subtasks,
    task_comments,
    status,
    priority,
    assignee,
    client,
    project,
    ...rest
  } = row as Record<string, unknown> & {
    subtasks?: Array<{ completed: boolean }>;
    task_comments?: Array<{ count: number }>;
  };
  const subs = subtasks ?? [];
  return {
    ...(rest as object),
    status: (status as TaskWithRelations["status"]) ?? null,
    priority: (priority as TaskWithRelations["priority"]) ?? null,
    assignee: (assignee as TaskWithRelations["assignee"]) ?? null,
    client: (client as TaskWithRelations["client"]) ?? null,
    project: (project as TaskWithRelations["project"]) ?? null,
    subtask_total: subs.length,
    subtask_done: subs.filter((s) => s.completed).length,
    comment_count: Array.isArray(task_comments)
      ? (task_comments[0]?.count ?? 0)
      : 0,
  } as TaskWithRelations;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface TaskFilters {
  status?: string;
  statusIn?: string[];
  excludeStatus?: string[];
  priority?: string;
  client_id?: string;
  project_id?: string;
  lead_id?: string;
  assigned_to?: string;
  search?: string;
  tag?: string;
  dueFrom?: string;
  dueTo?: string;
  overdue?: boolean;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: { column: string; ascending?: boolean };
}

export interface TaskListResult {
  rows: TaskWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

async function applyFilters(
  supabase: AnyClient,
  reg: Registry,
  filters: TaskFilters,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
) {
  let q = query.is("deleted_at", null);

  if (filters.status) {
    const id = reg.statusByKey.get(filters.status);
    if (id) q = q.eq("status_id", id);
  }
  if (filters.statusIn?.length) {
    const ids = filters.statusIn
      .map((k) => reg.statusByKey.get(k))
      .filter(Boolean) as string[];
    if (ids.length) q = q.in("status_id", ids);
  }
  if (filters.excludeStatus?.length) {
    const ids = filters.excludeStatus
      .map((k) => reg.statusByKey.get(k))
      .filter(Boolean) as string[];
    if (ids.length) q = q.not("status_id", "in", `(${ids.join(",")})`);
  }
  if (filters.priority) {
    const id = reg.priorityByKey.get(filters.priority);
    if (id) q = q.eq("priority_id", id);
  }
  if (filters.client_id) q = q.eq("client_id", filters.client_id);
  if (filters.project_id) q = q.eq("project_id", filters.project_id);
  if (filters.lead_id) q = q.eq("lead_id", filters.lead_id);
  if (filters.assigned_to) q = q.eq("assigned_to", filters.assigned_to);
  if (filters.tag) q = q.contains("tags", [filters.tag]);
  if (filters.dueFrom) q = q.gte("due_date", filters.dueFrom);
  if (filters.dueTo) q = q.lte("due_date", filters.dueTo);
  if (filters.overdue) q = q.lt("due_date", todayISO());

  if (filters.search) {
    const term = filters.search.trim();
    const like = `%${term}%`;
    // Kunden/Projekte nach Name matchen -> ids in die OR-Suche aufnehmen.
    const [{ data: clients }, { data: projects }] = await Promise.all([
      supabase.from("clients").select("id").ilike("name", like).limit(50),
      supabase.from("projects").select("id").ilike("title", like).limit(50),
    ]);
    const clientIds = ((clients ?? []) as Array<{ id: string }>).map(
      (c) => c.id,
    );
    const projectIds = ((projects ?? []) as Array<{ id: string }>).map(
      (p) => p.id,
    );
    const ors = [`title.ilike.${like}`, `description.ilike.${like}`];
    if (clientIds.length) ors.push(`client_id.in.(${clientIds.join(",")})`);
    if (projectIds.length) ors.push(`project_id.in.(${projectIds.join(",")})`);
    q = q.or(ors.join(","));
  }

  return q;
}

export const tasksService = {
  /** Gefilterte, paginierte Liste (Tabellenansicht). */
  async list(
    filters: TaskFilters = {},
    params: ListParams = {},
  ): Promise<TaskListResult> {
    const { supabase } = await getContext();
    const reg = await resolveRegistry(supabase);
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
    const sort = params.sort ?? { column: "created_at", ascending: false };

    let query = supabase
      .from("tasks")
      .select(TASK_SELECT, { count: "exact" })
      .order(sort.column, { ascending: sort.ascending ?? false });
    query = await applyFilters(supabase, reg, filters, query);
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw new ServiceError("Aufgaben konnten nicht geladen werden", error);
    return {
      rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapTask),
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  /** Alle (nicht-archivierten) Aufgaben fuer das Kanban-Board. */
  async board(filters: TaskFilters = {}): Promise<TaskWithRelations[]> {
    const { supabase } = await getContext();
    const reg = await resolveRegistry(supabase);
    let query = supabase
      .from("tasks")
      .select(TASK_SELECT)
      .order("position", { ascending: true });
    query = await applyFilters(
      supabase,
      reg,
      { ...filters, excludeStatus: ["archived", ...(filters.excludeStatus ?? [])] },
      query,
    );
    query = query.limit(500);
    const { data, error } = await query;
    if (error) throw new ServiceError("Board konnte nicht geladen werden", error);
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapTask);
  },

  async getById(id: string): Promise<TaskWithRelations | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Aufgabe konnte nicht geladen werden", error);
    return data ? mapTask(data as Record<string, unknown>) : null;
  },

  async create(input: TaskCreateInput): Promise<TaskWithRelations> {
    const parsed = taskInsertSchema.parse(input);
    const { supabase, userId } = await getContext();
    const reg = await resolveRegistry(supabase);

    const { status, priority, ...fields } = parsed;
    const payload: Record<string, unknown> = {
      ...fields,
      position: Date.now(),
    };
    if (status) {
      const sid = reg.statusByKey.get(status);
      if (!sid) throw new ServiceError("Unbekannter Status");
      payload.status_id = sid;
    }
    if (priority) {
      const pid = reg.priorityByKey.get(priority);
      if (!pid) throw new ServiceError("Unbekannte Prioritaet");
      payload.priority_id = pid;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select(TASK_SELECT)
      .single();
    if (error) throw new ServiceError("Aufgabe konnte nicht erstellt werden", error);

    const task = mapTask(data as Record<string, unknown>);
    // Zuweisungs-Benachrichtigung erzeugt der DB-Trigger notify_task_assignment.
    await logTaskActivity(supabase, task.id, userId, "created", null, task.title);
    await recordAudit({
      action: "create",
      entityType: "task",
      entityId: task.id,
      newValues: task,
    });
    return task;
  },

  async update(id: string, input: TaskUpdateInput): Promise<TaskWithRelations> {
    const parsed = taskUpdateSchema.parse(input);
    const { supabase, userId } = await getContext();
    const reg = await resolveRegistry(supabase);

    const before = await this.getById(id);
    if (!before) throw new ServiceError("Aufgabe nicht gefunden");

    const { status, priority, ...fields } = parsed;
    const payload: Record<string, unknown> = { ...fields, updated_by: userId };
    if (status !== undefined) {
      const sid = reg.statusByKey.get(status);
      if (!sid) throw new ServiceError("Unbekannter Status");
      payload.status_id = sid;
    }
    if (priority !== undefined) {
      if (priority) {
        const pid = reg.priorityByKey.get(priority);
        if (!pid) throw new ServiceError("Unbekannte Prioritaet");
        payload.priority_id = pid;
      } else {
        payload.priority_id = null;
      }
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null)
      .select(TASK_SELECT)
      .single();
    if (error) throw new ServiceError("Aufgabe konnte nicht aktualisiert werden", error);

    const after = mapTask(data as Record<string, unknown>);

    // Aktivitaet protokollieren (Status-/Zuweisungswechsel sprechend)
    if (status && before.status?.key !== after.status?.key) {
      await logTaskActivity(
        supabase,
        id,
        userId,
        "status_changed",
        before.status?.label ?? null,
        after.status?.label ?? null,
      );
    }
    if (
      parsed.assigned_to !== undefined &&
      before.assigned_to !== after.assigned_to
    ) {
      await logTaskActivity(
        supabase,
        id,
        userId,
        "assigned",
        before.assignee?.full_name ?? null,
        after.assignee?.full_name ?? null,
      );
    }
    await recordAudit({
      action: "update",
      entityType: "task",
      entityId: id,
      oldValues: before,
      newValues: after,
    });
    return after;
  },

  /** Board-Drag&Drop: Status + Position setzen. */
  async move(id: string, input: TaskMoveInput): Promise<TaskWithRelations> {
    const parsed = taskMoveSchema.parse(input);
    const { supabase, userId } = await getContext();
    const reg = await resolveRegistry(supabase);
    const statusId = reg.statusByKey.get(parsed.status);
    if (!statusId) throw new ServiceError("Unbekannter Status");

    const before = await this.getById(id);

    const { data, error } = await supabase
      .from("tasks")
      .update({ status_id: statusId, position: parsed.position, updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null)
      .select(TASK_SELECT)
      .single();
    if (error) throw new ServiceError("Aufgabe konnte nicht verschoben werden", error);

    const after = mapTask(data as Record<string, unknown>);
    if (before && before.status?.key !== after.status?.key) {
      await logTaskActivity(
        supabase,
        id,
        userId,
        "status_changed",
        before.status?.label ?? null,
        after.status?.label ?? null,
      );
    }
    return after;
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const before = await this.getById(id);
    if (!before) throw new ServiceError("Aufgabe nicht gefunden oder bereits geloescht");
    const { error } = await supabase
      .from("tasks")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Aufgabe konnte nicht geloescht werden", error);
    await logTaskActivity(supabase, id, userId, "deleted", before.title, null);
    await recordAudit({
      action: "delete",
      entityType: "task",
      entityId: id,
      oldValues: before,
    });
  },

  /** Zaehlerwerte fuer die Home-Dashboard-Widgets. */
  async dashboardCounts(userId: string | null): Promise<{
    today: number;
    overdue: number;
    critical: number;
    mine: number;
  }> {
    const { supabase } = await getContext();
    const reg = await resolveRegistry(supabase);
    const today = todayISO();
    const excl = ["done", "archived"]
      .map((k) => reg.statusByKey.get(k))
      .filter(Boolean) as string[];
    const urgentId = reg.priorityByKey.get("urgent");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function countOpen(build: (q: any) => any): Promise<number> {
      let q = supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);
      if (excl.length) q = q.not("status_id", "in", `(${excl.join(",")})`);
      const { count } = await build(q);
      return count ?? 0;
    }

    const [today_, overdue, critical, mine] = await Promise.all([
      countOpen((q) => q.eq("due_date", today)),
      countOpen((q) => q.lt("due_date", today)),
      urgentId ? countOpen((q) => q.eq("priority_id", urgentId)) : Promise.resolve(0),
      userId ? countOpen((q) => q.eq("assigned_to", userId)) : Promise.resolve(0),
    ]);

    return { today: today_, overdue, critical, mine };
  },
};

/* ---- interne Helfer ---- */

async function logTaskActivity(
  supabase: AnyClient,
  taskId: string,
  userId: string | null,
  action: string,
  oldValue: string | null,
  newValue: string | null,
): Promise<void> {
  try {
    await supabase.from("task_activity").insert({
      task_id: taskId,
      user_id: userId,
      action,
      old_value: oldValue,
      new_value: newValue,
    });
  } catch {
    // Aktivitaets-Log darf den Vorgang nie brechen.
  }
}

