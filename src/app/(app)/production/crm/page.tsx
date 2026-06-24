import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { CrmProjectQuickCreate } from "@/components/production/crm-project-quick-create";
import { crmProjectsService } from "@/server/services";
import type { CrmProjectWithRelations } from "@/types/entities";
import {
  CRM_PROJECT_STATUSES,
  CRM_TYPE_LABELS,
  statusLabel,
} from "@/config/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Production - CRM" };

function crmStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return CRM_PROJECT_STATUSES.find((s) => s.key === status)?.color;
}

function crmTypeLabel(type: string | null): string {
  if (!type) return "-";
  return CRM_TYPE_LABELS[type as keyof typeof CRM_TYPE_LABELS] ?? type;
}

export default async function CrmProjectsPage() {
  const items: CrmProjectWithRelations[] = await crmProjectsService
    .list()
    .catch(() => []);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>CRM-Projekte ({items.length})</CardTitle>
          <CrmProjectQuickCreate />
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="Keine CRM-Projekte"
            description="Lege ein CRM-Projekt an, um Workflows, Automationen und Integrationen pro Kunde zu buendeln."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Titel</th>
                  <th className="px-4 py-2.5 font-medium">Kunde</th>
                  <th className="px-4 py-2.5 font-medium">CRM-Typ</th>
                  <th className="px-4 py-2.5 font-medium">Go-Live</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Verantwortlich</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/production/crm/${p.id}`}
                        className="font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {p.title ?? "Ohne Titel"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {p.client?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {crmTypeLabel(p.crm_type)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {p.go_live_date ? formatDate(p.go_live_date) : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={statusLabel("crm_project", p.status)}
                        color={crmStatusColor(p.status)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {p.owner?.full_name ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
