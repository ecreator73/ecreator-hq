import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import {
  productionDashboardService,
  approvalsService,
  shootsService,
  websiteProjectsService,
  crmProjectsService,
  type ProductionSummary,
} from "@/server/services";
import type {
  ApprovalWithRelations,
  ShootWithRelations,
  WebsiteProjectWithRelations,
  CrmProjectWithRelations,
} from "@/types/entities";
import {
  statusLabel,
  SHOOT_STATUSES,
  WEBSITE_PROJECT_STATUSES,
  CRM_PROJECT_STATUSES,
  APPROVAL_STATUSES,
} from "@/config/catalog";
import { cn } from "@/lib/utils";
import { today, isoDay, addDays, weekRange } from "@/lib/dates";

export const metadata: Metadata = { title: "Production - Dashboard" };

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

type WidgetTone = "neutral" | "brand" | "amber" | "green" | "red";

const TONE_STYLES: Record<WidgetTone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-700",
  amber: "text-amber-600",
  green: "text-green-600",
  red: "text-red-600",
};

function Widget({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: WidgetTone;
}) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          TONE_STYLES[tone],
        )}
      >
        {value}
      </p>
    </>
  );
  const base =
    "block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm";
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "transition-colors hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

function shootColor(status: string): string | undefined {
  return SHOOT_STATUSES.find((s) => s.key === status)?.color;
}

function websiteColor(status: string): string | undefined {
  return WEBSITE_PROJECT_STATUSES.find((s) => s.key === status)?.color;
}

function crmColor(status: string): string | undefined {
  return CRM_PROJECT_STATUSES.find((s) => s.key === status)?.color;
}

function approvalColor(status: string): string | undefined {
  return APPROVAL_STATUSES.find((s) => s.key === status)?.color;
}

function clientLink(client: { id: string; name: string } | null) {
  if (!client) {
    return <span className="text-neutral-400">Kein Kunde</span>;
  }
  return (
    <Link
      href={`/clients/${client.id}`}
      className="text-neutral-600 hover:text-brand-700"
    >
      {client.name}
    </Link>
  );
}

export default async function ProductionDashboardPage() {
  const s = await productionDashboardService
    .safeSummary()
    .catch(() => EMPTY_SUMMARY);

  const week = weekRange();

  let openApprovals: ApprovalWithRelations[] = [];
  try {
    openApprovals = await approvalsService.list({ status: "open" });
  } catch {
    openApprovals = [];
  }

  let weekShoots: ShootWithRelations[] = [];
  try {
    weekShoots = await shootsService.list({
      from: week.from,
      to: week.to,
      statusIn: ["planned", "confirmed"],
    });
  } catch {
    weekShoots = [];
  }

  const t = today();
  let overdueLaunches: WebsiteProjectWithRelations[] = [];
  try {
    const websites = await websiteProjectsService.list();
    overdueLaunches = websites.filter(
      (w) =>
        w.launch_date != null &&
        w.launch_date < t &&
        w.status !== "completed",
    );
  } catch {
    overdueLaunches = [];
  }

  const in7 = isoDay(addDays(new Date(), 7));
  let crmGoLives: CrmProjectWithRelations[] = [];
  try {
    const crm = await crmProjectsService.list();
    crmGoLives = crm.filter(
      (c) =>
        c.go_live_date != null &&
        c.go_live_date >= t &&
        c.go_live_date <= in7 &&
        c.status !== "live",
    );
  } catch {
    crmGoLives = [];
  }

  return (
    <div className="space-y-6">
      {/* KPI-Widgets */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Widget
          label="Laufende Projekte"
          value={s.runningProjects}
          href="/production/websites"
          tone="brand"
        />
        <Widget
          label="Projekte mit Risiko"
          value={s.atRisk}
          tone={s.atRisk > 0 ? "red" : "neutral"}
        />
        <Widget
          label="Ueberfaellige Aufgaben"
          value={s.overdueTasks}
          href="/tasks/today"
          tone={s.overdueTasks > 0 ? "red" : "neutral"}
        />
        <Widget
          label="Shootings diese Woche"
          value={s.shootsThisWeek}
          href="/production/shoots"
          tone={s.shootsThisWeek > 0 ? "amber" : "neutral"}
        />
        <Widget
          label="Launches diese Woche"
          value={s.launchesThisWeek}
          href="/production/websites"
          tone={s.launchesThisWeek > 0 ? "green" : "neutral"}
        />
        <Widget
          label="Offene Freigaben"
          value={s.openApprovals}
          href="/production/assets"
          tone={s.openApprovals > 0 ? "amber" : "neutral"}
        />
        <Widget
          label="Content Produktionen"
          value={s.contentProductions}
          href="/production/content"
        />
        <Widget
          label="CRM Go-Lives"
          value={s.crmGoLives}
          href="/production/crm"
        />
      </div>

      {/* Produktions-Alerts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Offene Freigaben */}
        <Card>
          <CardHeader>
            <CardTitle>Offene Freigaben ({openApprovals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {openApprovals.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Keine offenen Freigaben"
                description="Aktuell wartet kein Asset auf eine Kunden-Freigabe."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {openApprovals.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href="/production/assets"
                        className="block truncate text-sm font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {a.title}
                      </Link>
                      <div className="mt-0.5 text-xs">
                        {clientLink(a.client)}
                      </div>
                    </div>
                    <StatusBadge
                      label={statusLabel("approval", a.status)}
                      color={approvalColor(a.status)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Shootings diese Woche */}
        <Card>
          <CardHeader>
            <CardTitle>Shootings diese Woche ({weekShoots.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {weekShoots.length === 0 ? (
              <EmptyState
                title="Keine Shootings"
                description="Diese Woche sind keine geplanten oder bestaetigten Drehs vorhanden."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {weekShoots.map((sh) => (
                  <li
                    key={sh.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href="/production/shoots"
                        className="block truncate text-sm font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {sh.title}
                      </Link>
                      <div className="mt-0.5 text-xs">
                        {clientLink(sh.client)}
                      </div>
                    </div>
                    <StatusBadge
                      label={statusLabel("shoot", sh.status)}
                      color={shootColor(sh.status)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Ueberfaellige Launches */}
        <Card>
          <CardHeader>
            <CardTitle>
              Ueberfaellige Launches ({overdueLaunches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueLaunches.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Keine ueberfaelligen Launches"
                description="Alle geplanten Website-Launches liegen im Zeitplan."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {overdueLaunches.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/production/websites/${w.id}`}
                        className="block truncate text-sm font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {w.title}
                      </Link>
                      <div className="mt-0.5 text-xs">
                        {clientLink(w.client)}
                      </div>
                    </div>
                    <StatusBadge
                      label={statusLabel("website_project", w.status)}
                      color={websiteColor(w.status)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* CRM Go-Lives <= 7 Tage */}
        <Card>
          <CardHeader>
            <CardTitle>
              CRM Go-Lives (naechste 7 Tage) ({crmGoLives.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {crmGoLives.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Keine Go-Lives"
                description="In den naechsten 7 Tagen steht kein CRM Go-Live an."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {crmGoLives.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/production/crm/${c.id}`}
                        className="block truncate text-sm font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {c.title}
                      </Link>
                      <div className="mt-0.5 text-xs">
                        {clientLink(c.client)}
                      </div>
                    </div>
                    <StatusBadge
                      label={statusLabel("crm_project", c.status)}
                      color={crmColor(c.status)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
