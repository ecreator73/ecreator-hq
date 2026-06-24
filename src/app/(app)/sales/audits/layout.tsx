import { requireRole } from "@/lib/auth";
import { AuditsNav } from "@/components/audits/audits-nav";

export default async function AuditsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sensibler Bereich: serverseitige Rollenpruefung fuer das Website-Audit-Modul.
  await requireRole(["super_admin", "ceo", "cso", "sales"]);
  return (
    <div className="space-y-5">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
        Sales — Website Audits
      </p>
      <AuditsNav />
      <div>{children}</div>
    </div>
  );
}
