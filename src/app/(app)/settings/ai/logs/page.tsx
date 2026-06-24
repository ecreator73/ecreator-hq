import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { automationRunsService } from "@/server/services";
import type { AutomationRun } from "@/types/entities";
import {
  AUTOMATION_RUN_STATUS_LABELS,
  automationRunStatusColor,
} from "@/config/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "AI - Automation-Logs" };

function runStatusLabel(status: string): string {
  return (
    AUTOMATION_RUN_STATUS_LABELS[
      status as keyof typeof AUTOMATION_RUN_STATUS_LABELS
    ] ?? status
  );
}

function truncate(value: string | null, max = 80): string {
  if (!value) return "-";
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return "-";
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export default async function AiLogsPage() {
  let recentRuns: AutomationRun[] = [];
  try {
    recentRuns = await automationRunsService.recent(100);
  } catch {
    recentRuns = [];
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Automation-Logs ({recentRuns.length})</CardTitle>
        </div>
        <p className="text-sm text-neutral-500">
          Protokoll der letzten Automation-Laeufe. Jeder Lauf zeigt Status,
          Zeitraum und einen Kurzauszug der Logs.
        </p>
      </CardHeader>
      <CardContent>
        {recentRuns.length === 0 ? (
          <EmptyState
            title="Noch keine Logs"
            description="Sobald Automation-Jobs ausgefuehrt werden, erscheinen ihre Laeufe hier als Protokoll."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[64rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Job</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Start</th>
                  <th className="px-4 py-2.5 font-medium">Ende</th>
                  <th className="px-4 py-2.5 font-medium">Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-2.5 font-medium text-neutral-900">
                      {run.job?.name ?? "Unbekannter Job"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={runStatusLabel(run.status)}
                        color={automationRunStatusColor(run.status)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {run.started_at ? formatDate(run.started_at) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {run.finished_at ? formatDate(run.finished_at) : "-"}
                    </td>
                    <td className="max-w-md px-4 py-2.5 text-neutral-500">
                      <span className="block truncate">
                        {truncate(run.logs)}
                      </span>
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
