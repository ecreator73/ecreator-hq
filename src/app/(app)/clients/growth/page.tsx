import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/finance/kpi-card";
import { GrowthScan } from "@/components/growth/growth-scan";
import { growthService } from "@/server/services";
import {
  UPSELL_OPPORTUNITY_TYPE_LABELS,
  CS_PLAYBOOKS,
} from "@/config/catalog";
import { formatCHF } from "@/lib/utils";

export const metadata: Metadata = { title: "Growth - Uebersicht" };

export default async function GrowthDashboardPage() {
  // Rollen-Guard liegt im clients/growth/layout.tsx (requireRole). Hier nur Daten laden.
  const d = await growthService.dashboard().catch(() => null);

  const topUpsells = d?.topUpsells ?? [];
  const topChurn = d?.topChurn ?? [];

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <GrowthScan />
      </div>

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard
          label="Upsell-Chancen"
          value={d?.upsellCount ?? 0}
          href="/clients/growth/upsell"
        />
        <KpiCard
          label="Upsell-Volumen"
          value={formatCHF(d?.upsellVolume ?? 0)}
          tone="brand"
        />
        <KpiCard
          label="Empfehlungen"
          value={d?.referralCount ?? 0}
          href="/clients/growth/reviews"
        />
        <KpiCard
          label="Verlaengerungen"
          value={d?.renewalCount ?? 0}
          href="/clients/growth/renewals"
        />
        <KpiCard
          label="Churn-Risiken"
          value={d?.churnCount ?? 0}
          tone={(d?.churnCount ?? 0) > 0 ? "red" : "neutral"}
          href="/clients/growth/churn"
        />
        <KpiCard label="Bewertungen offen" value={d?.reviewsPending ?? 0} />
        <KpiCard
          label="Testimonials"
          value={d?.testimonialsCount ?? 0}
          href="/clients/growth/testimonials"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Upsell-Chancen */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Upsell-Chancen</CardTitle>
            <a
              href="/clients/growth/upsell"
              className="text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              Alle Chancen
            </a>
          </CardHeader>
          <CardContent>
            {topUpsells.length === 0 ? (
              <EmptyState
                title="Keine Upsell-Chancen"
                description="Starte einen Wachstums-Scan, um Upsell-Potenziale automatisch zu erkennen und zu priorisieren."
              />
            ) : (
              <ul className="space-y-2">
                {topUpsells.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {u.client?.name ?? "Unbekannter Kunde"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {u.opportunity_type
                          ? (UPSELL_OPPORTUNITY_TYPE_LABELS[
                              u.opportunity_type as keyof typeof UPSELL_OPPORTUNITY_TYPE_LABELS
                            ] ?? u.opportunity_type)
                          : "Allgemein"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge tone="brand">Score {u.score}</Badge>
                      <span className="text-sm font-semibold tabular-nums text-brand-700">
                        {formatCHF(u.estimated_value ?? 0)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Hoechste Churn-Risiken */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Hoechste Churn-Risiken</CardTitle>
            <a
              href="/clients/growth/churn"
              className="text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              Alle Risiken
            </a>
          </CardHeader>
          <CardContent>
            {topChurn.length === 0 ? (
              <EmptyState
                title="Keine Churn-Risiken"
                description="Aktuell sind keine gefaehrdeten Kunden erkannt. Ein Wachstums-Scan aktualisiert die Risikobewertung."
              />
            ) : (
              <ul className="space-y-2">
                {topChurn.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50/60 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {c.client?.name ?? "Unbekannter Kunde"}
                      </p>
                      {c.reasons ? (
                        <p className="mt-0.5 text-xs text-neutral-600">
                          {c.reasons}
                        </p>
                      ) : null}
                    </div>
                    <Badge tone="red" className="shrink-0">
                      Score {c.score}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empfohlene Aktionen */}
      <Card>
        <CardHeader>
          <CardTitle>Empfohlene Aktionen</CardTitle>
        </CardHeader>
        <CardContent>
          {(
            <ul className="space-y-2">
              {CS_PLAYBOOKS.map((play) => (
                <li
                  key={play}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-brand-500"
                    aria-hidden="true"
                  />
                  {play}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
