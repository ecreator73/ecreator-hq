import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ExecutiveNav } from "@/components/executive/executive-nav";

export default async function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sensibler Bereich: serverseitige Rollenpruefung fuer den gesamten Executive-Bereich.
  await requireRole(["super_admin", "ceo", "cso"]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Executive"
        title="Command Center"
        description="Die ganze Firma auf einen Blick."
      />
      <ExecutiveNav />
      <div>{children}</div>
    </div>
  );
}
