import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/finance/kpi-card";
import { FinanceChart } from "@/components/finance/finance-chart";
import { ForecastTable } from "@/components/finance/forecast-table";
import { financeService } from "@/server/services";
import type { ForecastMonth } from "@/types/entities";
import { formatCHF } from "@/lib/utils";

export const metadata: Metadata = { title: "Finance - Forecast" };

export default async function FinanceForecastPage() {
  let fc: ForecastMonth[] = [];
  try {
    fc = await financeService.forecast(12);
  } catch {
    fc = [];
  }

  const sumRevenue = (months: ForecastMonth[]) =>
    months.reduce((acc, m) => acc + m.revenue, 0);

  const revenue3 = sumRevenue(fc.slice(0, 3));
  const revenue12 = sumRevenue(fc.slice(0, 12));
  const avgProfit =
    fc.length > 0
      ? Math.round(fc.reduce((acc, m) => acc + m.profit, 0) / fc.length)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Forecast</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Prognose aus aktiven Verträgen (Vertragsenden beruecksichtigt)
          abzueglich wiederkehrender Kosten.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Umsatz naechste 3 Monate"
          value={formatCHF(revenue3)}
          tone="brand"
        />
        <KpiCard
          label="Umsatz naechste 12 Monate"
          value={formatCHF(revenue12)}
          tone="brand"
        />
        <KpiCard
          label="Durchschn. Gewinn / Monat"
          value={formatCHF(avgProfit)}
          tone={avgProfit >= 0 ? "green" : "red"}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <FinanceChart
            points={fc.map((f) => ({ month: f.month, value: f.profit }))}
            label="Prognostizierter Gewinn"
            color="bg-green-500"
          />
        </CardContent>
      </Card>

      <ForecastTable months={fc} />
    </div>
  );
}
