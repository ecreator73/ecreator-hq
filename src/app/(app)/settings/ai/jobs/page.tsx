import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { JobQuickCreate } from "@/components/ai/job-quick-create";
import { JobControls } from "@/components/ai/job-controls";
import { automationJobsService } from "@/server/services";
import type { AutomationJob } from "@/types/entities";
import {
  AUTOMATION_JOB_TYPE_LABELS,
  AUTOMATION_JOB_STATUS_LABELS,
  automationJobStatusColor,
  SCHEDULE_TYPE_LABELS,
} from "@/config/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "AI - Automation-Jobs" };

function typeLabel(type: string | null): string {
  if (!type) return "-";
  return (
    AUTOMATION_JOB_TYPE_LABELS[
      type as keyof typeof AUTOMATION_JOB_TYPE_LABELS
    ] ?? type
  );
}

function statusLabel(status: string): string {
  return (
    AUTOMATION_JOB_STATUS_LABELS[
      status as keyof typeof AUTOMATION_JOB_STATUS_LABELS
    ] ?? status
  );
}

function scheduleLabel(schedule: string | null): string {
  if (!schedule) return "-";
  return (
    SCHEDULE_TYPE_LABELS[schedule as keyof typeof SCHEDULE_TYPE_LABELS] ??
    schedule
  );
}

export default async function AiJobsPage() {
  let jobs: AutomationJob[] = [];
  try {
    jobs = await automationJobsService.list();
  } catch {
    jobs = [];
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Automation-Jobs ({jobs.length})</CardTitle>
          <JobQuickCreate />
        </div>
        <p className="text-sm text-neutral-500">
          Job-Architektur vorbereitet — manuelle Ausfuehrung protokolliert
          einen Lauf, noch keine Live-Logik.
        </p>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <EmptyState
            title="Noch keine Automation-Jobs"
            description="Lege einen Job an, um wiederkehrende Aufgaben wie Lead-Suche, Website-Audits oder Reporting-Erinnerungen vorzubereiten."
            action={<JobQuickCreate />}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[72rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Typ</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Schedule</th>
                  <th className="px-4 py-2.5 font-medium">Letzter Lauf</th>
                  <th className="px-4 py-2.5 font-medium">Naechster Lauf</th>
                  <th className="px-4 py-2.5 font-medium">Steuerung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-2.5 font-medium text-neutral-900">
                      {job.name}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {typeLabel(job.type)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={statusLabel(job.status)}
                        color={automationJobStatusColor(job.status)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {scheduleLabel(job.schedule)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {job.last_run_at ? formatDate(job.last_run_at) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {job.next_run_at ? formatDate(job.next_run_at) : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <JobControls job={job} />
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
