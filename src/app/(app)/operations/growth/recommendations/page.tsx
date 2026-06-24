import Link from "next/link";
import { ArrowUpRight, Lightbulb } from "lucide-react";

import { growthRecommendationsService } from "@/server/services";
import { formatCHF } from "@/lib/utils";
import {
  RECOMMENDATION_PRIORITIES,
  RECOMMENDATION_PRIORITY_LABELS,
  RECOMMENDATION_STATUSES,
  recommendationPriorityColor,
  recommendationPriorityRank,
} from "@/config/catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { StatusSelect } from "@/components/production/status-select";
import { GrowthEngineScan } from "@/components/growth-engine/growth-engine-scan";
import { setRecommendationStatusAction } from "@/app/(app)/operations/growth/actions";

export const metadata = { title: "Growth - Empfehlungen" };

export default async function GrowthRecommendationsPage() {
  const recs = await growthRecommendationsService
    .list({ status: "open" })
    .catch(() => []);

  const sorted = [...recs].sort(
    (a, b) =>
      recommendationPriorityRank(a.priority) - recommendationPriorityRank(b.priority) ||
      (b.estimated_value ?? 0) - (a.estimated_value ?? 0),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">Prioritaeten:</span>
          {RECOMMENDATION_PRIORITIES.map((p) => (
            <StatusBadge key={p.key} label={p.label} color={p.color} />
          ))}
        </div>
        <GrowthEngineScan />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="Keine offenen Empfehlungen"
          description="Fuehre die Engine aus, um Empfehlungen zu erzeugen."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <StatusBadge
                    label={
                      RECOMMENDATION_PRIORITY_LABELS[
                        r.priority as keyof typeof RECOMMENDATION_PRIORITY_LABELS
                      ] ?? r.priority
                    }
                    color={recommendationPriorityColor(r.priority)}
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-neutral-900">{r.title}</p>
                    {r.reason ? (
                      <p className="text-sm text-neutral-500">{r.reason}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge tone="neutral">{r.entity_type}</Badge>
                      {r.estimated_value != null ? (
                        <span className="text-sm tabular-nums text-neutral-600">
                          {formatCHF(r.estimated_value)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {r.href ? (
                    <Link
                      href={r.href}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      <Lightbulb className="h-4 w-4" aria-hidden="true" />
                      Oeffnen
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ) : null}
                  <StatusSelect
                    id={r.id}
                    value={r.status}
                    statuses={RECOMMENDATION_STATUSES}
                    action={setRecommendationStatusAction}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
