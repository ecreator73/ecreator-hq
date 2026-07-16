import { requireRole } from "@/lib/auth";
import { LinkedInNav } from "@/components/linkedin/linkedin-nav";

export default async function LinkedInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sensibler Sales-Bereich: serverseitige Rollenpruefung fuer das gesamte LinkedIn-Modul.
  await requireRole(["super_admin", "ceo", "cso", "sales"]);
  return (
    <div className="space-y-5">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
        Sales — LinkedIn
      </p>
      <LinkedInNav />
      <div>{children}</div>
    </div>
  );
}
