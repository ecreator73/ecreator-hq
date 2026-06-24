import type { Metadata } from "next";
import Link from "next/link";
import { salesActivitiesService } from "@/server/services";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { SALES_ACTIVITY_TYPE_LABELS } from "@/config/catalog";
import { formatDate } from "@/lib/utils";
import type { SalesActivity } from "@/types/entities";

export const metadata: Metadata = { title: "Sales - Aktivitaeten" };

export default async function ActivitiesPage() {
  let acts: SalesActivity[] = [];
  try {
    acts = await salesActivitiesService.recent();
  } catch {
    acts = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Aktivitaeten"
        description="Globale Timeline aller Sales-Aktivitaeten - Calls, E-Mails, Notizen und mehr."
      />

      {acts.length === 0 ? (
        <EmptyState
          title="Keine Aktivitaeten vorhanden"
          description="Sobald Calls, E-Mails oder Notizen erfasst werden, erscheinen sie hier."
        />
      ) : (
        <ol className="space-y-3">
          {acts.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">
                  {SALES_ACTIVITY_TYPE_LABELS[
                    a.type as keyof typeof SALES_ACTIVITY_TYPE_LABELS
                  ] ?? a.type}
                </Badge>
                {a.lead?.company_name ? (
                  <Link
                    href={`/sales/leads/${a.lead_id}`}
                    className="text-sm font-medium text-brand-700 hover:underline"
                  >
                    {a.lead.company_name}
                  </Link>
                ) : null}
                <span className="ml-auto text-xs text-neutral-400">
                  {formatDate(a.activity_date)}
                </span>
              </div>

              {a.subject ? (
                <p className="mt-2 text-sm font-medium text-neutral-900">
                  {a.subject}
                </p>
              ) : null}
              {a.body ? (
                <p className="mt-1 whitespace-pre-line text-sm text-neutral-600">
                  {a.body}
                </p>
              ) : null}

              {a.author?.full_name ? (
                <p className="mt-2 text-xs text-neutral-400">
                  von {a.author.full_name}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
