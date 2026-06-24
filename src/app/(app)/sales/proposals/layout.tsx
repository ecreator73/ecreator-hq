import { requireRole } from "@/lib/auth";
import { ProposalsNav } from "@/components/proposals/proposals-nav";

export default async function ProposalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sensibler Bereich: serverseitige Rollenpruefung fuer die gesamte Proposal Engine.
  await requireRole(["super_admin", "ceo", "cso", "sales"]);
  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        Sales — Proposal Engine
      </p>
      <ProposalsNav />
      <div>{children}</div>
    </div>
  );
}
