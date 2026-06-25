import type { Metadata } from "next";
import Link from "next/link";
import { LineChart } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/finance/kpi-card";
import { AlertList } from "@/components/executive/alert-list";
import { StoredAlerts } from "@/components/executive/stored-alerts";
import { executiveService, executiveAlertsService } from "@/server/services";
import type { ExecutiveAlert } from "@/types/entities";
import { formatCHF } from "@/lib/utils";

export const metadata: Metadata = { title: "Executive - Uebersicht" };

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ExecutiveDashboardPage() {
  // Rollen-Guard liegt im executive/layout.tsx (requireRole). Hier nur Daten laden.
  const d = await executiveService.dashboard().catch(() => null);
  const storedAlerts = await executiveAlertsService
    .list(false)
    .catch((): ExecutiveAlert[] => []);

  if (!d) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyState
            title="Keine Daten"
            description="Das Executive-Dashboard konnte aktuell nicht geladen werden. Sobald Umsatz-, Sales- und Produktionsdaten erfasst sind, erscheinen hier die Kennzahlen der gesamten Firma."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/executive/briefing"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50"
        >
          <LineChart className="h-4 w-4" />
          Tagesbriefing
        </Link>
      </div>

      {/* Umsatz */}
      <Section title="Umsatz">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="MRR" value={formatCHF(d.revenue.mrr)} tone="brand" />
          <KpiCard label="ARR" value={formatCHF(d.revenue.arr)} tone="brand" />
          <KpiCard
            label="Umsatz Monat"
            value={formatCHF(d.revenue.monthRevenue)}
          />
          <KpiCard
            label="Forecast 3 Mt"
            value={formatCHF(d.revenue.forecast3)}
          />
          <KpiCard
            label="Forecast 12 Mt"
            value={formatCHF(d.revenue.forecast12)}
          />
        </div>
      </Section>

      {/* Sales */}
      <Section title="Sales">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Leads diese Woche" value={d.sales.leadsThisWeek} />
          <KpiCard label="Pipeline" value={formatCHF(d.sales.pipelineValue)} />
          <KpiCard label="Offene Angebote" value={d.sales.openOffers} />
          <KpiCard label="Abschlussquote" value={`${d.sales.winRate}%`} />
          <KpiCard
            label="Heisse Leads"
            value={d.sales.hotLeads}
            tone={d.sales.hotLeads > 0 ? "amber" : "neutral"}
          />
        </div>
      </Section>

      {/* Kunden */}
      <Section title="Kunden">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Aktive Kunden" value={d.clients.active} />
          <KpiCard
            label="Ohne Kontakt"
            value={d.clients.noContact}
            tone="amber"
          />
          <KpiCard
            label="Verträge laufen aus"
            value={d.clients.contractsExpiring}
            tone="amber"
          />
          <KpiCard
            label="Churn-Risiko"
            value={d.clients.churnRisk}
            tone={d.clients.churnRisk > 0 ? "red" : "neutral"}
          />
        </div>
      </Section>

      {/* Produktion */}
      <Section title="Produktion">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            label="Projekte mit Risiko"
            value={d.production.atRisk}
            tone={d.production.atRisk > 0 ? "red" : "neutral"}
          />
          <KpiCard
            label="Ueberfaellige Aufgaben"
            value={d.production.overdue}
          />
          <KpiCard
            label="Offene Freigaben"
            value={d.production.openApprovals}
          />
          <KpiCard
            label="Shootings Woche"
            value={d.production.shootsThisWeek}
          />
        </div>
      </Section>

      {/* Team */}
      <Section title="Team">
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <KpiCard label="Offene Aufgaben" value={d.team.openTasks} />
          <KpiCard
            label="Ueberlastet"
            value={d.team.overloaded}
            tone={d.team.overloaded > 0 ? "red" : "neutral"}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Auslastung Team</CardTitle>
          </CardHeader>
          <CardContent>
            {d.team.topLoad.length === 0 ? (
              <EmptyState
                title="Keine Auslastungsdaten"
                description="Sobald Aufgaben und Projekte zugewiesen sind, erscheint hier die Auslastung pro Person."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                      <th className="px-4 py-2.5 font-medium">Person</th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Offene Aufgaben
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Projekte
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {d.team.topLoad.map((row) => (
                      <tr key={row.user.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5 font-medium text-neutral-900">
                          {row.user.full_name}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                          {row.openTasks}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                          {row.projects}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* Wichtigste Punkte (berechnete Alerts) */}
      <Card>
        <CardHeader>
          <CardTitle>Wichtigste Punkte</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertList alerts={d.alerts} />
        </CardContent>
      </Card>

      {/* Manuelle Alerts */}
      <StoredAlerts alerts={storedAlerts} />
    </div>
  );
}
