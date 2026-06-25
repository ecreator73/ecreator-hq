import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ClientsOverviewTable } from "@/components/clients/clients-overview-table";
import { clientsOpsService } from "@/server/services";
import type { ClientWithStats } from "@/types/entities";

export const metadata: Metadata = { title: "Clients - Offboarding" };

export default async function OffboardingPage() {
  let clients: ClientWithStats[] = [];
  try {
    const all = await clientsOpsService.listWithStats();
    clients = all.filter((c) => c.status === "ended" || c.status === "paused");
  } catch {
    clients = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Offboarding"
        description="Beendete und pausierte Kunden - mit verknuepften Vertraegen, Projekten und offenen Aufgaben fuer einen sauberen Abschluss."
      />
      <ClientsOverviewTable
        clients={clients}
        emptyTitle="Kein Kunde im Offboarding"
        emptyDescription="Beendete oder pausierte Kunden erscheinen hier automatisch."
      />
    </div>
  );
}
