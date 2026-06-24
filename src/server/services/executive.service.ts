import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { financeService } from "./finance.service";
import { salesDashboardService } from "./sales-dashboard.service";
import { clientsOpsService } from "./clients-ops.service";
import { productionDashboardService } from "./production-dashboard.service";
import { projectsService } from "./projects.service";
import { projectMilestonesService } from "./project-milestones.service";
import { healthFromIssues, alertSeverityRank } from "@/config/catalog";
import {
  executiveAlertInsertSchema,
  companyGoalInsertSchema,
  companyGoalUpdateSchema,
  type ExecutiveAlertCreateInput,
  type CompanyGoalCreateInput,
  type CompanyGoalUpdateInput,
} from "@/lib/validation/executive";
import type {
  ExecutiveDashboard,
  ComputedAlert,
  ExecutiveAlert,
  CompanyGoal,
  HealthRow,
  MorningBriefing,
  WeeklyReport,
  WorkloadRow,
  ProfileMini,
} from "@/types/entities";

const OVERLOAD_THRESHOLD = 8;

function chf(rappen: number): string {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(Math.round(rappen / 100));
}

export const executiveService = {
  async dashboard(): Promise<ExecutiveDashboard> {
    const [fin, sales, clients, prod, workload, clientStats] = await Promise.all([
      financeService.summary().catch(() => null),
      salesDashboardService.summary().catch(() => null),
      clientsOpsService.dashboard().catch(() => null),
      productionDashboardService.summary().catch(() => null),
      productionDashboardService.workload().catch((): WorkloadRow[] => []),
      clientsOpsService.listWithStats({}).catch(() => []),
    ]);

    const churnRisk = clientStats.filter(
      (c) =>
        c.status === "active" &&
        c.warnings.some((w) =>
          ["no_contact", "no_reporting", "contract_expiring"].includes(w.type),
        ),
    ).length;
    const overloaded = workload.filter((w) => w.openTasks >= OVERLOAD_THRESHOLD).length;
    const teamOpenTasks = workload.reduce((s, w) => s + w.openTasks, 0);

    const alerts: ComputedAlert[] = [];
    const push = (category: string, severity: string, title: string, href?: string) =>
      alerts.push({ category, severity, title, href });
    if ((fin?.overdueInvoicesCount ?? 0) > 0) push("finance", "high", `${fin!.overdueInvoicesCount} Rechnung(en) ueberfaellig`, "/finance/open");
    if ((clients?.contractsExpiring ?? 0) > 0) push("contract", "high", `${clients!.contractsExpiring} Vertrag/Vertraege laufen aus`, "/clients");
    if ((prod?.atRisk ?? 0) > 0) push("project", "high", `${prod!.atRisk} Projekt(e) mit Risiko`, "/production");
    if ((prod?.overdueTasks ?? 0) > 0) push("project", "medium", `${prod!.overdueTasks} ueberfaellige Aufgaben`, "/tasks/today");
    if (overloaded > 0) push("team", "high", `${overloaded} ueberlastete Mitarbeiter`, "/production/workload");
    if (churnRisk > 0) push("client", "high", `${churnRisk} Kunden mit Churn-Risiko`, "/clients");
    if ((sales?.followupsOverdue ?? 0) > 0) push("sales", "medium", `${sales!.followupsOverdue} Follow-ups ueberfaellig`, "/sales/followups");
    alerts.sort((a, b) => alertSeverityRank(a.severity) - alertSeverityRank(b.severity));

    return {
      revenue: {
        mrr: fin?.mrr ?? 0,
        arr: fin?.arr ?? 0,
        monthRevenue: fin?.monthRevenue ?? 0,
        yearRevenue: fin?.yearRevenue ?? 0,
        forecast3: fin?.forecast3Months ?? 0,
        forecast12: fin?.forecast12Months ?? 0,
      },
      sales: {
        leadsThisWeek: sales?.newLeads ?? 0,
        pipelineValue: sales?.pipelineValue ?? 0,
        openOffers: sales?.openOffers ?? 0,
        winRate: sales?.winRate ?? 0,
        hotLeads: sales?.hotLeads ?? 0,
      },
      clients: {
        active: clients?.active ?? 0,
        noContact: clients?.noContact ?? 0,
        contractsExpiring: clients?.contractsExpiring ?? 0,
        churnRisk,
      },
      production: {
        atRisk: prod?.atRisk ?? 0,
        overdue: prod?.overdueTasks ?? 0,
        openApprovals: prod?.openApprovals ?? 0,
        shootsThisWeek: prod?.shootsThisWeek ?? 0,
      },
      team: { openTasks: teamOpenTasks, overloaded, topLoad: workload.slice(0, 6) },
      alerts,
    };
  },

  /** Projekt-Health (Deadline-/Aufgaben-/Freigabe-Risiko). */
  async projectHealth(): Promise<HealthRow[]> {
    const [projects, overdueMs] = await Promise.all([
      projectsService.list().catch(() => []),
      projectMilestonesService.listOverdueOpen().catch(() => []),
    ]);
    const overdueByProject = new Set(overdueMs.map((m) => m.project_id));
    return projects
      .map((p): HealthRow => {
        const issues: string[] = [];
        if (overdueByProject.has(p.id)) issues.push("Ueberfaelliger Meilenstein");
        if (p.status === "on_hold") issues.push("Projekt pausiert");
        if (p.due_date && p.due_date < new Date().toISOString().slice(0, 10) && p.status !== "completed")
          issues.push("Deadline ueberschritten");
        const h = healthFromIssues(issues.length);
        return { id: p.id, name: p.title, status: h, issues };
      })
      .filter((r) => r.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 12);
  },

  /** Kunden-Health (aus den Customer-Success-Warnungen). */
  async clientHealth(): Promise<HealthRow[]> {
    const clients = await clientsOpsService.listWithStats({}).catch(() => []);
    return clients
      .filter((c) => c.status === "active")
      .map((c): HealthRow => {
        const issues = c.warnings.map((w) => w.label);
        return { id: c.id, name: c.name, status: healthFromIssues(issues.length), issues };
      })
      .filter((r) => r.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 12);
  },

  async morningBriefing(): Promise<MorningBriefing> {
    const d = await this.dashboard();
    return {
      headline: "Guten Morgen - hier ist dein Tagesbriefing.",
      numbers: [
        { label: "MRR", value: chf(d.revenue.mrr) },
        { label: "Umsatz Monat", value: chf(d.revenue.monthRevenue) },
        { label: "Pipeline", value: chf(d.sales.pipelineValue) },
        { label: "Aktive Kunden", value: String(d.clients.active) },
      ],
      risks: d.alerts.slice(0, 6).map((a) => a.title),
      hotLeads: [`${d.sales.hotLeads} heisse Leads`, `${d.sales.openOffers} offene Angebote`],
      problems: [
        d.clients.churnRisk > 0 ? `${d.clients.churnRisk} Kunden mit Churn-Risiko` : null,
        d.production.atRisk > 0 ? `${d.production.atRisk} Projekte mit Risiko` : null,
        d.production.openApprovals > 0 ? `${d.production.openApprovals} offene Freigaben` : null,
      ].filter((x): x is string => Boolean(x)),
    };
  },

  async weeklyReport(): Promise<WeeklyReport> {
    const d = await this.dashboard();
    return {
      headline: "Wochenrueckblick - eCreator",
      revenue: [
        { label: "MRR", value: chf(d.revenue.mrr) },
        { label: "ARR", value: chf(d.revenue.arr) },
        { label: "Umsatz Monat", value: chf(d.revenue.monthRevenue) },
        { label: "Forecast 3 Mt.", value: chf(d.revenue.forecast3) },
      ],
      highlights: [
        `${d.clients.active} aktive Kunden`,
        `${d.sales.hotLeads} heisse Leads, Pipeline ${chf(d.sales.pipelineValue)}`,
        `Abschlussquote ${d.sales.winRate}%`,
      ],
      risks: d.alerts.slice(0, 8).map((a) => a.title),
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Executive Alerts (gespeichert)                                             */
/* -------------------------------------------------------------------------- */
export const executiveAlertsService = {
  async list(resolved = false): Promise<ExecutiveAlert[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("executive_alerts")
      .select("*")
      .eq("resolved", resolved)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new ServiceError("Alerts konnten nicht geladen werden", error);
    return (data ?? []) as unknown as ExecutiveAlert[];
  },
  async create(input: ExecutiveAlertCreateInput): Promise<ExecutiveAlert> {
    const parsed = executiveAlertInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("executive_alerts").insert(parsed).select("*").single();
    if (error) throw new ServiceError("Alert konnte nicht erstellt werden", error);
    return data as unknown as ExecutiveAlert;
  },
  async resolve(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("executive_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new ServiceError("Alert konnte nicht erledigt werden", error);
    await recordAudit({ action: "resolve", entityType: "executive_alert", entityId: id });
  },
  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("executive_alerts").delete().eq("id", id);
    if (error) throw new ServiceError("Alert konnte nicht geloescht werden", error);
  },
};

/* -------------------------------------------------------------------------- */
/* Company Goals (KPI-Tracking)                                               */
/* -------------------------------------------------------------------------- */
export const companyGoalsService = {
  async list(): Promise<CompanyGoal[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("company_goals")
      .select("*, owner:profiles!company_goals_owner_id_fkey(id,full_name)")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw new ServiceError("Ziele konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
      const { owner, ...rest } = row as Record<string, unknown> & { owner?: unknown };
      return { ...(rest as object), owner: (owner as ProfileMini) ?? null } as CompanyGoal;
    });
  },
  async create(input: CompanyGoalCreateInput): Promise<CompanyGoal> {
    const parsed = companyGoalInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("company_goals").insert(parsed).select("*").single();
    if (error) throw new ServiceError("Ziel konnte nicht erstellt werden", error);
    return data as unknown as CompanyGoal;
  },
  async update(id: string, input: CompanyGoalUpdateInput): Promise<CompanyGoal> {
    const parsed = companyGoalUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("company_goals").update(parsed).eq("id", id).select("*").single();
    if (error) throw new ServiceError("Ziel konnte nicht aktualisiert werden", error);
    return data as unknown as CompanyGoal;
  },
  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("company_goals").delete().eq("id", id);
    if (error) throw new ServiceError("Ziel konnte nicht geloescht werden", error);
  },
};
