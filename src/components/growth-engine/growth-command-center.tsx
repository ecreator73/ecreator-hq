import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/finance/kpi-card";
import { StatusBadge } from "@/components/tasks/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { growthEngineService } from "@/server/services";
import {
  RECOMMENDATION_PRIORITY_LABELS,
  recommendationPriorityColor,
} from "@/config/catalog";
import { formatCHF } from "@/lib/utils";

/**
 * Growth-Command-Center-Band fuer die Home-Startseite (Executive Command
 * Center). Zeigt die 6 KPI-Widgets und die wichtigsten offenen Empfehlungen.
 * Rollen-Gate liegt beim Aufrufer (Home). Demo-Modus-sicher via .catch.
 */
export async function GrowthCommandCenter() {
  const [d, recs] = await Promise.all([
    growthEngineService.dashboard().catch(() => null),
    growthEngineService.commandCenter(5).catch(() => []),
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Growth Command Center</CardTitle>
        <Link
          href="/operations/growth"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
        >
          Zur Growth Engine
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-5">
        {d ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Pipeline-Wert" value={formatCHF(d.kpis.pipelineValue)} tone="brand" />
            <KpiCard label="Forecast 3 Mt." value={formatCHF(d.kpis.forecast)} />
            <KpiCard label="Upsell-Wert" value={formatCHF(d.kpis.upsellValue)} />
            <KpiCard label="Empfehlungen" value={d.kpis.referralPotential} />
            <KpiCard label="Verlaengerung" value={formatCHF(d.kpis.renewalPotential)} />
            <KpiCard
              label="Churn-Risiko"
              value={d.kpis.churnRisk}
              tone={d.kpis.churnRisk > 0 ? "red" : "neutral"}
            />
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Heute wichtigste Aktionen
          </p>
          {recs.length === 0 ? (
            <EmptyState
              title="Keine Empfehlungen"
              description="Fuehre die Growth Engine aus, um Vorschlaege zu erzeugen."
            />
          ) : (
            <ul className="space-y-2">
              {recs.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusBadge
                      label={
                        RECOMMENDATION_PRIORITY_LABELS[
                          r.priority as keyof typeof RECOMMENDATION_PRIORITY_LABELS
                        ]
                      }
                      color={recommendationPriorityColor(r.priority)}
                    />
                    <span className="truncate text-sm font-medium text-neutral-900">
                      {r.title}
                    </span>
                  </div>
                  {r.estimated_value ? (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-700">
                      {formatCHF(r.estimated_value)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
