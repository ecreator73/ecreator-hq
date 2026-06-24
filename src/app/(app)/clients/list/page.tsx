import type { Metadata } from "next";
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
          <ClientsTable clients={clients} />
        )}
      </CardContent>
    </Card>
  );
}
