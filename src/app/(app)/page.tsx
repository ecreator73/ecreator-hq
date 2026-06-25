import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Flame,
  PhoneCall,
  Repeat2,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { roleLabel } from "@/config/roles";
import {
  tasksService,
  salesDashboardService,
  clientsOpsService,
  productionDashboardService,
  financeService,
  calendarService,
} from "@/server/services";
import { TaskList } from "@/components/tasks/task-list";
import { QuickCreate } from "@/components/tasks/quick-create";
import { LeadQuickCreate } from "@/components/sales/lead-quick-create";
import { ClientQuickCreate } from "@/components/clients/client-quick-create";
import { today } from "@/lib/dates";
import { formatCHF } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GrowthCommandCenter } from "@/components/growth-engine/growth-command-center";
import type { TaskWithRelations, FinanceSummary } from "@/types/entities";
import type {
  SalesDashboardData,
  GlobalCalendarEvent,
  ProductionSummary,
} from "@/server/services";

const FINANCE_ROLES = ["super_admin", "ceo", "finance"] as const;
const LEADERSHIP = ["super_admin", "ceo", "cso"] as const;

function StatCard({
  value,
  label,
  href,
  icon: Icon,
  tone,
}: {
  value: string | number;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "danger" | "default";
}) {
  return (
    <Link href={href} className="group">
      <Card className="transition-colors hover:border-brand-300">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className={`text-2xl font-semibold ${tone === "danger" && value ? "text-red-600" : "text-neutral-900"}`}>
              {value}
            </p>
            <p className="text-sm text-neutral-500">{label}</p>
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 group-hover:bg-brand-50 group-hover:text-brand-600">
            <Icon className="h-5 w-5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniList({
  title,
  href,
  events,
  empty,
}: {
  title: string;
  href: string;
  events: GlobalCalendarEvent[];
  empty: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Link href={href} className="text-xs font-medium text-brand-600 hover:underline">
          Alle
        </Link>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">{empty}</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {events.slice(0, 6).map((e) => (
              <li key={e.id}>
                <Link href={e.href} className="flex items-center gap-2 py-2 text-sm hover:text-brand-700">
                  <span className="flex-1 truncate font-medium text-neutral-800">{e.title}</span>
                  {e.subtitle ? <span className="shrink-0 text-xs text-neutral-400">{e.subtitle}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function HomePage() {
  const user = await requireUser();
  const firstName = user.fullName.split(/\s+/)[0] ?? user.fullName;
  const todayStr = today();

  let counts = { today: 0, overdue: 0, critical: 0, mine: 0 };
  let todayTasks: TaskWithRelations[] = [];
  try {
    counts = await tasksService.dashboardCounts(user.id);
    todayTasks = (
      await tasksService.list(
        { dueTo: todayStr, excludeStatus: ["done", "archived"] },
        { pageSize: 8, sort: { column: "due_date", ascending: true } },
      )
    ).rows;
  } catch {
    /* Demo-Modus */
  }

  let todayEvents: GlobalCalendarEvent[] = [];
  try {
    todayEvents = await calendarService.events(todayStr, todayStr);
  } catch {
    todayEvents = [];
  }
  const meetingsToday = todayEvents.filter((e) => e.category === "meeting");
  const followupsToday = todayEvents.filter((e) => e.category === "followup");

  let sales: SalesDashboardData | null = null;
  try {
    sales = await salesDashboardService.summary();
  } catch {
    sales = null;
  }

  let clientDash: Awaited<ReturnType<typeof clientsOpsService.dashboard>> | null = null;
  try {
    clientDash = await clientsOpsService.dashboard();
  } catch {
    clientDash = null;
  }

  let prod: ProductionSummary | null = null;
  try {
    prod = await productionDashboardService.safeSummary();
  } catch {
    prod = null;
  }

  const showFinance = canAccess(user.roles, [...FINANCE_ROLES]);
  let finance: FinanceSummary | null = null;
  if (showFinance) {
    try {
      finance = await financeService.summary();
    } catch {
      finance = null;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Home · Cockpit"
        title={`Willkommen zurueck, ${firstName}`}
        description="Dein Tag auf einen Blick: was heute ansteht und wo Prioritaet ist."
        actions={
          canAccess(user.roles, [...LEADERSHIP]) ? (
            <Link
              href="/executive"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-800"
            >
              Executive View
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />

      {/* Quick Actions */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <span className="mr-1 text-sm font-medium text-neutral-500">Schnell erstellen:</span>
          <QuickCreate variant="secondary" label="Aufgabe" />
          <LeadQuickCreate variant="secondary" label="Lead" />
          <ClientQuickCreate variant="secondary" label="Kunde" />
          <Link href="/calendar" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50">
            <CalendarDays className="h-4 w-4" />
            Kalender
          </Link>
        </CardContent>
      </Card>

      {canAccess(user.roles, [...LEADERSHIP]) ? <GrowthCommandCenter /> : null}

      {/* Heute auf einen Blick */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={counts.today} label="Aufgaben heute" href="/tasks/today" icon={CalendarClock} />
        <StatCard value={counts.overdue} label="Ueberfaellige Aufgaben" href="/tasks/today" icon={AlertTriangle} tone="danger" />
        <StatCard value={String(sales?.followupsToday ?? 0)} label="Follow-ups heute" href="/sales/followups" icon={Repeat2} />
        <StatCard value={String(clientDash?.reportingThisWeek ?? 0)} label="Reporting diese Woche" href="/clients/reporting" icon={PhoneCall} />
      </div>

      {/* Drei Spalten: heute */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-full">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-brand-600" />
              Aufgaben heute &amp; ueberfaellig
            </CardTitle>
            <Link href="/tasks" className="text-xs font-medium text-brand-600 hover:underline">Alle</Link>
          </CardHeader>
          <CardContent>
            <TaskList tasks={todayTasks} emptyTitle="Nichts faellig" emptyDescription="Keine faelligen Aufgaben." />
          </CardContent>
        </Card>
        <MiniList title="Meetings heute" href="/calendar?view=day" events={meetingsToday} empty="Keine Meetings heute." />
        <MiniList title="Follow-ups heute" href="/sales/followups" events={followupsToday} empty="Keine Follow-ups heute." />
      </div>

      {/* Sales */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Sales &amp; Pipeline</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard value={String(sales?.hotLeads ?? 0)} label="Heisse Leads" href="/sales/leads" icon={Flame} />
          <StatCard value={formatCHF(sales?.pipelineValue ?? 0)} label="Pipeline-Wert" href="/sales/pipeline" icon={ArrowRight} />
          <StatCard value={String(sales?.openOffers ?? 0)} label="Offene Angebote" href="/sales/offers" icon={ArrowRight} />
          <StatCard value={String(sales?.contractsExpiring ?? 0)} label="Vertraege laufen aus" href="/sales/contracts" icon={AlertTriangle} tone="danger" />
          <StatCard value={String(clientDash?.active ?? 0)} label="Aktive Kunden" href="/clients/list" icon={Users} />
        </div>
      </div>

      {/* Production */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Production</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard value={prod?.runningProjects ?? 0} label="Laufende Projekte" href="/production/projects" icon={ArrowRight} />
          <StatCard value={prod?.atRisk ?? 0} label="Kritische Projekte" href="/production/projects" icon={AlertTriangle} tone="danger" />
          <StatCard value={prod?.overdueTasks ?? 0} label="Ueberfaellige Aufgaben" href="/tasks/table" icon={Flame} tone="danger" />
          <StatCard value={prod?.shootsThisWeek ?? 0} label="Shootings diese Woche" href="/production/shoots" icon={CalendarDays} />
        </div>
      </div>

      {/* Finance (gated) */}
      {showFinance ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Finance</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard value={formatCHF(finance?.monthRevenue ?? 0)} label="Umsatz Monat" href="/finance" icon={ArrowRight} />
            <StatCard value={formatCHF(finance?.mrr ?? 0)} label="MRR" href="/finance/customers" icon={ArrowRight} />
            <StatCard value={String(finance?.openInvoicesCount ?? 0)} label="Offene Rechnungen" href="/finance/open" icon={ArrowRight} />
            <StatCard value={String(finance?.overdueInvoicesCount ?? 0)} label="Ueberfaellige Rechnungen" href="/finance/open" icon={AlertTriangle} tone="danger" />
          </div>
        </div>
      ) : null}

      {/* Identitaet */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-neutral-500">Angemeldet als</p>
            <p className="mt-0.5 text-base font-semibold text-neutral-900">{user.fullName}</p>
            <p className="text-sm text-neutral-500">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">Rolle:</span>
            <Badge tone="brand">{roleLabel(user.primaryRole)}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
