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
import { clientCrmService } from "@/server/services/client-leads.service";
import type { Contract } from "@/types/entities";

/** Letzter Kuendigungstag: Ende (oder Start + Laufzeit) minus Kuendigungsfrist. */
function cancelBy(c: Contract): string | null {
  let end = c.end_date;
  if (!end && c.start_date && c.duration_months) {
    const d = new Date(`${c.start_date}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + c.duration_months);
    end = d.toISOString().slice(0, 10);
  }
  if (!end) return null;
  const d = new Date(`${end}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (c.cancellation_notice_days ?? 0));
  return d.toISOString().slice(0, 10);
}

export const metadata: Metadata = { title: "Verträge" };

export default async function ClientContractsPage() {
  const [contracts, clients, products] = await Promise.all([
    contractsService.list().catch(() => []),
    clientsService.list().catch(() => []),
    clientCrmService.pricingItems().catch(() => []),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);

  const clientName = new Map<string, string>();
  for (const client of clients) {
    clientName.set(client.id, client.name);
  }

  const active = contracts.filter((c) => c.status === "active");
  const totalMrr = active.reduce((sum, c) => sum + (c.value_monthly ?? 0), 0);
  const totalValue = active.reduce((sum, c) => sum + (c.value_total ?? 0), 0);
  const window60 = active.filter((c) => {
    const by = cancelBy(c);
    return by != null && by >= today && by <= in60;
  });

  const sorted = [...contracts].sort((a, b) => {
    const aActive = a.status === "active" ? 1 : 0;
    const bActive = b.status === "active" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return (b.value_monthly ?? 0) - (a.value_monthly ?? 0);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Aktive Verträge" value={active.length} tone="brand" />
        <KpiCard label="MRR" value={formatCHF(totalMrr)} />
        <KpiCard label="Gesamtwert (aktiv)" value={formatCHF(totalValue)} />
        <KpiCard label="Kündbar in 60 Tagen" value={window60.length} tone={window60.length ? "amber" : undefined} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verträge ({contracts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <EmptyState
              title="Noch keine Verträge"
              description="Importiere Verträge ueber den Import-Tab."
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
                    <th className="px-4 py-2.5 font-medium">Kündbar bis</th>
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
                        <td className="px-4 py-2.5 text-neutral-600">
                          {(() => {
                            const by = c.status === "active" ? cancelBy(c) : null;
                            if (!by) return "-";
                            if (by < today) return <span className="text-neutral-400">abgelaufen</span>;
                            const soon = by >= today && by <= in60;
                            return (
                              <span className={soon ? "font-medium text-amber-700" : undefined}>
                                {formatDate(by)}
                                {c.auto_renew ? <span className="block text-xs text-neutral-400">{c.renewal_months ? `sonst +${c.renewal_months} Mt.` : "verlängert automatisch"}</span> : null}
                              </span>
                            );
                          })()}
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
      <Card>
        <CardHeader>
          <CardTitle>Produkte und Preise ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <EmptyState title="Keine Produkte" description="Produkte erscheinen hier, sobald sie erfasst oder importiert sind." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Produkt</th>
                    <th className="px-4 py-2.5 font-medium">Paket</th>
                    <th className="px-4 py-2.5 font-medium">Einheit</th>
                    <th className="px-4 py-2.5 text-right font-medium">Preis</th>
                    <th className="px-4 py-2.5 font-medium">Abrechnung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {products.map((p) => (
                    <tr key={p.id} className={p.active ? undefined : "opacity-50"}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-neutral-900">{p.name}</p>
                        {p.description ? <p className="text-xs text-neutral-500">{p.description}</p> : null}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">{p.package ?? p.category ?? "-"}</td>
                      <td className="px-4 py-2.5 text-neutral-600">{p.unit ?? "-"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">{p.price_on_request ? "auf Anfrage" : formatCHF(p.unit_price)}</td>
                      <td className="px-4 py-2.5 text-neutral-600">{p.recurring ? "monatlich" : "einmalig"}</td>
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
