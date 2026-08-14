import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Factory,
  FileSignature,
  Flame,
  ListChecks,
  Radar,
  Repeat2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import {
  tasksService,
  salesDashboardService,
  clientsOpsService,
  productionDashboardService,
  financeService,
  calendarService,
  notificationsService,
  projectMilestonesService,
} from "@/server/services";
import { QuickCreate } from "@/components/tasks/quick-create";
import { LeadQuickCreate } from "@/components/sales/lead-quick-create";
import { ClientQuickCreate } from "@/components/clients/client-quick-create";
import { today } from "@/lib/dates";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  TaskWithRelations,
  FinanceSummary,
  Contract,
  ProjectMilestone,
} from "@/types/entities";
import type {
  SalesDashboardData,
  GlobalCalendarEvent,
  ProductionSummary,
} from "@/server/services";

const FINANCE_ROLES = ["super_admin", "ceo", "finance"] as const;
const SALES_ROLES = ["super_admin", "ceo", "cso", "sales"] as const;
const LEADERSHIP = ["super_admin", "ceo", "cso"] as const;

/** Wochentage ohne Umlaute - fuer die Datumszeile in der Begruessung. */
const WEEKDAYS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
] as const;

type IconType = React.ComponentType<{ className?: string }>;

/* -------------------------------------------------------------------------
 * Bausteine (nur auf dieser Seite verwendet)
 * ---------------------------------------------------------------------- */

/** Kachel der Schnellzugriff-Leiste. */
function QuickTile({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  icon: IconType;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
    >
      <Icon className="h-4 w-4 text-neutral-400 group-hover:text-brand-600" />
      {label}
      {badge ? <Badge tone="brand">{badge}</Badge> : null}
    </Link>
  );
}

/** Grosse Kennzahl - immer anklickbar. */
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
  icon: IconType;
  tone?: "danger";
}) {
  const alert = tone === "danger" && Number(value) > 0;
  return (
    <Link href={href} className="group block">
      <Card className="transition-colors hover:border-brand-300">
        <CardContent className="flex items-center justify-between p-5">
          <div className="min-w-0">
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                alert ? "text-red-600" : "text-neutral-900",
              )}
            >
              {value}
            </p>
            <p className="text-sm text-neutral-500">{label}</p>
          </div>
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              alert
                ? "bg-red-50 text-red-500"
                : "bg-neutral-100 text-neutral-500 group-hover:bg-brand-50 group-hover:text-brand-600",
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

interface ListItem {
  id: string;
  title: string;
  meta?: string | null;
  href: string;
  danger?: boolean;
}

