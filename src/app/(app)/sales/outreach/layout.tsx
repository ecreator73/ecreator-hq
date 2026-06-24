import { requireRole } from "@/lib/auth";
import { OutreachNav } from "@/components/outreach/outreach-nav";

export default async function OutreachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sensibler Sales-Bereich: serverseitige Rollenpruefung fuer die gesamte Outreach-Engine.
  await requireRole(["super_admin", "ceo", "cso", "sales"]);
  return (
    <div className="space-y-5">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
        Sales — Outreach
      </p>
      <OutreachNav />
      <div>{children}</div>
    </div>
  );
}
