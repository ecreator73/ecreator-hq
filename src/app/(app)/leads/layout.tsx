import { requireRole } from "@/lib/auth";
import { SalesNav, SalesAreaHeader } from "@/components/sales/sales-nav";
import { LeadQuickCreate } from "@/components/sales/lead-quick-create";

/**
 * Leads-Bereich. Nutzt denselben Kopf/Tab-Satz wie /sales, der sich anhand
 * der Route automatisch auf "Leads" stellt.
 */
export default async function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["super_admin", "ceo", "cso", "sales"]);
  return (
    <div className="space-y-6">
      <SalesAreaHeader action={<LeadQuickCreate />} />
      <SalesNav />
      <div>{children}</div>
    </div>
  );
}
