import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { statusLabel } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import type { ClientWithStats } from "@/types/entities";

/** Kompakte Kundentabelle fuer Onboarding-/Offboarding-Uebersichten. */
export function ClientsOverviewTable({
  clients,
  emptyTitle,
  emptyDescription,
}: {
  clients: ClientWithStats[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (clients.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[46rem] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-4 py-2.5 font-medium">Kunde</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Account Manager</th>
            <th className="px-4 py-2.5 font-medium">Start</th>
            <th className="px-4 py-2.5 text-right font-medium">MRR</th>
            <th className="px-4 py-2.5 font-medium">Hinweise</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {clients.map((c) => (
            <tr key={c.id} className="hover:bg-neutral-50">
              <td className="px-4 py-2.5 font-medium text-neutral-900">
                <Link href={`/clients/${c.id}`} className="hover:text-brand-700">
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-2.5">
                <Badge tone="brand">{statusLabel("client", c.status)}</Badge>
              </td>
              <td className="px-4 py-2.5 text-neutral-600">
                {c.account_manager?.full_name ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-neutral-600">
                {c.start_date ? formatDate(c.start_date) : "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                {formatCHF(c.mrr)}
              </td>
              <td className="px-4 py-2.5">
                {c.warnings.length > 0 ? (
                  <Badge tone="amber">{c.warnings.length} Hinweis(e)</Badge>
                ) : (
                  <span className="text-neutral-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
