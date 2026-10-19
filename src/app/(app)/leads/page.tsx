import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Flame, PhoneCall, Sparkles, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import {
  analyticsService,
  leadsService,
  salesDashboardService,
} from "@/server/services";
import type { AnalyticsOverview, SalesDashboardData } from "@/server/services";
import type { LeadWithRelations } from "@/types/entities";
import { LEAD_SOURCE_LABELS, LEAD_STATUSES } from "@/config/catalog";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { today } from "@/lib/dates";

export const metadata: Metadata = { title: "Leads - Dashboard" };

/** Status, die nicht mehr aktiv bearbeitet werden. */
const TERMINAL_STATUSES = ["abgeschlossen", "absage", "fehleintrag", "andere", "massenmail"];

const EMPTY_SUMMARY: SalesDashboardData = {
  newLeads: 0,
  hotLeads: 0,
  followupsToday: 0,
  followupsOverdue: 0,
  meetingsToday: 0,
  pipelineValue: 0,
  revenuePotential: 0,
  winRate: 0,
  openOffers: 0,
  acceptedOffers: 0,
  rejectedOffers: 0,
  offerVolume: 0,
  offerWinRate: 0,
  contractsExpiring: 0,
};

const EMPTY_OVERVIEW: AnalyticsOverview = {
  totalLeads: 0,
  won: 0,
  open: 0,
  conversion: 0,
  byStatus: [],
  bySource: [],
  byCampaign: [],
  byOwner: [],
};

/* Balken-/Kachelfarben --------------------------------------------------- */

const STATUS_COLOR: Record<string, string> = Object.fromEntries(
  LEAD_STATUSES.map((s) => [s.key, s.color]),
);

const BAR_COLOR: Record<string, string> = {
  gray: "bg-neutral-400",
  blue: "bg-brand-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

type Tone = "neutral" | "brand" | "amber" | "green" | "red";

const TONE_VALUE: Record<Tone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-700",
  amber: "text-amber-600",
  green: "text-green-600",
  red: "text-red-600",
};

const TONE_ICON: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-500",
  brand: "bg-brand-50 text-brand-600",
  amber: "bg-amber-50 text-amber-600",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
};

function Kpi({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/30"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-600">{label}</p>
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            TONE_ICON[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-3 text-3xl font-semibold tabular-nums", TONE_VALUE[tone])}>
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
    </Link>
  );
}

function MiniStat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-baseline justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/30"
    >
      <span className="text-sm text-neutral-600">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-neutral-900">
        {value}
      </span>
    </Link>
  );
}

/** Horizontaler Balken (dependency-frei) fuer Verteilungs-Karten. */
function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  return (
    <li>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-neutral-600">{label}</span>
        <span className="shrink-0 font-medium tabular-nums text-neutral-900">
          {count}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={cn("h-full rounded-full", BAR_COLOR[color] ?? "bg-neutral-400")}
          style={{ width: `${Math.max(4, Math.round((count / max) * 100))}%` }}
        />
      </div>
    </li>
  );
}

function sourceLabel(key: string, fallback: string): string {
  return LEAD_SOURCE_LABELS[key as keyof typeof LEAD_SOURCE_LABELS] ?? fallback;
}

