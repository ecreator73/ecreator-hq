import { requireRole } from "@/lib/auth";
import { LeadEngineNav } from "@/components/lead-engine/lead-engine-nav";

export default async function LeadEngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sensibler Bereich: serverseitige Rollenpruefung fuer die gesamte Lead Engine.
  await requireRole(["super_admin", "ceo", "cso", "sales"]);
  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Sales — Lead Engine
      </p>
      <LeadEngineNav />
      <div>{children}</div>
    </div>
  );
}
