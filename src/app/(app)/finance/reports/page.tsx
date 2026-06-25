import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/finance/kpi-card";
import { FinanceChart } from "@/components/finance/finance-chart";
import { financeService } from "@/server/services";
import type { CustomerValue, FinanceSeriesPoint } from "@/types/entities";
import { formatCHF } from "@/lib/utils";

export const metadata: Metadata = { title: "Finance - Reports" };

interface ReportsData {
  revenueSeries: FinanceSeriesPoint[];
  costSeries: FinanceSeriesPoint[];
  mrr: number;
  topClients: CustomerValue[];
}

const EMPTY_REPORTS: ReportsData = {
  revenueSeries: [],
  costSeries: [],
  mrr: 0,
  topClients: [],
};

export default async function FinanceReportsPage() {
  const rep: ReportsData = await financeService
    .reports()
    .catch(() => EMPTY_REPORTS);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-neutral-900">Reports</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Umsatz- und Kostenentwicklung der letzten 12 Monate sowie die
          wertvollsten Kunden.
        </p>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Umsatz (12 Monate)</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceChart points={rep.revenueSeries} color="bg-brand-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kosten (12 Monate)</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceChart points={rep.costSeries} color="bg-amber-500" />
          </CardContent>
        </Card>
      </div>

      {/* MRR */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Aktuelles MRR"
          value={formatCHF(rep.mrr)}
          tone="brand"
        />
      </div>

      {/* Top Kunden */}
      <Card>
        <CardHeader>
          <CardTitle>Top Kunden</CardTitle>
        </CardHeader>
        <CardContent>
          {rep.topClients.length === 0 ? (
            <EmptyState
              title="Noch keine Kundenwerte"
              description="Sobald Verträge und bezahlte Rechnungen erfasst sind, erscheinen hier die wertvollsten Kunden."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Kunde</th>
                    <th className="px-4 py-2.5 text-right font-medium">MRR</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Gesamtumsatz
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rep.topClients.map((c) => (
                    <tr key={c.client.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/clients/${c.client.id}`}
                          className="font-medium text-neutral-900 hover:text-brand-700"
                        >
                          {c.client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {formatCHF(c.mrr)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-neutral-900">
                        {formatCHF(c.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
