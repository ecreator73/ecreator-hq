import { requireRole } from "@/lib/auth";
import { GrowthNav } from "@/components/growth/growth-nav";

export default async function GrowthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Revenue-Bereich: serverseitige Rollenpruefung fuer die gesamte Growth Engine.
  await requireRole(["super_admin", "ceo", "cso", "sales"]);
  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        Clients — Growth Engine
      </p>
      <GrowthNav />
      <div>{children}</div>
    </div>
  );
}
