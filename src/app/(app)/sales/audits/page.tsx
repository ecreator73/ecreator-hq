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
import { AuditCreate } from "@/components/audits/audit-create";
import { websiteAuditsService } from "@/server/services";
import type { AuditDashboard } from "@/types/entities";
import { auditScoreLevel } from "@/config/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Website-Audits - Dashboard" };

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

export default async function AuditsDashboardPage() {
  const d = await websiteAuditsService.dashboard().catch(() => null);

  if (!d) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <AuditCreate />
        </div>
        <Card>
          <CardContent>
            <EmptyState
              title="Noch keine Website-Audits"
              description="Lege ein erstes Website-Audit an, um Schwachstellen, Findings und Sales-Chancen automatisch zu analysieren."
              action={<AuditCreate />}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex items-center justify-end">
        <AuditCreate />
      </div>

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Widget
          label="Neue Audits (Woche)"
          value={d.newThisWeek}
          href="/sales/audits/list"
          tone="brand"
        />
        <Widget
          label="Audits gesamt"
          value={d.total}
          href="/sales/audits/list"
        />
        <Widget label="Durchschnitts-Score" value={`${d.avgScore}/100`} />
        <Widget
          label="Schlechte Webseiten"
          value={d.weakSites}
          href="/sales/audits/list?maxScore=40"
          tone={d.weakSites > 0 ? "amber" : "neutral"}
        />
        <Widget
          label="Heisse Sales-Chancen"
          value={d.hotChances}
          tone={d.hotChances > 0 ? "red" : "neutral"}
        />
      </div>

      {/* Top Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Top Opportunities (schwaechste Seiten)</CardTitle>
        </CardHeader>
        <CardContent>
          {d.topOpportunities.length === 0 ? (
            <EmptyState
              title="Keine Opportunities"
              description="Sobald Audits generiert wurden, erscheinen hier die Seiten mit dem groessten Verbesserungspotenzial."
              action={<AuditCreate />}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Website / Firma</th>
                    <th className="px-4 py-2.5 font-medium">Firma</th>
                    <th className="px-4 py-2.5 font-medium">Gesamt-Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {d.topOpportunities.map((a) => {
                    const level = auditScoreLevel(a.overall_score);
                    return (
                      <tr key={a.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/sales/audits/${a.id}`}
                            className="font-medium text-neutral-900 hover:text-brand-700"
                          >
                            {a.url || a.company?.name || "Ohne Bezeichnung"}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-neutral-700">
                          {a.company?.name ?? "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge
                            label={`${Math.round(a.overall_score)}/100 - ${level.label}`}
                            color={level.tone}
                          />
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
    </div>
  );
}
