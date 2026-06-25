import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ClientsOverviewTable } from "@/components/clients/clients-overview-table";
import { clientsOpsService } from "@/server/services";
import type { ClientWithStats } from "@/types/entities";

export const metadata: Metadata = { title: "Clients - Onboarding" };

export default async function OnboardingPage() {
  let clients: ClientWithStats[] = [];
  try {
    clients = await clientsOpsService.listWithStats({ status: "onboarding" });
  } catch {
    clients = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Onboarding"
        description="Kunden im Onboarding - automatisch verknuepft mit Status, Verträgen, Projekten und Aufgaben. Klicke auf einen Kunden fuer Checkliste und Details."
      />
      <ClientsOverviewTable
        clients={clients}
        emptyTitle="Kein Kunde im Onboarding"
        emptyDescription="Sobald ein Kunde den Status Onboarding hat, erscheint er hier."
      />
    </div>
  );
}
