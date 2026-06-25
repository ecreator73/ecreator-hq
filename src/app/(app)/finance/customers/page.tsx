import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { financeService } from "@/server/services";
import type { CustomerValue } from "@/types/entities";
import { formatCHF } from "@/lib/utils";

export const metadata: Metadata = { title: "Finance - Kunden" };

export default async function FinanceCustomersPage() {
  let cv: CustomerValue[] = [];
  try {
    cv = await financeService.customerValues();
  } catch {
    cv = [];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kundenwert &amp; Profitabilitaet ({cv.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {cv.length === 0 ? (
          <EmptyState
            title="Keine Kundendaten"
            description="Sobald Kunden mit Verträgen oder bezahlten Rechnungen erfasst sind, erscheint hier die Wertanalyse je Kunde."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Kunde</th>
                  <th className="px-4 py-2.5 text-right font-medium">MRR</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Gesamtumsatz
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">Laufzeit</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Ø Monatswert
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">Offen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {cv.map((row) => (
                  <tr key={row.client.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/clients/${row.client.id}`}
                        className="font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {row.client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {formatCHF(row.mrr)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {formatCHF(row.totalRevenue)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">
                      {row.runtimeMonths} Mt
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {formatCHF(row.avgMonthly)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span
                        className={
                          row.openAmount > 0
                            ? "text-amber-600"
                            : "text-neutral-500"
                        }
                      >
                        {formatCHF(row.openAmount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
