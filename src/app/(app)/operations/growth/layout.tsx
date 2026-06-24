import { requireRole } from "@/lib/auth";
import { GrowthEngineNav } from "@/components/growth-engine/growth-engine-nav";

/**
 * Growth Engine: nur super_admin/ceo/cso duerfen die Orchestrierungsschicht
 * sehen und konfigurieren (serverseitige Rollenpruefung fuer den gesamten
 * Sub-Tree). Die Kopfzeile liefert das Operations-Layout (route-aware).
 */
export default async function GrowthEngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["super_admin", "ceo", "cso"]);

  return (
    <div className="space-y-6">
      <GrowthEngineNav />
      <div>{children}</div>
    </div>
  );
}
