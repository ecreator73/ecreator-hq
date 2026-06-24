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
import { InvoiceQuickCreate } from "@/components/finance/invoice-quick-create";
import { ExpenseQuickCreate } from "@/components/finance/expense-quick-create";
import { financeService } from "@/server/services";
import type {
  FinanceSummary,
  ForecastMonth,
  FinanceAlert,
  CustomerValue,
} from "@/types/entities";
import { formatCHF, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Finance - Dashboard" };

const EMPTY_SUMMARY: FinanceSummary = {
  monthRevenue: 0,
  yearRevenue: 0,
  mrr: 0,
  arr: 0,
  openInvoicesCount: 0,
  openInvoicesAmount: 0,
  overdueInvoicesCount: 0,
  overdueInvoicesAmount: 0,
  profitEstimateMonth: 0,
  activeClients: 0,
  forecastNextMonth: 0,
  forecast3Months: 0,
  forecast12Months: 0,
};

const ALERT_STYLES: Record<
  FinanceAlert["severity"],
  { row: string; dot: string }
> = {
  info: {
    row: "border-neutral-200 bg-white",
    dot: "bg-neutral-400",
  },
  warn: {
    row: "border-amber-200 bg-amber-50/60",
    dot: "bg-amber-500",
  },
  danger: {
    row: "border-red-200 bg-red-50/60",
    dot: "bg-red-500",
  },
};

function AlertRow({ alert }: { alert: FinanceAlert }) {
  const style = ALERT_STYLES[alert.severity] ?? ALERT_STYLES.info;
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm",
        style.row,
        alert.href ? "transition-colors hover:border-brand-300" : null,
      )}
    >
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)}
        aria-hidden
      />
      <span className="text-neutral-700">{alert.label}</span>
    </div>
  );
  if (alert.href) {
    return (
      <Link href={alert.href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default async function FinanceDashboardPage() {
  // Rollen-Guard liegt im finance/layout.tsx (requireRole). Hier nur Daten laden.
  const [s, fc, al, cv] = await Promise.all([
    financeService.summary().catch(() => EMPTY_SUMMARY),
    financeService.forecast(12).catch((): ForecastMonth[] => []),
    financeService.alerts().catch((): FinanceAlert[] => []),
    financeService.customerValues().catch((): CustomerValue[] => []),
  ]);

  const topClients = cv.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <InvoiceQuickCreate />
        <ExpenseQuickCreate variant="secondary" />
      </div>

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Umsatz Monat" value={formatCHF(s.monthRevenue)} />
        <KpiCard label="Umsatz Jahr" value={formatCHF(s.yearRevenue)} />
        <KpiCard label="MRR" value={formatCHF(s.mrr)} tone="brand" />
        <KpiCard label="ARR" value={formatCHF(s.arr)} tone="brand" />
        <KpiCard
          label="Offene Rechnungen"
          value={s.openInvoicesCount}
          sublabel={formatCHF(s.openInvoicesAmount)}
          href="/finance/open"
        />
        <KpiCard
          label="Ueberfaellige Rechnungen"
          value={s.overdueInvoicesCount}
          sublabel={formatCHF(s.overdueInvoicesAmount)}
          tone={s.overdueInvoicesCount > 0 ? "red" : "neutral"}
          href="/finance/open"
        />
        <KpiCard
          label="Gewinnschaetzung / Monat"
          value={formatCHF(s.profitEstimateMonth)}
          tone={s.profitEstimateMonth >= 0 ? "green" : "red"}
        />
        <KpiCard label="Aktive Kunden" value={s.activeClients} />
      </div>

      {/* Forecast-Zeile */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Forecast naechster Monat"
          value={formatCHF(s.forecastNextMonth)}
          tone="brand"
        />
        <KpiCard
          label="Naechste 3 Monate"
          value={formatCHF(s.forecast3Months)}
          tone="brand"
        />
        <KpiCard
          label="Naechste 12 Monate"
          value={formatCHF(s.forecast12Months)}
          tone="brand"
        />
      </div>

      {/* Forecast-Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast (12 Monate)</CardTitle>
        </CardHeader>
        <CardContent>
          <FinanceChart
            points={fc.map((f) => ({ month: f.month, value: f.revenue }))}
            label="Prognostizierter Umsatz"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Finance-Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Finance-Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {al.length === 0 ? (
              <EmptyState
                title="Keine Alerts"
                description="Aktuell gibt es keine ueberfaelligen Rechnungen oder auslaufenden Vertraege."
              />
            ) : (
              <div className="space-y-2">
                {al.map((alert, i) => (
                  <AlertRow key={`${alert.type}-${i}`} alert={alert} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Kunden (MRR) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Kunden (MRR)</CardTitle>
            <Link
              href="/finance/customers"
              className="text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              Alle Kunden
            </Link>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <EmptyState
                title="Keine Kunden"
                description="Sobald Vertraege oder bezahlte Rechnungen erfasst sind, erscheinen hier die wertvollsten Kunden."
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-neutral-200">
                <table className="w-full text-sm">
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
                    {topClients.map((c) => (
                      <tr key={c.client.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/clients/${c.client.id}`}
                            className="font-medium text-neutral-900 hover:text-brand-700"
                          >
                            {c.client.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums text-brand-700">
                          {formatCHF(c.mrr)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
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
    </div>
  );
}
