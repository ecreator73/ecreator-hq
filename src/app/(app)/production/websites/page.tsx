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
import { WebsiteProjectQuickCreate } from "@/components/production/website-project-quick-create";
import { websiteProjectsService } from "@/server/services";
import type { WebsiteProjectWithRelations } from "@/types/entities";
import { WEBSITE_PROJECT_STATUSES, statusLabel } from "@/config/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Production - Websites" };

function statusColor(status: string): string | undefined {
  return WEBSITE_PROJECT_STATUSES.find((s) => s.key === status)?.color;
}

export default async function WebsiteProjectsPage() {
  const items: WebsiteProjectWithRelations[] = await websiteProjectsService
    .list()
    .catch(() => []);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Websites ({items.length})</CardTitle>
          <WebsiteProjectQuickCreate />
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="Keine Website-Projekte"
            description="Lege ein Website-Projekt an, um Domain, CMS, SEO und Launch im Blick zu behalten."
            action={<WebsiteProjectQuickCreate />}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[60rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Projekt</th>
                  <th className="px-4 py-2.5 font-medium">Kunde</th>
                  <th className="px-4 py-2.5 font-medium">Domain</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Launch</th>
                  <th className="px-4 py-2.5 font-medium">Verantwortlich</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((p) => (
                  <tr key={p.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/production/websites/${p.id}`}
                        className="font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {p.title || p.domain || "Ohne Titel"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {p.client?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {p.domain ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={statusLabel("website_project", p.status)}
                        color={statusColor(p.status)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {p.launch_date ? formatDate(p.launch_date) : "-"}
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
