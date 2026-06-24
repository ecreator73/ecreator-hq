import type { Metadata } from "next";
import { Route } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { StatusSelect } from "@/components/production/status-select";
import { JourneySyncButton } from "@/components/growth-engine/growth-engine-scan";
import { revenueJourneysService } from "@/server/services";
import type { RevenueJourneyWithRefs } from "@/types/entities";
import {
  REVENUE_STAGES,
  JOURNEY_STATUSES,
  revenueStageLabel,
  revenueStageColor,
  revenueStageIndex,
} from "@/config/catalog";
import {
  setJourneyStageAction,
  setJourneyStatusAction,
} from "@/app/(app)/operations/growth/actions";
import { formatCHF } from "@/lib/utils";

export const metadata: Metadata = { title: "Growth - Journeys" };

export default async function GrowthJourneysPage() {
  const journeys: RevenueJourneyWithRefs[] = await revenueJourneysService
    .list()
    .catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          Jeder Lead und Kunde als Reise durch den Funnel.
        </p>
        <JourneySyncButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Journeys ({journeys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {journeys.length === 0 ? (
            <EmptyState
              icon={Route}
              title="Noch keine Journeys"
              description="Synchronisiere die Journeys aus dem aktuellen Funnel-Stand."
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {journeys.map((j) => {
                const name =
                  j.lead?.company_name ?? j.client?.name ?? "-";
                return (
                  <li
                    key={j.id}
                    className="flex flex-wrap items-start justify-between gap-4 py-3"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="truncate font-medium text-neutral-900">
                          {name}
                        </span>
                        <StatusBadge
                          label={revenueStageLabel(j.current_stage)}
                          color={revenueStageColor(j.current_stage)}
                        />
                        <span className="text-xs tabular-nums text-neutral-400">
                          Schritt {revenueStageIndex(j.current_stage) + 1}/10
                        </span>
                      </div>
                      {j.next_recommended_action ? (
                        <p className="text-sm text-neutral-600">
                          {j.next_recommended_action}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="tabular-nums text-neutral-700">
                          {formatCHF(j.estimated_value)}
                        </span>
                        <span className="text-neutral-500">
                          {j.owner?.full_name ?? "-"}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <StatusSelect
                        id={j.id}
                        value={j.current_stage}
                        statuses={REVENUE_STAGES}
                        action={setJourneyStageAction}
                      />
                      <StatusSelect
                        id={j.id}
                        value={j.status}
                        statuses={JOURNEY_STATUSES}
                        action={setJourneyStatusAction}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
