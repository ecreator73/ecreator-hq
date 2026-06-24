import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { FinanceNav } from "@/components/finance/finance-nav";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sensibler Bereich: serverseitige Rollenpruefung fuer den gesamten Finance-Bereich.
  await requireRole(["super_admin", "ceo", "finance"]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Finance"
        description="Umsatz, MRR/ARR, Forecast, Kundenwert und Rentabilitaet auf einen Blick."
      />
      <FinanceNav />
      <div>{children}</div>
    </div>
  );
}
