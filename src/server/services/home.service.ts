import { getContext } from "./_helpers";
import { tasksService } from "./tasks.service";
import { calendarService, type GlobalCalendarEvent } from "./calendar.service";
import { LEAD_STATUSES } from "@/config/catalog";

/**
 * Daten fuer das Home-Dashboard: eine priorisierte Tagesliste («Jetzt dran»),
 * der Lead-Fluss (Leads je Status), neue Leads und eine 7-Tage-Vorschau.
 * Liest mit der Session (RLS). Jeder Block faellt einzeln weich aus.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AgendaKind = "task" | "followup" | "meeting" | "shoot" | "deadline" | "reporting" | "contract" | "launch";

export interface AgendaItem {
  id: string;
  kind: AgendaKind;
  title: string;
  context: string | null;
  href: string;
  /** Tage ueberfaellig (>0) oder 0 = heute */
  overdueDays: number;
  owner: string | null;
  mine: boolean;
  /** nur bei «Demnaechst»: YYYY-MM-DD */
  date?: string;
}

export interface LeadFlowStage {
  key: string;
  label: string;
  count: number;
}

export interface NewLead {
  id: string;
  name: string;
  company: string | null;
  source: string | null;
  campaign: string | null;
  status: string | null;
  created_at: string;
}

export interface WeekDay {
  date: string;
  counts: Partial<Record<GlobalCalendarEvent["category"], number>>;
  total: number;
}

