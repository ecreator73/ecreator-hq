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
import { AdProjectQuickCreate } from "@/components/production/ad-project-quick-create";
import { adProjectsService } from "@/server/services";
import type { AdProjectWithRelations } from "@/types/entities";
import {
  AD_PLATFORM_LABELS,
  AD_PROJECT_STATUSES,
  statusLabel,
} from "@/config/catalog";
import { formatCHF } from "@/lib/utils";

export const metadata: Metadata = { title: "Production - Ads" };

/** Catalog-Farbe fuer einen Ads-Projekt-Status (fuer StatusBadge). */
function adStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return AD_PROJECT_STATUSES.find((s) => s.key === status)?.color;
}

function platformLabel(platform: string | null): string {
  if (!platform) return "-";
  return (
    AD_PLATFORM_LABELS[platform as keyof typeof AD_PLATFORM_LABELS] ?? platform
  );
}

export default async function AdProjectsListPage() {
  const items: AdProjectWithRelations[] = await adProjectsService
    .list()
    .catch(() => []);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Ad-Kampagnen ({items.length})</CardTitle>
          <AdProjectQuickCreate />
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="Keine Ad-Kampagnen"
            description="Lege eine neue Ad-Kampagne an, um Werbeprojekte fuer deine Kunden zu steuern."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[60rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Titel</th>
                  <th className="px-4 py-2.5 font-medium">Kunde</th>
                  <th className="px-4 py-2.5 font-medium">Plattform</th>
                  <th className="px-4 py-2.5 text-right font-medium">Budget</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Verantwortlich</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((p) => (
                  <tr key={p.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/production/ads/${p.id}`}
                        className="font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {p.title ?? "Ohne Titel"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {p.client?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {platformLabel(p.platform)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {p.budget != null ? formatCHF(p.budget) : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={statusLabel("ad_project", p.status)}
                        color={adStatusColor(p.status)}
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
