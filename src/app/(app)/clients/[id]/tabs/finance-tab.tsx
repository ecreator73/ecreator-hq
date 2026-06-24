"use client";

import { useMemo } from "react";
import { Section, EmptyRow } from "../detail-ui";
import { statusColorOf } from "../detail-ui";
import { StatusBadge } from "@/components/tasks/status-badge";
import { KpiCard } from "@/components/finance/kpi-card";
import { statusLabel } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import type { ClientWithStats, InvoiceWithClient, Contract } from "@/types/entities";

export function FinanceTab({
  client,
  invoices,
  contracts: _contracts,
}: {
  client: ClientWithStats;
  invoices: InvoiceWithClient[];
  contracts: Contract[];
}) {
  const paid = useMemo(
    () => invoices.filter((i) => i.status === "paid"),
    [invoices],
  );
  const openInv = useMemo(
    () => invoices.filter((i) => i.status === "open" || i.status === "overdue"),
    [invoices],
  );

  const ltv = paid.reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const paidAmount = paid.reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const openAmount = openInv.reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const sorted = useMemo(() => {
    return [...invoices].sort((a, b) => {
      // due_date desc, nulls last
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return b.due_date.localeCompare(a.due_date);
    });
  }, [invoices]);

  return (
    <div className="space-y-5">
      {/* KPI-Raster */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="MRR" value={formatCHF(client.mrr)} tone="brand" />
        <KpiCard label="Umsatz / Lifetime Value" value={formatCHF(ltv)} />
        <KpiCard
          label="Offene Rechnungen"
          value={`${openInv.length}`}
          sublabel={formatCHF(openAmount)}
          tone={openInv.length > 0 ? "amber" : "neutral"}
        />
        <KpiCard
          label="Bezahlte Rechnungen"
          value={`${paid.length}`}
          sublabel={formatCHF(paidAmount)}
          tone="green"
        />
      </div>

      {/* Rechnungen */}
      <Section title="Rechnungen">
        {invoices.length === 0 ? (
          <EmptyRow>Keine Rechnungen erfasst.</EmptyRow>
        ) : (
          <>
            {/* Mobile: Karten */}
            <ul className="space-y-3 sm:hidden">
              {sorted.map((i) => (
                <li
                  key={i.id}
                  className="rounded-lg border border-neutral-200 p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {i.title ?? "Rechnung"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-400">
                        {i.invoice_number ?? "—"}
                      </p>
                    </div>
                    <StatusBadge
                      label={statusLabel("invoice", i.status)}
                      color={statusColorOf("invoice", i.status)}
                    />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <dl className="space-y-1 text-xs text-neutral-500">
                      <div className="flex gap-1.5">
                        <dt className="text-neutral-400">Faellig</dt>
                        <dd className="text-neutral-700">
                          {i.due_date ? formatDate(i.due_date) : "—"}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-neutral-400">Bezahlt</dt>
                        <dd className="text-neutral-700">
                          {i.paid_date ? formatDate(i.paid_date) : "—"}
                        </dd>
                      </div>
                    </dl>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900">
                      {formatCHF(i.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: Tabelle */}
            <div className="hidden overflow-hidden rounded-lg border border-neutral-200 sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/60 text-left text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Nr</th>
                    <th className="px-4 py-2.5 font-medium">Titel</th>
                    <th className="px-4 py-2.5 text-right font-medium">Betrag</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Faellig</th>
                    <th className="px-4 py-2.5 font-medium">Bezahlt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {sorted.map((i) => (
                    <tr key={i.id} className="transition-colors hover:bg-neutral-50/60">
                      <td className="px-4 py-3 tabular-nums text-neutral-500">
                        {i.invoice_number ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-900">
                        {i.title ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-neutral-900">
                        {formatCHF(i.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={statusLabel("invoice", i.status)}
                          color={statusColorOf("invoice", i.status)}
                        />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-neutral-600">
                        {i.due_date ? formatDate(i.due_date) : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-neutral-600">
                        {i.paid_date ? formatDate(i.paid_date) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
