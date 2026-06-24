import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SalesNav } from "@/components/sales/sales-nav";
import { LeadQuickCreate } from "@/components/sales/lead-quick-create";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Sales CRM"
        description="Von Lead bis Abschluss - Pipeline, Follow-ups, Angebote und Vertraege."
        actions={<LeadQuickCreate />}
      />
      <SalesNav />
      <div>{children}</div>
    </div>
  );
}
