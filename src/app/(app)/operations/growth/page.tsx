import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  growthEngineService,
  growthAlertsService,
} from "@/server/services";
import { formatCHF } from "@/lib/utils";
import {
  RECOMMENDATION_STATUSES,
  RECOMMENDATION_PRIORITY_LABELS,
  recommendationPriorityColor,
  ALERT_SEVERITY_LABELS,
  alertSeverityColor,
} from "@/config/catalog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/finance/kpi-card";
import { StatusBadge } from "@/components/tasks/status-badge";
import { StatusSelect } from "@/components/production/status-select";
import { GrowthEngineScan } from "@/components/growth-engine/growth-engine-scan";
import { AlertResolveButton } from "@/components/growth-engine/alert-resolve";
import { setRecommendationStatusAction } from "@/app/(app)/operations/growth/actions";

export const metadata = { title: "Growth - Command Center" };

export default async function GrowthCommandCenterPage() {
  const d = await growthEngineService.dashboard().catch(() => null);
  const recs = await growthEngineService.commandCenter(10).catch(() => []);
  const alerts = await growthAlertsService.list(false).catch(() => []);

  return (
    <div className="space-y-6">
      {/* 1) Aktionsleiste */}
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-xl text-sm text-neutral-500">
          Die ganze Pipeline auf einen Blick - Vorschlaege, Prioritaeten,
          naechste Schritte.
        </p>
        <GrowthEngineScan />
      </div>

      {!d ? (
        /* 2) Keine Daten */
        <Card>
          <CardContent>
            <EmptyState
              title="Keine Daten"
              description="Demo-Modus oder noch keine Daten."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 3) KPI-Widgets */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard
              label="Pipeline-Wert"
              value={formatCHF(d.kpis.pipelineValue)}
              tone="brand"
            />
            <KpiCard
              label="Forecast 3 Mt."
              value={formatCHF(d.kpis.forecast)}
            />
            <KpiCard
              label="Upsell-Wert"
              value={formatCHF(d.kpis.upsellValue)}
            />
            <KpiCard label="Empfehlungen" value={d.kpis.referralPotential} />
            <KpiCard
              label="Verlaengerungs-Potenzial"
              value={formatCHF(d.kpis.renewalPotential)}
            />
            <KpiCard
              label="Churn-Risiko"
              value={d.kpis.churnRisk}
              tone={d.kpis.churnRisk > 0 ? "red" : "neutral"}
            />
          </div>

          {/* 4) Offene Posten im Funnel */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900">
              Offene Posten im Funnel
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <KpiCard
                label="Neue Leads"
                value={d.newLeads}
                href="/sales/leads"
              />
              <KpiCard
                label="Heisse Opportunities"
                value={d.hotOpportunities}
                href="/sales/lead-engine"
              />
              <KpiCard
                label="Audits offen"
                value={d.openAudits}
                href="/sales/audits"
              />
              <KpiCard
                label="Outreach-Entwuerfe"
                value={d.outreachDrafts}
                href="/sales/outreach"
              />
              <KpiCard
                label="Follow-Ups faellig"
                value={d.followupsDue}
                href="/sales/followups"
              />
              <KpiCard
                label="Angebote offen"
                value={d.openOffers}
                href="/sales/proposals"
              />
              <KpiCard
                label="Verträge offen"
                value={d.openContracts}
                href="/sales/contracts"
              />
              <KpiCard
                label="Kunden ohne Kontakt"
                value={d.clientsNoContact}
                href="/clients/list"
                tone={d.clientsNoContact > 0 ? "amber" : "neutral"}
              />
              <KpiCard
                label="Upsell-Chancen"
                value={d.upsellChances}
                href="/clients/growth/upsell"
              />
              <KpiCard
                label="Reviews ausstehend"
                value={d.reviewsPending}
                href="/clients/growth/reviews"
              />
            </div>
          </section>

          {/* 5) Heute wichtigste Aktionen */}
          <Card>
            <CardHeader>
              <CardTitle>Heute wichtigste Aktionen</CardTitle>
              <CardDescription>
                Fokus: maximal 10 Empfehlungen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recs.length === 0 ? (
                <EmptyState
                  title="Noch keine Empfehlungen"
                  description="Fuehre die Engine aus, um Vorschlaege zu erzeugen."
                  icon={Sparkles}
                />
              ) : (
                <ul className="space-y-2">
                  {recs.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <StatusBadge
                          label={
                            RECOMMENDATION_PRIORITY_LABELS[
                              r.priority as keyof typeof RECOMMENDATION_PRIORITY_LABELS
                            ]
                          }
                          color={recommendationPriorityColor(r.priority)}
                        />
                        <div className="space-y-0.5">
                          <p className="font-medium text-neutral-900">
                            {r.title}
                          </p>
                          {r.reason ? (
                            <p className="text-xs text-neutral-500">
                              {r.reason}
                            </p>
                          ) : null}
                          {r.estimated_value != null ? (
                            <p className="text-xs font-medium tabular-nums text-brand-700">
                              {formatCHF(r.estimated_value)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {r.href ? (
                          <Link
                            href={r.href}
                            className="inline-flex h-9 items-center rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                          >
                            Oeffnen
                          </Link>
                        ) : null}
                        <StatusSelect
                          id={r.id}
                          value={r.status}
                          statuses={RECOMMENDATION_STATUSES}
                          action={setRecommendationStatusAction}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 6) Growth-Alerts */}
          {alerts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Growth-Alerts</CardTitle>
                <CardDescription>
                  Offene Hinweise, die Aufmerksamkeit brauchen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {alerts.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <StatusBadge
                          label={
                            ALERT_SEVERITY_LABELS[
                              a.severity as keyof typeof ALERT_SEVERITY_LABELS
                            ]
                          }
                          color={alertSeverityColor(a.severity)}
                        />
                        <div className="space-y-0.5">
                          <p className="font-medium text-neutral-900">
                            {a.title}
                          </p>
                          {a.description ? (
                            <p className="text-xs text-neutral-500">
                              {a.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <AlertResolveButton id={a.id} />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
