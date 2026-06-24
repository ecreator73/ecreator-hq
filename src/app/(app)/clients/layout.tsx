import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ClientsNav } from "@/components/clients/clients-nav";
import { ClientQuickCreate } from "@/components/clients/client-quick-create";

export default async function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Client Management"
        description="Kundenbetreuung im Blick - letzter Kontakt, naechster Reporting-Call und offene Aufgaben."
        actions={<ClientQuickCreate />}
      />
      <ClientsNav />
      <div>{children}</div>
    </div>
  );
}
