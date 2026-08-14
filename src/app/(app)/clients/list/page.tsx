import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientsFilterBar } from "@/components/clients/clients-filter-bar";
import { ClientsTable } from "@/components/clients/clients-table";
import { clientsOpsService } from "@/server/services";
import type { ClientFilters } from "@/server/services";
import type { ClientWithStats } from "@/types/entities";
import { clientFormOptionsAction } from "@/app/(app)/clients/actions";

export const metadata: Metadata = { title: "Clients - Kunden" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

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

  // Unabhaengige Abrufe parallel.
  const [clients] = await Promise.all([
    clientsOpsService
      .listWithStats(filters)
      .catch(() => [] as ClientWithStats[]),
    // Optionen werden geladen, damit die Server Action im Demo-Modus nicht wirft.
    clientFormOptionsAction().catch(() => null),
  ]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Kunden ({clients.length})</CardTitle>
          <Link
            href="/clients/import"
            title="Kunden aus einer Datei importieren"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Import
          </Link>
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
          <ClientsTable clients={clients} />
        )}
      </CardContent>
    </Card>
  );
}
