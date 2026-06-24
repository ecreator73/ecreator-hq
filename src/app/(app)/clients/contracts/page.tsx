import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { KpiCard } from "@/components/finance/kpi-card";
import { contractsService, clientsService } from "@/server/services";
import { CONTRACT_STATUSES, CONTRACT_TYPES, statusLabel } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Vertraege" };

export default async function ClientContractsPage() {
  const [contracts, clients] = await Promise.all([
    contractsService.list().catch(() => []),
    clientsService.list().catch(() => []),
  ]);

  const clientName = new Map<string, string>();
  for (const client of clients) {
    clientName.set(client.id, client.name);
  }

  const active = contracts.filter((c) => c.status === "active");
  const totalMrr = active.reduce((sum, c) => sum + (c.value_monthly ?? 0), 0);
  const totalValue = active.reduce((sum, c) => sum + (c.value_total ?? 0), 0);

  const sorted = [...contracts].sort((a, b) => {
    const aActive = a.status === "active" ? 1 : 0;
    const bActive = b.status === "active" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return (b.value_monthly ?? 0) - (a.value_monthly ?? 0);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Aktive Vertraege" value={active.length} tone="brand" />
        <KpiCard label="MRR" value={formatCHF(totalMrr)} />
        <KpiCard label="Gesamtwert (aktiv)" value={formatCHF(totalValue)} />
        <KpiCard label="Vertraege gesamt" value={contracts.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vertraege ({contracts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <EmptyState
              title="Noch keine Vertraege"
              description="Importiere Vertraege ueber den Import-Tab."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[72rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Kunde</th>
                    <th className="px-4 py-2.5 font-medium">Titel</th>
                    <th className="px-4 py-2.5 font-medium">Typ</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Monatswert
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Gesamtwert
                    </th>
                    <th className="px-4 py-2.5 font-medium">Start</th>
                    <th className="px-4 py-2.5 font-medium">Ende</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {sorted.map((c) => {
                    const name = clientName.get(c.client_id) ?? "-";
                    return (
                      <tr key={c.id} className="align-top hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          {c.client_id ? (
                            <Link
                              href={`/clients/${c.client_id}`}
                              className="font-medium text-neutral-900 hover:text-brand-700"
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="text-neutral-700">{name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-700">
                          {c.title}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">
                          {CONTRACT_TYPES.find((t) => t.key === c.contract_type)
                            ?.label ?? "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                          {formatCHF(c.value_monthly)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                          {formatCHF(c.value_total)}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">
                          {c.start_date ? formatDate(c.start_date) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">
                          {c.end_date ? formatDate(c.end_date) : "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge
                            label={statusLabel("contract", c.status)}
                            color={
                              CONTRACT_STATUSES.find((s) => s.key === c.status)
                                ?.color
                            }
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
    </div>
  );
}
