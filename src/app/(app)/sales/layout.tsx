import { requireUser } from "@/lib/auth";
import { SalesNav, SalesAreaHeader } from "@/components/sales/sales-nav";
import { LeadQuickCreate } from "@/components/sales/lead-quick-create";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="space-y-6">
      {/* Kopf + Tabs richten sich nach dem Bereich (Leads oder Sales). */}
      <SalesAreaHeader action={<LeadQuickCreate />} />
      <SalesNav />
      <div>{children}</div>
    </div>
  );
}
