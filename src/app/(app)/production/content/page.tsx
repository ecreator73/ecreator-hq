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
import { ContentProjectQuickCreate } from "@/components/production/content-project-quick-create";
import { contentProjectsService } from "@/server/services";
import type { ContentProjectWithRelations } from "@/types/entities";
import {
  CONTENT_PROJECT_STATUSES,
  CONTENT_TYPE_LABELS,
  CONTENT_PLATFORM_LABELS,
  statusLabel,
} from "@/config/catalog";

export const metadata: Metadata = { title: "Content - Production Hub" };

function statusColor(status: string): string | undefined {
  return CONTENT_PROJECT_STATUSES.find((s) => s.key === status)?.color;
}

function typeLabel(key: string | null): string {
  if (!key) return "-";
  return (
    CONTENT_TYPE_LABELS[key as keyof typeof CONTENT_TYPE_LABELS] ?? key
  );
}

function platformLabel(key: string | null): string {
  if (!key) return "-";
  return (
    CONTENT_PLATFORM_LABELS[key as keyof typeof CONTENT_PLATFORM_LABELS] ?? key
  );
}

export default async function ContentProjectsPage() {
  let items: ContentProjectWithRelations[] = [];
  try {
    items = await contentProjectsService.list();
  } catch {
    items = [];
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Content-Produktionen ({items.length})</CardTitle>
          <ContentProjectQuickCreate />
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="Keine Content-Produktionen"
            description="Lege eine Content-Produktion an, um Drehs, Skripte und Freigaben zu planen."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Titel</th>
                  <th className="px-4 py-2.5 font-medium">Kunde</th>
                  <th className="px-4 py-2.5 font-medium">Content-Typ</th>
                  <th className="px-4 py-2.5 font-medium">Plattform</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Verantwortlich</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((p) => (
                  <tr key={p.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/production/content/${p.id}`}
                        className="font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {p.title ?? "Ohne Titel"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {p.client?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {typeLabel(p.content_type)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {platformLabel(p.platform)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={statusLabel("content_project", p.status)}
                        color={statusColor(p.status)}
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