/** Kompakte Liste mit Anzahl im Titel, max. 5 Eintraegen und Link zur Vollansicht. */
function ListCard({
  title,
  icon: Icon,
  count,
  href,
  linkLabel = "Alle ansehen",
  items,
  empty,
}: {
  title: string;
  icon: IconType;
  count: number;
  href: string;
  linkLabel?: string;
  items: ListItem[];
  empty: string;
}) {
  const shown = items.slice(0, 5);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-brand-600" />
          {title}
          <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-600">
            {count}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {shown.length === 0 ? (
          <p className="flex flex-1 items-center justify-center gap-2 py-6 text-sm text-neutral-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            {empty}
          </p>
        ) : (
          <ul className="flex-1 divide-y divide-neutral-100">
            {shown.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2 py-2 text-sm hover:text-brand-700"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-neutral-800">
                    {item.title}
                  </span>
                  {item.meta ? (
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        item.danger ? "font-medium text-red-600" : "text-neutral-400",
                      )}
                    >
                      {item.meta}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

/** Bereichs-Karte: 2-3 Zahlen + Link in den Bereich. */
function SectionCard({
  title,
  description,
  href,
  icon: Icon,
  stats,
}: {
  title: string;
  description: string;
  href: string;
  icon: IconType;
  stats: Array<{ label: string; value: string | number; tone?: "danger" }>;
}) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="flex h-full flex-col transition-colors hover:border-brand-300">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 group-hover:bg-brand-50 group-hover:text-brand-600">
              <Icon className="h-4 w-4" />
            </span>
            {title}
          </CardTitle>
          <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-brand-600" />
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <p className="mb-4 text-sm text-neutral-500">{description}</p>
          <div className="mt-auto grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0">
                <p
                  className={cn(
                    "truncate text-lg font-semibold tabular-nums",
                    s.tone === "danger" && Number(s.value) > 0
                      ? "text-red-600"
                      : "text-neutral-900",
                  )}
                >
                  {s.value}
                </p>
                <p className="text-xs text-neutral-500">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* -------------------------------------------------------------------------
 * Seite
 * ---------------------------------------------------------------------- */

export default async function HomePage() {
  const user = await requireUser();
  const firstName = user.fullName.split(/\s+/)[0] ?? user.fullName;
  const todayStr = today();
  const now = new Date();
  const dateLine = `${WEEKDAYS[now.getDay()]}, ${formatDate(now)}`;

  const showSales = canAccess(user.roles, [...SALES_ROLES]);
  const showFinance = canAccess(user.roles, [...FINANCE_ROLES]);
  const showExecutive = canAccess(user.roles, [...LEADERSHIP]);

  // Alle Bloecke sind unabhaengig -> EIN paralleler Abruf statt vieler
  // sequenzieller Roundtrips. Fallback pro Promise, damit ein fehlendes
  // Modul die Startseite nie blockiert.
  const [
    counts,
    todayTasks,
    todayEvents,
    sales,
    clientDash,
    prod,
    finance,
    unread,
    overdueMilestones,
    expiringContracts,
  ] = await Promise.all([
    tasksService
      .dashboardCounts(user.id)
      .catch(() => ({ today: 0, overdue: 0, critical: 0, mine: 0 })),
    tasksService
      .list(
        { dueTo: todayStr, excludeStatus: ["done", "archived"] },
        { pageSize: 5, sort: { column: "due_date", ascending: true } },
      )
      .then((r) => ({ rows: r.rows as TaskWithRelations[], total: r.total }))
      .catch(() => ({ rows: [] as TaskWithRelations[], total: 0 })),
    calendarService.events(todayStr, todayStr).catch(() => [] as GlobalCalendarEvent[]),
    salesDashboardService.summary().catch(() => null as SalesDashboardData | null),
    clientsOpsService.dashboard().catch(() => null),
    productionDashboardService.safeSummary().catch(() => null as ProductionSummary | null),
    showFinance
      ? financeService.summary().catch(() => null as FinanceSummary | null)
      : Promise.resolve(null as FinanceSummary | null),
    notificationsService.unreadCount().catch(() => 0),
    projectMilestonesService.listOverdueOpen().catch(() => [] as ProjectMilestone[]),
    showSales
      ? salesDashboardService.contractsExpiring(30).catch(() => [] as Contract[])
      : Promise.resolve([] as Contract[]),
  ]);

  const meetingsToday = todayEvents.filter((e) => e.category === "meeting");
  const followupsToday = todayEvents.filter((e) => e.category === "followup");

  const taskItems: ListItem[] = todayTasks.rows.map((t) => {
    const overdue = Boolean(t.due_date && t.due_date < todayStr);
    return {
      id: t.id,
      title: t.title,
      meta: overdue
        ? `ueberfaellig seit ${formatDate(t.due_date as string)}`
        : (t.client?.name ?? t.assignee?.full_name ?? null),
      href: `/tasks/${t.id}`,
      danger: overdue,
    };
  });

  const eventItems = (events: GlobalCalendarEvent[]): ListItem[] =>
    events.map((e) => ({
      id: e.id,
      title: e.title,
      meta: e.subtitle,
      href: e.href,
    }));

  const milestoneItems: ListItem[] = overdueMilestones.map((m) => ({
    id: m.id,
    title: m.title,
    meta: m.due_date ? `faellig war ${formatDate(m.due_date)}` : null,
    href: "/production/projects",
    danger: true,
  }));

  const contractItems: ListItem[] = expiringContracts.map((c) => ({
    id: c.id,
    title: c.title,
    meta: c.end_date ? `laeuft aus am ${formatDate(c.end_date)}` : null,
    href: "/sales/contracts",
  }));

  const followupsOpen =
    (sales?.followupsToday ?? 0) + (sales?.followupsOverdue ?? 0);

  return (
    <div className="space-y-6">
      {/* 1) Begruessung */}
      <PageHeader
        title={`Willkommen zurueck, ${firstName}`}
        description={dateLine}
        actions={
          showExecutive ? (
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

      {/* 2) Schnellzugriff */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <QuickTile href="/calendar" icon={CalendarDays} label="Kalender" />
          <QuickTile href="/tasks/mine" icon={ListChecks} label="Meine Aufgaben" />
          <QuickTile href="/tasks/today" icon={CalendarCheck} label="Heute faellig" />
          <QuickTile
            href="/notifications"
            icon={Bell}
            label="Benachrichtigungen"
            badge={unread}
          />
          <span className="mx-1 hidden h-6 w-px bg-neutral-200 sm:block" />
          <span className="text-sm font-medium text-neutral-500">Neu:</span>
          <QuickCreate variant="secondary" label="Aufgabe" />
          <LeadQuickCreate variant="secondary" label="Lead" />
          <ClientQuickCreate variant="secondary" label="Kunde" />
        </CardContent>
      </Card>

      {/* 3) Dein Tag */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Dein Tag</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <ListCard
            title="Aufgaben heute"
            icon={ListChecks}
            count={todayTasks.total}
            href="/tasks/today"
            items={taskItems}
            empty="Nichts offen - sauber!"
          />
          <ListCard
            title="Termine heute"
            icon={CalendarDays}
            count={meetingsToday.length}
            href="/calendar"
            items={eventItems(meetingsToday)}
            empty="Keine Termine heute."
          />
          <ListCard
            title="Follow-ups heute"
            icon={Repeat2}
            count={followupsToday.length}
            href={showSales ? "/sales/followups" : "/calendar"}
            items={eventItems(followupsToday)}
            empty="Nichts offen - sauber!"
          />
        </div>
      </div>

      {/* 4) Kennzahlen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={counts.mine}
          label="Meine offenen Aufgaben"
          href="/tasks/mine"
          icon={ListChecks}
        />
        <StatCard
          value={counts.overdue}
          label="Ueberfaellige Aufgaben"
          href="/tasks/today"
          icon={AlertTriangle}
          tone="danger"
        />
        {showSales ? (
          <>
            <StatCard
              value={sales?.newLeads ?? 0}
              label="Neue Leads"
              href="/sales/leads"
              icon={Radar}
            />
            <StatCard
              value={sales?.hotLeads ?? 0}
              label="Heisse Leads"
              href="/sales/leads"
              icon={Flame}
            />
          </>
        ) : (
          <>
            <StatCard
              value={counts.today}
              label="Heute faellig"
              href="/tasks/today"
              icon={CalendarCheck}
            />
            <StatCard
              value={meetingsToday.length}
              label="Termine heute"
              href="/calendar"
              icon={CalendarDays}
            />
          </>
        )}
      </div>

      {/* 5) Bereichs-Ueberblick */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">
          Deine Bereiche
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {showSales ? (
            <SectionCard
              title="Leads"
              description="Neue Kontakte gewinnen und dranbleiben."
              href="/leads"
              icon={Radar}
              stats={[
                { label: "Neue Leads", value: sales?.newLeads ?? 0 },
                { label: "Heisse Leads", value: sales?.hotLeads ?? 0 },
                { label: "Follow-ups offen", value: followupsOpen },
              ]}
            />
          ) : null}
          {showSales ? (
            <SectionCard
              title="Sales"
              description="Angebote schreiben und Abschluesse machen."
              href="/sales"
              icon={TrendingUp}
              stats={[
                { label: "Offene Angebote", value: sales?.openOffers ?? 0 },
                { label: "Pipeline-Wert", value: formatCHF(sales?.pipelineValue ?? 0) },
                {
                  label: "Vertraege laufen aus",
                  value: sales?.contractsExpiring ?? 0,
                  tone: "danger",
                },
              ]}
            />
          ) : null}
          <SectionCard
            title="Kunden"
            description="Bestandskunden betreuen und Reportings halten."
            href="/clients"
            icon={Users}
            stats={[
              { label: "Aktive Kunden", value: clientDash?.active ?? 0 },
              {
                label: "Ohne Kontakt",
                value: clientDash?.noContact ?? 0,
                tone: "danger",
              },
              { label: "Reporting diese Woche", value: clientDash?.reportingThisWeek ?? 0 },
            ]}
          />
          <SectionCard
            title="Production"
            description="Projekte liefern und Termine halten."
            href="/production"
            icon={Factory}
            stats={[
              { label: "Laufende Projekte", value: prod?.runningProjects ?? 0 },
              { label: "Kritische Projekte", value: prod?.atRisk ?? 0, tone: "danger" },
              { label: "Shootings diese Woche", value: prod?.shootsThisWeek ?? 0 },
            ]}
          />
          {showFinance ? (
            <SectionCard
              title="Finance"
              description="Umsatz, Rechnungen und offene Posten."
              href="/finance"
              icon={Wallet}
              stats={[
                { label: "MRR", value: formatCHF(finance?.mrr ?? 0) },
                { label: "Offene Rechnungen", value: finance?.openInvoicesCount ?? 0 },
                {
                  label: "Ueberfaellige Rechnungen",
                  value: finance?.overdueInvoicesCount ?? 0,
                  tone: "danger",
                },
              ]}
            />
          ) : null}
        </div>
      </div>

      {/* 6) Was Aufmerksamkeit braucht (nur wenn es etwas gibt) */}
      {milestoneItems.length > 0 || contractItems.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Braucht Aufmerksamkeit
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {milestoneItems.length > 0 ? (
              <ListCard
                title="Kritische Projekte"
                icon={AlertTriangle}
                count={milestoneItems.length}
                href="/production/projects"
                linkLabel="Zu den Projekten"
                items={milestoneItems}
                empty="Alles im Plan."
              />
            ) : null}
            {contractItems.length > 0 ? (
              <ListCard
                title="Vertraege laufen aus"
                icon={FileSignature}
                count={contractItems.length}
                href="/sales/contracts"
                linkLabel="Zu den Vertraegen"
                items={contractItems}
                empty="Keine Vertraege laufen aus."
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
