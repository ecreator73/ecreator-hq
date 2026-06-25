import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProjectListItem } from "@/server/services";

/** Einheitliche Tabelle aller Produktionsprojekte (alle Typen). */
export function ProjectsTable({ items }: { items: ProjectListItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Keine Projekte"
        description="Es sind aktuell keine Produktionsprojekte vorhanden."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[44rem] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-4 py-2.5 font-medium">Projekt</th>
            <th className="px-4 py-2.5 font-medium">Typ</th>
            <th className="px-4 py-2.5 font-medium">Kunde</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {items.map((p) => (
            <tr key={`${p.type}-${p.id}`} className="hover:bg-neutral-50">
              <td className="px-4 py-2.5 font-medium text-neutral-900">
                <Link href={p.href} className="hover:text-brand-700">
                  {p.title}
                </Link>
              </td>
              <td className="px-4 py-2.5">
                <Badge tone="neutral">{p.typeLabel}</Badge>
              </td>
              <td className="px-4 py-2.5 text-neutral-600">
                {p.clientName ? (
                  p.clientId ? (
                    <Link href={`/clients/${p.clientId}`} className="hover:text-brand-700">
                      {p.clientName}
                    </Link>
                  ) : (
                    p.clientName
                  )
                ) : (
                  <span className="text-neutral-300">—</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <Badge tone="brand">{p.statusLabel}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