const ACTIVE_FLOW = ["neu", "nicht_erreicht", "mehrfach_nicht_erreicht", "followup", "mail_gesendet", "termin_gebucht", "vertrag_mail"];
const DONE = ["abgeschlossen"];
const OUT = ["absage", "fehleintrag", "andere", "massenmail"];
const NOT_OPEN = [...DONE, ...OUT];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => isoDay(new Date(Date.parse(`${s}T00:00:00Z`) + n * 86_400_000));
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export const homeService = {
  async load(userId: string, today: string) {
    const { supabase } = await getContext();
    const weekEnd = addDays(today, 6);
    const since7 = addDays(today, -6);
    const since14 = addDays(today, -13);

    const [statusRes, leadRows, followRes, newRes, taskRes, events, prevWeekRes] = await Promise.all([
      supabase.from("statuses").select("id, key").eq("entity_type", "lead"),
      supabase.from("leads").select("status_id, next_action_date").is("deleted_at", null),
      supabase
        .from("leads")
        .select("id, contact_name, company_name, next_action_date, owner_id, status:statuses!leads_status_id_fkey(key,label), owner:profiles!leads_owner_id_fkey(full_name)")
        .is("deleted_at", null)
        .lte("next_action_date", today)
        .order("next_action_date", { ascending: true })
        .limit(200),
      supabase
        .from("leads")
        .select("id, contact_name, company_name, source, campaign_name, created_at, status:statuses!leads_status_id_fkey(label)", { count: "exact" })
        .is("deleted_at", null)
        .gte("created_at", `${since7}T00:00:00`)
        .order("created_at", { ascending: false })
        .limit(50),
      tasksService
        .list({ dueTo: today, excludeStatus: ["done", "archived"] }, { pageSize: 50, sort: { column: "due_date", ascending: true } })
        .catch(() => ({ rows: [], total: 0 })),
      calendarService.events(today, weekEnd).catch(() => [] as GlobalCalendarEvent[]),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .gte("created_at", `${since14}T00:00:00`)
        .lt("created_at", `${since7}T00:00:00`),
    ]);

    // Lead-Fluss
    const keyById = new Map(((statusRes.data ?? []) as Array<{ id: string; key: string }>).map((s) => [s.id, s.key]));
    const counts = new Map<string, number>();
    let withoutNext = 0;
    for (const r of (leadRows.data ?? []) as Array<{ status_id: string; next_action_date: string | null }>) {
      const k = keyById.get(r.status_id) ?? "andere";
      counts.set(k, (counts.get(k) ?? 0) + 1);
      if (ACTIVE_FLOW.includes(k) && !r.next_action_date) withoutNext++;
    }
    const label = (k: string) => LEAD_STATUSES.find((s) => s.key === k)?.label ?? k;
    const stage = (k: string): LeadFlowStage => ({ key: k, label: label(k), count: counts.get(k) ?? 0 });
    const flow = {
      active: ACTIVE_FLOW.map(stage),
      won: stage("abgeschlossen"),
      out: OUT.map(stage),
      total: [...counts.values()].reduce((a, b) => a + b, 0),
    };

    // Agenda
    const agenda: AgendaItem[] = [];
    for (const t of (taskRes.rows ?? []) as any[]) {
      agenda.push({
        id: `t-${t.id}`,
        kind: "task",
        title: t.title,
        context: t.client?.name ?? t.project?.name ?? null,
        href: `/tasks/${t.id}`,
        overdueDays: t.due_date ? Math.max(0, daysBetween(t.due_date, today)) : 0,
        owner: t.assignee?.full_name ?? null,
        mine: t.assigned_to === userId,
      });
    }
    for (const l of (followRes.data ?? []) as any[]) {
      if (NOT_OPEN.includes(l.status?.key)) continue;
      agenda.push({
        id: `f-${l.id}`,
        kind: "followup",
        title: l.contact_name || l.company_name,
        context: [l.company_name && l.company_name !== l.contact_name ? l.company_name : null, l.status?.label].filter(Boolean).join(" · ") || null,
        href: `/sales/leads/${l.id}`,
        overdueDays: Math.max(0, daysBetween(l.next_action_date, today)),
        owner: l.owner?.full_name ?? null,
        mine: l.owner_id === userId,
      });
    }
    const KIND: Partial<Record<GlobalCalendarEvent["category"], AgendaKind>> = {
      meeting: "meeting",
      shoot: "shoot",
      deadline: "deadline",
      reporting: "reporting",
      contract: "contract",
      launch: "launch",
    };
    for (const e of events) {
      if (e.date !== today) continue;
      const kind = KIND[e.category];
      if (!kind) continue; // Aufgaben und Follow-ups kommen oben aus der Quelle
      agenda.push({ id: `e-${e.id}`, kind, title: e.title, context: e.subtitle, href: e.href, overdueDays: 0, owner: null, mine: false });
    }
    // Ueberfaellig zuerst (aelteste oben), dann Termine, dann der Rest
    const order: Record<AgendaKind, number> = { meeting: 0, shoot: 1, followup: 2, task: 3, reporting: 4, deadline: 5, contract: 6, launch: 7 };
    agenda.sort((a, b) => b.overdueDays - a.overdueDays || order[a.kind] - order[b.kind]);

    // Demnaechst (naechste 6 Tage, ohne heute) - fuer ruhige Tage
    const upcoming: AgendaItem[] = events
      .filter((e) => e.date > today && KIND[e.category])
      .slice(0, 6)
      .map((e) => ({ id: `u-${e.id}`, kind: KIND[e.category]!, title: e.title, context: e.subtitle, href: e.href, overdueDays: 0, owner: null, mine: false, date: e.date }));

    // Woche
    const week: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      const dayEvents = events.filter((e) => e.date === date);
      const c: WeekDay["counts"] = {};
      for (const e of dayEvents) c[e.category] = (c[e.category] ?? 0) + 1;
      week.push({ date, counts: c, total: dayEvents.length });
    }

    const newLeads: NewLead[] = ((newRes.data ?? []) as any[]).map((l) => ({
      id: l.id,
      name: l.contact_name || l.company_name,
      company: l.company_name && l.company_name !== l.contact_name ? l.company_name : null,
      source: l.source,
      campaign: l.campaign_name,
      status: l.status?.label ?? null,
      created_at: l.created_at,
    }));

    return {
      flow,
      agenda,
      week,
      newLeads,
      newLeads7: newRes.count ?? newLeads.length,
      newLeadsPrev7: prevWeekRes.count ?? null,
      uncontacted: counts.get("neu") ?? 0,
      withoutNext,
      upcoming,
      meetingsWeek: events.filter((e) => e.category === "meeting").length,
    };
  },
};

export type HomeData = Awaited<ReturnType<typeof homeService.load>>;
