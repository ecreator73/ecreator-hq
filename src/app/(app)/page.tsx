import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Flame,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { roleLabel } from "@/config/roles";
import { MAIN_NAV } from "@/config/navigation";
import {
  tasksService,
  salesDashboardService,
  clientsOpsService,
  financeService,
} from "@/server/services";
import { TaskList } from "@/components/tasks/task-list";
import { today } from "@/lib/dates";
import { formatCHF } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GrowthCommandCenter } from "@/components/growth-engine/growth-command-center";
import type { TaskWithRelations, FinanceSummary } from "@/types/entities";
import type { SalesDashboardData } from "@/server/services";

const FINANCE_ROLES = ["super_admin", "ceo", "finance"] as const;

export default async function HomePage() {
  const user = await requireUser();
  const firstName = user.fullName.split(/\s+/)[0] ?? user.fullName;

  let counts = { today: 0, overdue: 0, critical: 0, mine: 0 };
  let todayTasks: TaskWithRelations[] = [];
  try {
    counts = await tasksService.dashboardCounts(user.id);
    todayTasks = (
      await tasksService.list(
        { dueTo: today(), excludeStatus: ["done", "archived"] },
        { pageSize: 8, sort: { column: "due_date", ascending: true } },
      )
    ).rows;
  } catch {
    // Demo-Modus / keine DB -> Nullwerte + leere Liste
  }

  let sales: SalesDashboardData | null = null;
  try {
    sales = await salesDashboardService.summary();
  } catch {
    sales = null;
  }
  const salesStats = [
    { label: "Follow-ups heute", value: String(sales?.followupsToday ?? 0), href: "/sales/followups" },
    { label: "Heisse Leads", value: String(sales?.hotLeads ?? 0), href: "/sales/leads" },
    { label: "Pipeline-Wert", value: formatCHF(sales?.pipelineValue ?? 0), href: "/sales/pipeline" },
    { label: "Offene Angebote", value: String(sales?.openOffers ?? 0), href: "/sales/offers" },
    { label: "Vertraege laufen aus", value: String(sales?.contractsExpiring ?? 0), href: "/sales/contracts" },
  ];

  let clientDash: Awaited<ReturnType<typeof clientsOpsService.dashboard>> | null = null;
  try {
    clientDash = await clientsOpsService.dashboard();
  } catch {
    clientDash = null;
  }
  const clientStats = [
    { label: "Aktive Kunden", value: String(clientDash?.active ?? 0), href: "/clients/list" },
    { label: "MRR", value: formatCHF(clientDash?.totalMrr ?? 0), href: "/clients" },
    { label: "Reporting diese Woche", value: String(clientDash?.reportingThisWeek ?? 0), href: "/clients/reporting" },
    { label: "Kunden ohne Kontakt", value: String(clientDash?.noContact ?? 0), href: "/clients" },
    { label: "Offene Aufgaben (Kunden)", value: String(clientDash?.withOpenTasks ?? 0), href: "/clients" },
  ];

  // Finance-Widgets nur fuer berechtigte Rollen (super_admin/ceo/finance).
  const showFinance = canAccess(user.roles, [...FINANCE_ROLES]);
  let finance: FinanceSummary | null = null;
  if (showFinance) {
    try {
      finance = await financeService.summary();
    } catch {
      finance = null;
    }
  }
  const financeStats = [
    { label: "Umsatz Monat", value: formatCHF(finance?.monthRevenue ?? 0), href: "/finance" },
    { label: "MRR", value: formatCHF(finance?.mrr ?? 0), href: "/finance" },
    { label: "Offene Rechnungen", value: String(finance?.openInvoicesCount ?? 0), href: "/finance/open" },
    { label: "Ueberfaellige Rechnungen", value: String(finance?.overdueInvoicesCount ?? 0), href: "/finance/open" },
  ];

  const stats = [
    { label: "Heute faellig", value: counts.today, href: "/tasks/today", icon: CalendarClock },
    { label: "Ueberfaellig", value: counts.overdue, href: "/tasks/today", icon: AlertTriangle },
    { label: "Kritisch", value: counts.critical, href: "/tasks/table?priority=urgent", icon: Flame },
    { label: "Meine Aufgaben", value: counts.mine, href: "/tasks/mine", icon: UserRound },
  ];

  const quickAccess = MAIN_NAV.filter(
    (item) => item.href !== "/" && canAccess(user.roles, item.roles),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Home · Command Center"
        title={`Willkommen zurueck, ${firstName}`}
        description="Was muss heute gemacht werden?"
        actions={
          canAccess(user.roles, ["super_admin", "ceo", "cso"]) ? (
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

      {/* Growth Command Center (Executive-Schicht, nur super_admin/ceo/cso) */}
      {canAccess(user.roles, ["super_admin", "ceo", "cso"]) ? (
        <GrowthCommandCenter />
      ) : null}

      {/* Aufgaben-Widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="group">
              <Card className="transition-colors hover:border-brand-300">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-2xl font-semibold text-neutral-900">
                      {s.value}
                    </p>
                    <p className="text-sm text-neutral-500">{s.label}</p>
                  </div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 group-hover:bg-brand-50 group-hover:text-brand-600">
                    <Icon className="h-5 w-5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Sales auf einen Blick */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">
          Sales auf einen Blick
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {salesStats.map((s) => (
            <Link key={s.label} href={s.href} className="group">
              <Card className="transition-colors hover:border-brand-300">
                <CardContent className="p-5">
                  <p className="text-xl font-semibold text-neutral-900">
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-500">{s.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Customer Success auf einen Blick */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">
          Customer Success
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {clientStats.map((s) => (
            <Link key={s.label} href={s.href} className="group">
              <Card className="transition-colors hover:border-brand-300">
                <CardContent className="p-5">
                  <p className="text-xl font-semibold text-neutral-900">
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-500">{s.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Finance auf einen Blick (nur berechtigte Rollen) */}
      {showFinance ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Finance
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {financeStats.map((s) => (
              <Link key={s.label} href={s.href} className="group">
                <Card className="transition-colors hover:border-brand-300">
                  <CardContent className="p-5">
                    <p className="text-xl font-semibold text-neutral-900">
                      {s.value}
                    </p>
                    <p className="mt-0.5 text-sm text-neutral-500">{s.label}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Heute & ueberfaellig */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-600" />
            Heute &amp; ueberfaellig
          </CardTitle>
          <Link
            href="/tasks"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Alle Aufgaben
          </Link>
        </CardHeader>
        <CardContent>
          <TaskList
            tasks={todayTasks}
            emptyTitle="Nichts faellig"
            emptyDescription="Aktuell stehen keine faelligen oder ueberfaelligen Aufgaben an."
          />
        </CardContent>
      </Card>

      {/* Identitaet */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm text-neutral-500">Angemeldet als</p>
            <p className="mt-0.5 text-base font-semibold text-neutral-900">
              {user.fullName}
            </p>
            <p className="text-sm text-neutral-500">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">Rolle:</span>
            <Badge tone="brand">{roleLabel(user.primaryRole)}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Schnellzugriff */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">
          Schnellzugriff
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickAccess.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group">
                <Card className="h-full transition-colors hover:border-brand-300">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-neutral-900">
                        {item.label}
                        <ArrowRight className="h-3.5 w-3.5 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
