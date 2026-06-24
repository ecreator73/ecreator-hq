import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { InvoiceQuickCreate } from "@/components/finance/invoice-quick-create";
import { FinanceExportButtons } from "@/components/finance/finance-export-buttons";
import { invoicesService } from "@/server/services";
import type { InvoiceWithClient } from "@/types/entities";
import { INVOICE_STATUSES, statusLabel } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import { effectiveInvoiceStatus } from "@/lib/finance";

export const metadata: Metadata = { title: "Finance - Rechnungen" };

function invoiceStatusColor(key: string): string | undefined {
  return INVOICE_STATUSES.find((s) => s.key === key)?.color;
}

const controlClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export default async function FinanceInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "";
  const q = sp.q ?? "";

  const invoices = await invoicesService
    .list({
      status: status || undefined,
      search: q.trim() || undefined,
    })
    .catch((): InvoiceWithClient[] => []);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Rechnungen ({invoices.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <FinanceExportButtons invoices={invoices} />
            <InvoiceQuickCreate />
          </div>
        </div>

        {/* GET-Filter: Status + Suche werden in die URL geschrieben. */}
        <form method="get" className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="invoice-status-filter">
            Status filtern
          </label>
          <select
            id="invoice-status-filter"
            name="status"
            defaultValue={status}
            className={`${controlClass} font-medium`}
          >
            <option value="">Alle Status</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            />
            <label className="sr-only" htmlFor="invoice-search">
              Rechnungen suchen
            </label>
            <input
              id="invoice-search"
              name="q"
              defaultValue={q}
              placeholder="Nummer oder Titel ..."
              className={`${controlClass} w-60 pl-8`}
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <Search className="h-4 w-4" />
            Suchen
          </button>

          {status || q.trim() ? (
            <Link
              href="/finance/invoices"
              className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50"
            >
              Zuruecksetzen
            </Link>
          ) : null}
        </form>
      </CardHeader>

      <CardContent>
        {invoices.length === 0 ? (
          <EmptyState
            title="Keine Rechnungen gefunden"
            description="Es gibt keine Rechnungen, die zu den aktuellen Filtern passen. Passe die Filter an oder lege eine neue Rechnung an."
            action={<InvoiceQuickCreate />}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Nr</th>
                  <th className="px-4 py-2.5 font-medium">Titel</th>
                  <th className="px-4 py-2.5 font-medium">Kunde</th>
                  <th className="px-4 py-2.5 text-right font-medium">Betrag</th>
                  <th className="px-4 py-2.5 font-medium">Faellig</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {invoices.map((inv) => {
                  const eff = effectiveInvoiceStatus(inv);
                  return (
                    <tr key={inv.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-2.5 tabular-nums text-neutral-600">
                        {inv.invoice_number ?? "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/finance/invoices/${inv.id}`}
                          className="font-medium text-neutral-900 hover:text-brand-700"
                        >
                          {inv.title ?? "(ohne Titel)"}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700">
                        {inv.client?.name ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-900">
                        {formatCHF(inv.amount ?? 0)}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {inv.due_date ? formatDate(inv.due_date) : "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          label={statusLabel("invoice", eff)}
                          color={invoiceStatusColor(eff)}
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
  );
}