export default async function LeadsDashboardPage() {
  const heute = today();

  const [summary, faellig, overview, neueste] = await Promise.all([
    salesDashboardService.summary().catch(() => EMPTY_SUMMARY),
    leadsService
      .list(
        { dueTo: heute, excludeStatus: TERMINAL_STATUSES },
        { pageSize: 10, sort: { column: "next_action_date", ascending: true } },
      )
      .then((r) => r.rows)
      .catch(() => [] as LeadWithRelations[]),
    analyticsService.overview().catch(() => EMPTY_OVERVIEW),
    leadsService
      .list({}, { pageSize: 8, sort: { column: "created_at", ascending: false } })
      .then((r) => r.rows)
      .catch(() => [] as LeadWithRelations[]),
  ]);

  const statusRows = overview.byStatus.slice(0, 8);
  const sourceRows = overview.bySource.slice(0, 8);
  const maxStatus = Math.max(1, ...statusRows.map((r) => r.total));
  const maxSource = Math.max(1, ...sourceRows.map((r) => r.total));

  return (
    <div className="space-y-6">
      {/* 1) Die vier Zahlen, die den Tag bestimmen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Neue Leads"
          value={summary.newLeads}
          hint="Noch nicht bearbeitet"
          href="/sales/leads?status=neu"
          icon={Sparkles}
          tone="brand"
        />
        <Kpi
          label="Heisse Leads"
          value={summary.hotLeads}
          hint="Score 70 und hoeher"
          href="/sales/leads?scoreMin=70"
          icon={Flame}
          tone="amber"
        />
        <Kpi
          label="Follow-ups heute"
          value={summary.followupsToday}
          hint="Heute faellig"
          href="/sales/followups"
          icon={CalendarClock}
          tone={summary.followupsToday > 0 ? "brand" : "neutral"}
        />
        <Kpi
          label="Ueberfaellig"
          value={summary.followupsOverdue}
          hint={
            summary.followupsOverdue > 0
              ? "Bitte zuerst erledigen"
              : "Alles auf Kurs"
          }
          href="/sales/followups"
          icon={PhoneCall}
          tone={summary.followupsOverdue > 0 ? "red" : "green"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Pipeline-Wert"
          value={formatCHF(summary.pipelineValue)}
          href="/sales/pipeline"
        />
        <MiniStat
          label="Conversion"
          value={`${overview.conversion} %`}
          href="/sales/leads"
        />
      </div>

      {/* 2) Handlungsliste des Tages */}
      <Card>
        <CardHeader>
          <CardTitle>Wen sollte ich heute kontaktieren?</CardTitle>
        </CardHeader>
        <CardContent>
          {faellig.length === 0 ? (
            <EmptyState
              icon={PhoneCall}
              title="Heute steht nichts an"
              description="Es ist kein Follow-up faellig. Gute Gelegenheit fuer neue Akquise."
              action={
                <Link
                  href="/sales/leads"
                  className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
                >
                  Alle Leads ansehen
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Firma</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Score</th>
                    <th className="px-4 py-2.5 font-medium">Faellig am</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {faellig.map((lead) => {
                    const overdue =
                      lead.next_action_date != null &&
                      lead.next_action_date < heute;
                    return (
                      <tr key={lead.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/sales/leads/${lead.id}`}
                            className="font-medium text-neutral-900 hover:text-brand-700"
                          >
                            {lead.contact_name || lead.company_name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">
                          {lead.company_name}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge
                            label={lead.status?.label}
                            color={lead.status?.color}
                          />
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-neutral-700">
                          {lead.lead_score}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5 tabular-nums",
                            overdue
                              ? "font-medium text-red-600"
                              : "text-neutral-600",
                          )}
                        >
                          {lead.next_action_date
                            ? formatDate(lead.next_action_date)
                            : "-"}
                          {overdue ? " (ueberfaellig)" : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3) Verteilungen */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads nach Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusRows.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Noch keine Leads"
                description="Sobald Leads erfasst sind, siehst du hier die Verteilung."
              />
            ) : (
              <ul className="space-y-3">
                {statusRows.map((row) => (
                  <BarRow
                    key={row.key}
                    label={row.label}
                    count={row.total}
                    max={maxStatus}
                    color={STATUS_COLOR[row.key] ?? "gray"}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads nach Quelle</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceRows.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Noch keine Quellen"
                description="Trage bei Leads eine Quelle ein, um zu sehen, was am besten funktioniert."
              />
            ) : (
              <ul className="space-y-3">
                {sourceRows.map((row) => (
                  <BarRow
                    key={row.key}
                    label={sourceLabel(row.key, row.label)}
                    count={row.total}
                    max={maxSource}
                    color="blue"
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4) Neueste Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Neueste Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {neueste.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Noch keine Leads erfasst"
              description="Lege den ersten Lead an — danach erscheint er hier automatisch."
              action={
                <Link
                  href="/sales/leads"
                  className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
                >
                  Zu allen Leads
                </Link>
              }
            />
          ) : (
            <ul className="-mx-2 divide-y divide-neutral-100">
              {neueste.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/sales/leads/${lead.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-2.5 transition-colors hover:bg-neutral-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-900">
                        {lead.contact_name || lead.company_name}
                      </span>
                      <span className="block truncate text-xs text-neutral-500">
                        {lead.company_name}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {lead.source ? sourceLabel(lead.source, lead.source) : "Ohne Quelle"}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                      {formatDate(lead.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
