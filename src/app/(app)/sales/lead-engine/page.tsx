import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PageHeader } from "@/components/page-header";
import { CompanyQuickCreate } from "@/components/lead-engine/company-quick-create";
import { CompanyImport } from "@/components/lead-engine/company-import";
import { leadCompaniesService } from "@/server/services";
import type { LeadEngineDashboard } from "@/types/entities";
import { leadScoreLevel } from "@/config/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lead Engine - Dashboard" };

const EMPTY_DASHBOARD: LeadEngineDashboard = {
  newToday: 0,
  newThisWeek: 0,
  total: 0,
  hotCount: 0,
  handedOver: 0,
  byCanton: [],
  byIndustry: [],
  topOpportunities: [],
  websiteOpps: 0,
  adsOpps: 0,
  crmOpps: 0,
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

/** Horizontale Verteilungsbalken (Branche/Region). */
function DistributionBars({
  items,
}: {
  items: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-neutral-700">
            {item.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-neutral-600">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function LeadEngineDashboardPage() {
  const d = await leadCompaniesService
    .dashboard()
    .catch(() => EMPTY_DASHBOARD);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Engine"
        description="Automatisch erkannte Firmen mit Wachstums-Chancen - bewertet, priorisiert und bereit fuer die Sales-Pipeline."
        actions={
          <div className="flex items-center gap-2">
            <CompanyImport />
            <CompanyQuickCreate />
          </div>
        }
      />

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Widget
          label="Neue Leads heute"
          value={d.newToday}
          href="/sales/lead-engine/companies"
          tone={d.newToday > 0 ? "brand" : "neutral"}
        />
        <Widget
          label="Diese Woche"
          value={d.newThisWeek}
          href="/sales/lead-engine/companies"
        />
        <Widget
          label="Gesamt"
          value={d.total}
          href="/sales/lead-engine/companies"
        />
        <Widget
          label="Heisse Opportunities"
          value={d.hotCount}
          href="/sales/lead-engine/companies?minScore=75"
          tone={d.hotCount > 0 ? "red" : "neutral"}
        />
        <Widget
          label="An Sales uebergeben"
          value={d.handedOver}
          href="/sales/lead-engine/companies?handedOver=true"
          tone={d.handedOver > 0 ? "green" : "neutral"}
        />
        <Widget
          label="Website-Opps"
          value={d.websiteOpps}
          href="/sales/lead-engine/companies?opportunityType=website"
        />
        <Widget
          label="Ads-Opps"
          value={d.adsOpps}
          href="/sales/lead-engine/companies?opportunityType=ads"
        />
        <Widget
          label="CRM-Opps"
          value={d.crmOpps}
          href="/sales/lead-engine/companies?opportunityType=crm"
        />
      </div>

      {/* Top Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Top Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {d.topOpportunities.length === 0 ? (
            <EmptyState
              title="Noch keine Opportunities"
              description="Sobald Firmen analysiert und bewertet wurden, erscheinen die heissesten Chancen hier."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Firma</th>
                    <th className="px-4 py-2.5 font-medium">Region</th>
                    <th className="px-4 py-2.5 font-medium">Bewertung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {d.topOpportunities.map((c) => {
                    const level = leadScoreLevel(c.overall_score);
                    const region = [c.city, c.canton]
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <tr key={c.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/sales/lead-engine/${c.id}`}
                            className="font-medium text-neutral-900 hover:text-brand-700"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-neutral-500">
                          {region || "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-2">
                            <StatusBadge
                              label={`${level.label} - ${c.overall_score}`}
                              color={level.tone}
                            />
                          </span>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Branchenverteilung */}
        <Card>
          <CardHeader>
            <CardTitle>Branchenverteilung</CardTitle>
          </CardHeader>
          <CardContent>
            {d.byIndustry.length === 0 ? (
              <EmptyState
                title="Keine Daten"
                description="Sobald Firmen mit Branche erfasst sind, erscheint hier die Verteilung."
              />
            ) : (
              <DistributionBars
                items={d.byIndustry.map((i) => ({
                  label: i.industry,
                  count: i.count,
                }))}
              />
            )}
          </CardContent>
        </Card>

        {/* Regionen */}
        <Card>
          <CardHeader>
            <CardTitle>Regionen</CardTitle>
          </CardHeader>
          <CardContent>
            {d.byCanton.length === 0 ? (
              <EmptyState
                title="Keine Daten"
                description="Sobald Firmen mit Kanton erfasst sind, erscheint hier die Verteilung."
              />
            ) : (
              <DistributionBars
                items={d.byCanton.map((c) => ({
                  label: c.canton,
                  count: c.count,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
