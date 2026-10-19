import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ClientsOverviewTable } from "@/components/clients/clients-overview-table";
import { clientsOpsService } from "@/server/services";
import type { ClientWithStats } from "@/types/entities";
import { OnboardingSubmissions } from "@/components/clients/onboarding-submissions";
import { clientCrmService } from "@/server/services/client-leads.service";

export const metadata: Metadata = { title: "Clients - Onboarding" };

export default async function OnboardingPage() {
  const [all, submissions] = await Promise.all([
    clientsOpsService.listWithStats({}).catch((): ClientWithStats[] => []),
    clientCrmService.onboardingSubmissions().catch(() => []),
  ]);
  const clients = all.filter((c) => c.status === "onboarding");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Onboarding"
        description="Kunden im Onboarding - automatisch verknuepft mit Status, Verträgen, Projekten und Aufgaben. Klicke auf einen Kunden fuer Checkliste und Details."
      />
      <OnboardingSubmissions submissions={submissions} clients={all.map((c) => ({ id: c.id, name: c.name }))} />
      <ClientsOverviewTable
        clients={clients}
        emptyTitle="Kein Kunde im Onboarding"
        emptyDescription="Sobald ein Kunde den Status Onboarding hat, erscheint er hier."
      />
    </div>
  );
}
