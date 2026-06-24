import { getContext, ServiceError } from "./_helpers";
import { teamService } from "./team.service";
import { isoDay, addDays, today, weekRange } from "@/lib/dates";
import type {
  ProductionCalendarEvent,
  WorkloadRow,
  ProfileMini,
} from "@/types/entities";

const PROJECT_TABLES = [
  "website_projects",
  "ad_projects",
  "crm_projects",
  "content_projects",
] as const;

const DONE_TASK_KEYS = new Set(["done", "archived"]);

export interface ProductionSummary {
  runningProjects: number;
  atRisk: number;
  overdueTasks: number;
  shootsThisWeek: number;
  launchesThisWeek: number;
  openApprovals: number;
  contentProductions: number;
  crmGoLives: number;
}

const EMPTY_SUMMARY: ProductionSummary = {
  runningProjects: 0,
  atRisk: 0,
  overdueTasks: 0,
  shootsThisWeek: 0,
  launchesThisWeek: 0,
  openApprovals: 0,
  contentProductions: 0,
  crmGoLives: 0,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countRows(query: any): Promise<number> {
  const { count } = await query;
  return count ?? 0;
}

export const productionDashboardService = {
  EMPTY_SUMMARY,

  async summary(): Promise<ProductionSummary> {
    const { supabase } = await getContext();
    const t = today();
    const week = weekRange(0);
    const in7 = isoDay(addDays(new Date(), 7));

    const head = (table: string) =>
      supabase.from(table).select("id", { count: "exact", head: true }).is("deleted_at", null);

    const [
      websites,
      ads,
      crms,
      contents,
      shootsThisWeek,
      launchesThisWeek,
      crmGoLives,
      openApprovals,
      overdueRows,
      milestoneRows,
    ] = await Promise.all([
      countRows(head("website_projects")),
      countRows(head("ad_projects")),
      countRows(head("crm_projects")),
      countRows(head("content_projects")),
      countRows(
        head("shoots")
          .gte("shooting_date", `${week.from}T00:00:00`)
          .lte("shooting_date", `${week.to}T23:59:59`)
          .in("status", ["planned", "confirmed"]),
      ),
      countRows(
        head("website_projects")
          .gte("launch_date", week.from)
          .lte("launch_date", week.to)
          .neq("status", "completed"),
      ),
      countRows(
        head("crm_projects")
          .gte("go_live_date", t)
          .lte("go_live_date", in7)
          .neq("status", "live"),
      ),
      countRows(head("approvals").eq("status", "open")),
      supabase
        .from("tasks")
        .select("id, status:statuses!tasks_status_id_fkey(key)")
        .is("deleted_at", null)
        .lt("due_date", t),
      supabase
        .from("project_milestones")
        .select("project_id")
        .eq("completed", false)
        .lt("due_date", t),
    ]);

    const overdueTasks = (
      (overdueRows.data ?? []) as unknown as Array<{
        status: { key: string } | null;
      }>
    ).filter((r) => !DONE_TASK_KEYS.has(r.status?.key ?? "")).length;

    const atRisk = new Set(
      ((milestoneRows.data ?? []) as Array<{ project_id: string }>).map(
        (m) => m.project_id,
      ),
    ).size;

    return {
      runningProjects: websites + ads + crms + contents,
      atRisk,
      overdueTasks,
      shootsThisWeek,
      launchesThisWeek,
      openApprovals,
      contentProductions: contents,
      crmGoLives,
    };
  },

  /** Vereinheitlichte Kalender-Ereignisse im Bereich [from, to] (YYYY-MM-DD). */
  async calendar(from: string, to: string): Promise<ProductionCalendarEvent[]> {
    const { supabase } = await getContext();
    const fromTs = `${from}T00:00:00`;
    const toTs = `${to}T23:59:59`;

    const [shoots, websites, crms, milestones, reportings] = await Promise.all([
      supabase
        .from("shoots")
        .select("id, title, shooting_date, client:clients!shoots_client_id_fkey(name)")
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .gte("shooting_date", fromTs)
        .lte("shooting_date", toTs),
      supabase
        .from("website_projects")
        .select("id, title, domain, launch_date, client:clients!website_projects_client_id_fkey(name)")
        .is("deleted_at", null)
        .neq("status", "completed")
        .gte("launch_date", from)
        .lte("launch_date", to),
      supabase
        .from("crm_projects")
        .select("id, title, go_live_date, client:clients!crm_projects_client_id_fkey(name)")
        .is("deleted_at", null)
        .gte("go_live_date", from)
        .lte("go_live_date", to),
      supabase
        .from("project_milestones")
        .select("id, title, due_date, project_id")
        .gte("due_date", from)
        .lte("due_date", to),
      supabase
        .from("reporting_calls")
        .select("id, scheduled_date, client_id, client:clients!reporting_calls_client_id_fkey(name)")
        .is("deleted_at", null)
        .in("status", ["open", "scheduled", "rescheduled"])
        .gte("scheduled_date", fromTs)
        .lte("scheduled_date", toTs),
    ]);

    const events: ProductionCalendarEvent[] = [];
    const clientName = (c: unknown): string | null =>
      (c as { name?: string } | null)?.name ?? null;

    for (const s of (shoots.data ?? []) as Array<Record<string, unknown>>) {
      events.push({
        id: `shoot-${s.id as string}`,
        date: String(s.shooting_date).slice(0, 10),
        type: "shoot",
        title: `Shooting: ${(s.title as string) ?? ""}`.trim(),
        href: "/production/shoots",
        clientName: clientName(s.client),
      });
    }
    for (const w of (websites.data ?? []) as Array<Record<string, unknown>>) {
      events.push({
        id: `launch-${w.id as string}`,
        date: String(w.launch_date).slice(0, 10),
        type: "launch",
        title: `Launch: ${(w.title as string) || (w.domain as string) || "Website"}`,
        href: `/production/websites/${w.id as string}`,
        clientName: clientName(w.client),
      });
    }
    for (const c of (crms.data ?? []) as Array<Record<string, unknown>>) {
      events.push({
        id: `golive-${c.id as string}`,
        date: String(c.go_live_date).slice(0, 10),
        type: "go_live",
        title: `CRM Go-Live: ${(c.title as string) || "CRM"}`,
        href: `/production/crm/${c.id as string}`,
        clientName: clientName(c.client),
      });
    }
    for (const m of (milestones.data ?? []) as Array<Record<string, unknown>>) {
      events.push({
        id: `milestone-${m.id as string}`,
        date: String(m.due_date).slice(0, 10),
        type: "milestone",
        title: `Meilenstein: ${(m.title as string) ?? ""}`.trim(),
        href: "/production",
        clientName: null,
      });
    }
    for (const r of (reportings.data ?? []) as Array<Record<string, unknown>>) {
      events.push({
        id: `reporting-${r.id as string}`,
        date: String(r.scheduled_date).slice(0, 10),
        type: "reporting",
        title: "Reporting-Call",
        href: `/clients/${r.client_id as string}`,
        clientName: clientName(r.client),
      });
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  },

  /** Team-Auslastung: offene Aufgaben, Projekte und Stunden je Mitarbeiter. */
  async workload(): Promise<WorkloadRow[]> {
    const { supabase } = await getContext();
    const members: ProfileMini[] = await teamService.listMembers().catch(() => []);
    if (members.length === 0) return [];

    const [tasksRes, ...projRes] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "assigned_to, estimated_hours, actual_hours, status:statuses!tasks_status_id_fkey(key)",
        )
        .is("deleted_at", null),
      ...PROJECT_TABLES.map((tbl) =>
        supabase.from(tbl).select("owner_id").is("deleted_at", null),
      ),
    ]);

    const rows = new Map<string, WorkloadRow>();
    for (const m of members) {
      rows.set(m.id, {
        user: m,
        openTasks: 0,
        projects: 0,
        estimatedHours: 0,
        actualHours: 0,
      });
    }

    for (const t of (tasksRes.data ?? []) as unknown as Array<{
      assigned_to: string | null;
      estimated_hours: number | null;
      actual_hours: number | null;
      status: { key: string } | null;
    }>) {
      if (!t.assigned_to) continue;
      const row = rows.get(t.assigned_to);
      if (!row) continue;
      const key = t.status?.key ?? "";
      if (key === "archived") continue;
      if (!DONE_TASK_KEYS.has(key)) {
        row.openTasks += 1;
        row.estimatedHours += t.estimated_hours ?? 0;
      }
      row.actualHours += t.actual_hours ?? 0;
    }

    for (const res of projRes) {
      for (const p of (res.data ?? []) as Array<{ owner_id: string | null }>) {
        if (!p.owner_id) continue;
        const row = rows.get(p.owner_id);
        if (row) row.projects += 1;
      }
    }

    return Array.from(rows.values()).sort(
      (a, b) => b.openTasks - a.openTasks || b.projects - a.projects,
    );
  },

  async safeSummary(): Promise<ProductionSummary> {
    try {
      return await this.summary();
    } catch (e) {
      if (e instanceof ServiceError) return EMPTY_SUMMARY;
      throw e;
    }
  },
};
