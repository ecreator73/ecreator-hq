import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Info, MessageSquare, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { linkedinDashboardService } from "@/server/services";
import type { LinkedInDashboardData } from "@/server/services";
import type { LinkedInProspectWithRelations } from "@/types/entities";
import { LINKEDIN_PROSPECT_STATUSES, statusLabel } from "@/config/catalog";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "LinkedIn - Dashboard" };

const EMPTY_DASHBOARD: LinkedInDashboardData = {
  contactToday: [],
  followups: { overdue: 0, today: 0, week: 0 },
  newReplies: [],
  newProspects7d: 0,
  hotProspects: 0,
  pipeline: [],
  topCampaigns: [],
};

/* Katalogfarben (gray/blue/green/amber/red) je Status fuer Badges + Balken. */
const STATUS_COLOR: Record<string, string> = Object.fromEntries(
  LINKEDIN_PROSPECT_STATUSES.map((s) => [s.key, s.color]),
);
const STATUS_ORDER: Record<string, number> = Object.fromEntries(
  LINKEDIN_PROSPECT_STATUSES.map((s, i) => [s.key, i]),
);
const BAR_COLOR: Record<string, string> = {
  gray: "bg-neutral-400",
  blue: "bg-brand-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
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
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: WidgetTone;
}) {
  return (
    <div className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
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
    </div>
  );
}

function ProspectRow({
  prospect,
  today,
}: {
  prospect: LinkedInProspectWithRelations;
  today: string;
}) {
  const overdue =
    prospect.next_followup_date !== null && prospect.next_followup_date < today;
  return (
    <Link
      href={`/sales/linkedin/prospects/${prospect.id}`}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2.5 transition-colors hover:bg-neutral-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-neutral-900">
          {prospect.full_name}
        </span>
        {prospect.company_name ? (
          <span className="block truncate text-xs text-neutral-500">
            {prospect.company_name}
          </span>
        ) : null}
      </span>
      <StatusBadge
        label={statusLabel("linkedin_prospect", prospect.status)}
        color={STATUS_COLOR[prospect.status]}
      />
      {prospect.next_followup_date ? (
        <span
          className={cn(
            "text-xs tabular-nums",
            overdue ? "font-medium text-red-600" : "text-neutral-500",
          )}
        >
          {formatDate(prospect.next_followup_date)}
        </span>
      ) : null}
    </Link>
  );
}

export default async function LinkedInDashboardPage() {
  const data = await linkedinDashboardService.dashboard().catch(() => null);
  const d = data ?? EMPTY_DASHBOARD;
  const today = new Date().toISOString().slice(0, 10);

  const pipeline = [...d.pipeline].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99),
  );
  const maxPipeline = Math.max(1, ...pipeline.map((p) => p.count));

  return (
    <div className="space-y-6">
      <PageHeader
        title="LinkedIn-Dashboard"
        description="Tagesueberblick fuer die LinkedIn-Akquise — Follow-ups, neue Antworten und Pipeline auf einen Blick."
      />

      {data === null ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          <span>
            Noch keine Daten - falls das Modul neu ist: Migration 0021 in
            Supabase einspielen.
          </span>
        </div>
      ) : null}

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Widget
          label="Ueberfaellige Follow-ups"
          value={d.followups.overdue}
          tone={d.followups.overdue > 0 ? "red" : "neutral"}
        />
        <Widget label="Follow-ups heute" value={d.followups.today} tone="brand" />
        <Widget label="Diese Woche" value={d.followups.week} />
        <Widget
          label="Neue Antworten"
          value={d.newReplies.length}
          tone={d.newReplies.length > 0 ? "green" : "neutral"}
        />
        <Widget label="Neue Prospects (7 Tage)" value={d.newProspects7d} />
        <Widget
          label="Heisse Prospects"
          value={d.hotProspects}
          tone={d.hotProspects > 0 ? "amber" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Heute kontaktieren */}
        <Card>
          <CardHeader>
            <CardTitle>Heute kontaktieren</CardTitle>
          </CardHeader>
          <CardContent>
            {d.contactToday.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nichts faellig"
                description="Aktuell sind keine Follow-ups faellig — alle Prospects sind auf Kurs."
              />
            ) : (
              <ul className="-mx-3 divide-y divide-neutral-100">
                {d.contactToday.map((p) => (
                  <li key={p.id}>
                    <ProspectRow prospect={p} today={today} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Neue Antworten */}
        <Card>
          <CardHeader>
            <CardTitle>Neue Antworten</CardTitle>
          </CardHeader>
          <CardContent>
            {d.newReplies.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="Keine neuen Antworten"
                description="Sobald ein Prospect antwortet, erscheint er hier."
              />
            ) : (
              <ul className="-mx-3 divide-y divide-neutral-100">
                {d.newReplies.map((p) => (
                  <li key={p.id}>
                    <ProspectRow prospect={p} today={today} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pipeline-Uebersicht */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline-Uebersicht</CardTitle>
          </CardHeader>
          <CardContent>
            {pipeline.length === 0 ? (
              <EmptyState
                title="Keine aktiven Prospects"
                description="Lege Prospects an oder importiere eine Liste, um die Pipeline zu fuellen."
              />
            ) : (
              <ul className="space-y-3">
                {pipeline.map((entry) => (
                  <li key={entry.status}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-neutral-600">
                        {statusLabel("linkedin_prospect", entry.status)}
                      </span>
                      <span className="font-medium tabular-nums text-neutral-900">
                        {entry.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          BAR_COLOR[STATUS_COLOR[entry.status] ?? "gray"] ??
                            "bg-neutral-400",
                        )}
                        style={{
                          width: `${Math.round((entry.count / maxPipeline) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top Kampagnen */}
        <Card>
          <CardHeader>
            <CardTitle>Top Kampagnen</CardTitle>
          </CardHeader>
          <CardContent>
            {d.topCampaigns.length === 0 ? (
              <EmptyState
                icon={Flame}
                title="Keine Kampagnen mit Prospects"
                description="Ordne Prospects einer Kampagne zu, um hier die Performance zu sehen."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {d.topCampaigns.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-neutral-900">
                      {c.name}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-neutral-500">
                      {c.count} Prospects
                      <span className="ml-2 font-medium text-green-600">
                        {c.won} gewonnen
                      </span>
                    </span>
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
