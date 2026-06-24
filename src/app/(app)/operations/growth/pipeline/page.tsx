import * as React from "react";
import { ChevronDown, Filter } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/finance/kpi-card";
import { growthEngineService } from "@/server/services";
import { formatCHF } from "@/lib/utils";

export const metadata = { title: "Growth - Pipeline" };

export default async function GrowthPipelinePage() {
  const steps = await growthEngineService.pipelineSteps().catch(() => []);
  const d = await growthEngineService.dashboard().catch(() => null);

  const maxCount = steps.length
    ? Math.max(...steps.map((s) => s.count), 1)
    : 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Funnel</CardTitle>
          <CardDescription>
            Von Leads gefunden bis Empfehlung erhalten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <EmptyState
              title="Keine Funnel-Daten"
              description="Sobald die Growth Engine Daten erfasst hat, erscheint hier der Funnel."
              icon={Filter}
            />
          ) : (
            <div className="space-y-1">
              {steps.map((step, index) => {
                const width = Math.round((step.count / maxCount) * 100);
                return (
                  <React.Fragment key={step.key}>
                    <div className="relative flex items-center justify-between overflow-hidden rounded-lg border border-neutral-200 px-4 py-3">
                      <div
                        className="absolute inset-y-0 left-0 bg-brand-50"
                        style={{ width: `${width}%` }}
                        aria-hidden="true"
                      />
                      <span className="relative z-10 text-sm font-medium text-neutral-700">
                        {step.label}
                      </span>
                      <span className="relative z-10 text-lg font-semibold tabular-nums text-neutral-900">
                        {step.count}
                      </span>
                    </div>
                    {index < steps.length - 1 ? (
                      <div className="flex justify-center py-0.5">
                        <ChevronDown
                          className="h-4 w-4 text-neutral-300"
                          aria-hidden="true"
                        />
                      </div>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {d ? (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline-Wert</CardTitle>
            <CardDescription>
              Geschaetzter Wert je Funnel-Abschnitt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <KpiCard
                label="Lead-Wert"
                value={formatCHF(d.pipeline.leadValue)}
              />
              <KpiCard
                label="Angebots-Wert"
                value={formatCHF(d.pipeline.proposalValue)}
              />
              <KpiCard
                label="Verlaengerungs-Wert"
                value={formatCHF(d.pipeline.renewalValue)}
              />
              <KpiCard
                label="Upsell-Wert"
                value={formatCHF(d.pipeline.upsellValue)}
              />
              <KpiCard
                label="Gesamt"
                value={formatCHF(d.pipeline.total)}
                tone="brand"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
