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
import { ClientWarnings } from "@/components/clients/client-warnings";
import { ClientsFilterBar } from "@/components/clients/clients-filter-bar";
import { clientsOpsService } from "@/server/services";
import type { ClientFilters } from "@/server/services";
import type { ClientWithStats } from "@/types/entities";
import {
  CLIENT_PACKAGE_LABELS,
  statusLabel,
  STATUS_REGISTRY,
} from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import { clientFormOptionsAction } from "@/app/(app)/clients/actions";

export const metadata: Metadata = { title: "Clients - Kunden" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

function packageLabel(pkg: string | null): string {
  if (!pkg) return "-";
  return (
    CLIENT_PACKAGE_LABELS[pkg as keyof typeof CLIENT_PACKAGE_LABELS] ?? pkg
  );
}

function clientStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return STATUS_REGISTRY.client[status as keyof typeof STATUS_REGISTRY.client]
    ?.color;
}

export default async function ClientsListPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const filters: ClientFilters = {
    status: one(sp.status),
    account_manager_id: one(sp.owner),
    search: one(sp.search),
  };

  let clients: ClientWithStats[] = [];
  try {
    clients = await clientsOpsService.listWithStats(filters);
  } catch {
    clients = [];
  }

  // Optionen werden geladen, damit die Server Action im Demo-Modus nicht wirft.
  await clientFormOptionsAction().catch(() => null);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Kunden ({clients.length})</CardTitle>
        </div>
        <ClientsFilterBar
          initialStatus={filters.status ?? ""}
          initialSearch={filters.search ?? ""}
        />
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <EmptyState
            title="Keine Kunden gefunden"
            description="Es gibt keine Kunden, die zu den aktuellen Filtern passen. Passe die Filter an oder lege einen neuen Kunden an."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[68rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Firma</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Paket</th>
                  <th className="px-4 py-2.5 text-right font-medium">MRR</th>
                  <th className="px-4 py-2.5 font-medium">Start</th>
                  <th className="px-4 py-2.5 font-medium">Letzter Kontakt</th>
                  <th className="px-4 py-2.5 font-medium">Naechster Reporting</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Offene Aufgaben
                  </th>
                  <th className="px-4 py-2.5 font-medium">Verantwortlich</th>
                  <th className="px-4 py-2.5 font-medium">Warnungen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {clients.map((c) => (
                  <tr key={c.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/clients/${c.id}`}
                        className="font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={statusLabel("client", c.status)}
                        color={clientStatusColor(c.status)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {packageLabel(c.package)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {formatCHF(c.mrr)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {c.start_date ? formatDate(c.start_date) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {c.last_contact ? formatDate(c.last_contact) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {c.next_reporting ? formatDate(c.next_reporting) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {c.open_tasks}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {c.account_manager?.full_name ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.warnings.length > 0 ? (
                        <ClientWarnings warnings={c.warnings} />
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
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
