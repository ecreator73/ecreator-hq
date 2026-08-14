import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ReceiptText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/finance/kpi-card";
import { InvoiceQuickCreate } from "@/components/finance/invoice-quick-create";
import { ExpenseQuickCreate } from "@/components/finance/expense-quick-create";
import { expensesService, financeService, invoicesService } from "@/server/services";
import type {
  FinanceSummary,
  FinanceAlert,
  Expense,
  InvoiceWithClient,
} from "@/types/entities";
import { formatCHF, formatDate, cn } from "@/lib/utils";
import { isInvoiceOverdue, recurringMonthlyAmount } from "@/lib/finance";

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

/** Seiten, die nicht mehr im Menue sind - Hinweise duerfen nicht dorthin fuehren. */
const RETIRED_PAGES = ["/finance/forecast", "/finance/customers", "/finance/reports"];

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
  const [s, alerts, openInvoices, recurringCosts] = await Promise.all([
    financeService.summary().catch(() => EMPTY_SUMMARY),
    financeService.alerts().catch((): FinanceAlert[] => []),
    invoicesService
      .list({ statusIn: ["open", "overdue"] })
      .catch((): InvoiceWithClient[] => []),
    expensesService.list({ recurring: true }).catch((): Expense[] => []),
  ]);

  // Fixkosten je Monat (monatliches Aequivalent aller wiederkehrenden Posten).
  const monthlyCost = recurringCosts.reduce(
    (sum, e) => sum + recurringMonthlyAmount(e.amount, e.recurring_frequency),
    0,
  );

  // Hinweise, die auf entfernte Seiten zeigen wuerden, verlieren ihren Link.
  const visibleAlerts: FinanceAlert[] = alerts.map((a) =>
    a.href && RETIRED_PAGES.includes(a.href) ? { ...a, href: undefined } : a,
  );

  // Rechnungen sind bereits nach Faelligkeit aufsteigend sortiert.
  const dueSoon = openInvoices.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Was hier haeufig gemacht wird */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <InvoiceQuickCreate />
        <ExpenseQuickCreate variant="secondary" />
      </div>

      {/* Die 6 Zahlen, die zaehlen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="MRR"
          value={formatCHF(s.mrr)}
          sublabel="Wiederkehrend pro Monat"
          tone="brand"
          href="/finance/monthly"
        />
        <KpiCard
          label="ARR"
          value={formatCHF(s.arr)}
          sublabel="Hochgerechnet aufs Jahr"
          tone="brand"
          href="/finance/monthly"
        />
        <KpiCard
          label="Umsatz laufender Monat"
          value={formatCHF(s.monthRevenue)}
          sublabel="Bezahlte Rechnungen"
          tone="green"
          href="/finance/invoices"
        />
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
          label="Fixkosten pro Monat"
          value={formatCHF(monthlyCost)}
          sublabel="Wiederkehrende Kosten"
          tone="amber"
          href="/finance/expenses"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Naechste faellige Rechnungen */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Naechste faellige Rechnungen</CardTitle>
            <Link
              href="/finance/open"
              className="text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              Alle offenen Posten
            </Link>
          </CardHeader>
          <CardContent>
            {dueSoon.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="Keine offenen Rechnungen"
                description="Alles bezahlt. Neue Rechnung erfassen, sobald eine Leistung abgerechnet wird."
                action={<InvoiceQuickCreate />}
              />
            ) : (
              <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                {dueSoon.map((inv) => {
                  const overdue = isInvoiceOverdue(inv);
                  return (
                    <li key={inv.id}>
                      <Link
                        href={`/finance/invoices/${inv.id}`}
                        className="flex items-start justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-neutral-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-neutral-900">
                            {inv.title ?? "(ohne Titel)"}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-neutral-500">
                            {inv.client?.name ?? "Ohne Kunde"}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-medium tabular-nums text-neutral-900">
                            {formatCHF(inv.amount ?? 0)}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block text-xs",
                              overdue ? "text-red-600" : "text-neutral-500",
                            )}
                          >
                            {inv.due_date
                              ? `${overdue ? "ueberfaellig seit " : "faellig "}${formatDate(inv.due_date)}`
                              : "ohne Faelligkeit"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Was braucht Aufmerksamkeit */}
        <Card>
          <CardHeader>
            <CardTitle>Was braucht Aufmerksamkeit</CardTitle>
          </CardHeader>
          <CardContent>
            {visibleAlerts.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Alles im gruenen Bereich"
                description="Keine ueberfaelligen Rechnungen und keine auslaufenden Vertraege."
              />
            ) : (
              <div className="space-y-2">
                {visibleAlerts.map((alert, i) => (
                  <AlertRow key={`${alert.type}-${i}`} alert={alert} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
