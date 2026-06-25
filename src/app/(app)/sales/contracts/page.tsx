import type { Metadata } from "next";
import Link from "next/link";
import {
  contractsService,
  salesDashboardService,
  clientsService,
} from "@/server/services";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { ContractRenewalButton } from "@/components/sales/contract-renewal-button";
import { STATUS_REGISTRY, statusLabel, CONTRACT_TYPES } from "@/config/catalog";
import { formatDate, formatCHF } from "@/lib/utils";
import type { Contract } from "@/types/entities";

export const metadata: Metadata = { title: "Sales - Verträge" };

/** Datum formatieren, null/leer -> "-" (kein "Invalid Date" im Demo-Modus). */
function fmtDate(value: string | null): string {
  return value ? formatDate(value) : "-";
}

const CONTRACT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CONTRACT_TYPES.map((t) => [t.key, t.label]),
);

function contractStatusColor(status: string | null) {
  if (!status) return undefined;
  return STATUS_REGISTRY.contract[status as keyof typeof STATUS_REGISTRY.contract]
    ?.color;
}

export default async function ContractsPage() {
  let contracts: Contract[] = [];
  try {
    contracts = await contractsService.list();
  } catch {
    contracts = [];
  }

  let expiring: Contract[] = [];
  try {
    expiring = await salesDashboardService.contractsExpiring(90);
  } catch {
    expiring = [];
  }

  // Kundennamen (Firma) je client_id - die Vertragstitel sind generisch ("Retainer").
  const clients = await clientsService.list().catch(() => []);
  const clientName = new Map<string, string>();
  for (const cl of clients) clientName.set(cl.id, cl.name);
  const nameOf = (id: string | null) => (id ? clientName.get(id) ?? "—" : "—");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Verträge"
        description="Laufende Verträge, Werte und auslaufende Mandate im Blick."
      />

      {/* Auslaufende Verträge */}
      <Card>
        <CardHeader>
          <CardTitle>Laufen aus (naechste 90 Tage)</CardTitle>
          <CardDescription>
            Rechtzeitig verlaengern - hier liegt wiederkehrender Umsatz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expiring.length === 0 ? (
            <EmptyState
              title="Keine auslaufenden Verträge"
              description="In den naechsten 90 Tagen laeuft kein Vertrag aus."
            />
          ) : (
            <div className="space-y-4">
              <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                {expiring.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium text-neutral-900">
                      {nameOf(c.client_id)}
                      <span className="ml-2 font-normal text-neutral-400">{c.title}</span>
                    </span>
                    <span className="shrink-0 text-neutral-500">
                      bis {fmtDate(c.end_date)}
                    </span>
                  </li>
                ))}
              </ul>
              <ContractRenewalButton />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Haupttabelle */}
      {contracts.length === 0 ? (
        <EmptyState
          title="Keine Verträge vorhanden"
          description="Sobald aus Angeboten Verträge entstehen, erscheinen sie hier."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[60rem] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-2.5 font-medium">Kunde</th>
                <th className="px-4 py-2.5 font-medium">Titel</th>
                <th className="px-4 py-2.5 font-medium">Typ</th>
                <th className="px-4 py-2.5 font-medium">Monatswert</th>
                <th className="px-4 py-2.5 font-medium">Gesamtwert</th>
                <th className="px-4 py-2.5 font-medium">Laufzeit</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2.5 font-medium text-neutral-900">
                    {c.client_id ? (
                      <Link
                        href={`/clients/${c.client_id}`}
                        className="hover:text-brand-700"
                      >
                        {nameOf(c.client_id)}
                      </Link>
                    ) : (
                      nameOf(c.client_id)
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">{c.title}</td>
                  <td className="px-4 py-2.5 text-neutral-500">
                    {c.contract_type
                      ? CONTRACT_TYPE_LABELS[c.contract_type] ?? c.contract_type
                      : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-700">
                    {formatCHF(c.value_monthly, c.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-700">
                    {formatCHF(c.value_total, c.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">
                    {fmtDate(c.start_date)} - {fmtDate(c.end_date)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      label={statusLabel("contract", c.status)}
                      color={contractStatusColor(c.status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
