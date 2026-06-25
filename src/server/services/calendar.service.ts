import { productionDashboardService } from "./production-dashboard.service";
import { financeService } from "./finance.service";
import { tasksService } from "./tasks.service";
import { leadsService } from "./leads.service";
import { salesMeetingsService } from "./sales-meetings.service";
import type {
  TaskWithRelations,
  LeadWithRelations,
  SalesMeetingRow,
} from "@/types/entities";

/** Kategorien des globalen Kalenders (fuer Filter + Farben). */
export type CalendarCategory =
  | "meeting"
  | "followup"
  | "reporting"
  | "task"
  | "deadline"
  | "shoot"
  | "launch"
  | "contract";

export interface GlobalCalendarEvent {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  category: CalendarCategory;
  title: string;
  href: string;
  subtitle: string | null;
}

const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : "");

/**
 * Globaler Kalender: fasst alle relevanten Ereignisse aus den bestehenden
 * Modulen zu EINEM Strom zusammen (komponiert vorhandene Services, keine
 * Doppelquellen). Reporting-Calls + Projekt-Deadlines + Shootings + Launches
 * kommen aus dem Produktions-Kalender, Vertragsablaeufe aus Finance.
 */
export const calendarService = {
  async events(from: string, to: string): Promise<GlobalCalendarEvent[]> {
    const [prod, fin, taskRes, leadRes, meetings] = await Promise.all([
      productionDashboardService.calendar(from, to).catch(() => []),
      financeService.calendar(from, to).catch(() => []),
      tasksService
        .list(
          { dueFrom: from, dueTo: to, excludeStatus: ["done", "archived"] },
          { pageSize: 500, sort: { column: "due_date", ascending: true } },
        )
        .catch(() => ({ rows: [] as TaskWithRelations[] })),
      leadsService
        .list({ dueFrom: from, dueTo: to }, { pageSize: 200 })
        .catch(() => ({ rows: [] as LeadWithRelations[] })),
      salesMeetingsService.list().catch(() => [] as SalesMeetingRow[]),
    ]);

    const events: GlobalCalendarEvent[] = [];

    for (const e of prod) {
      const category: CalendarCategory =
        e.type === "shoot"
          ? "shoot"
          : e.type === "launch" || e.type === "go_live"
            ? "launch"
            : e.type === "milestone"
              ? "deadline"
              : "reporting";
      events.push({
        id: `prod-${e.id}`,
        date: day(e.date),
        category,
        title: e.title,
        href: e.href,
        subtitle: e.clientName,
      });
    }

    for (const e of fin) {
      if (e.type === "invoice_due") continue; // Vertragsablaeufe, keine Rechnungen
      events.push({
        id: `fin-${e.id}`,
        date: day(e.date),
        category: "contract",
        title: e.title,
        href: e.href,
        subtitle: e.clientName,
      });
    }

    for (const t of (taskRes as { rows: TaskWithRelations[] }).rows) {
      if (!t.due_date) continue;
      events.push({
        id: `task-${t.id}`,
        date: day(t.due_date),
        category: "task",
        title: t.title,
        href: `/tasks/${t.id}`,
        subtitle: t.client?.name ?? null,
      });
    }

    for (const l of (leadRes as { rows: LeadWithRelations[] }).rows) {
      if (!l.next_action_date) continue;
      events.push({
        id: `lead-${l.id}`,
        date: day(l.next_action_date),
        category: "followup",
        title: `Follow-up: ${l.company_name}`,
        href: `/sales/leads/${l.id}`,
        subtitle: l.company_name,
      });
    }

    for (const m of meetings) {
      const md = day((m as { meeting_date?: string | null }).meeting_date);
      if (!md || md < from || md > to) continue;
      events.push({
        id: `meeting-${m.id}`,
        date: md,
        category: "meeting",
        title: (m as { title?: string | null }).title || "Termin",
        href: "/sales/meetings",
        subtitle: m.client?.name ?? m.lead?.company_name ?? null,
      });
    }

    return events.sort(
      (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
    );
  },
};
