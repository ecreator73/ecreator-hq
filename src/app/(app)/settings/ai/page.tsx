import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import {
  aiPromptsService,
  aiRunsService,
  automationJobsService,
  automationRunsService,
} from "@/server/services";
import type {
  AiPrompt,
  AiRun,
  AutomationJob,
  AutomationRun,
} from "@/types/entities";
import {
  AUTOMATION_RUN_STATUS_LABELS,
  automationRunStatusColor,
} from "@/config/catalog";
import { formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  PlayCircle,
  Workflow,
} from "lucide-react";

export const metadata: Metadata = { title: "AI - Uebersicht" };

function runStatusLabel(status: string): string {
  return (
    AUTOMATION_RUN_STATUS_LABELS[
      status as keyof typeof AUTOMATION_RUN_STATUS_LABELS
    ] ?? status
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "red";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={
            tone === "red"
              ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
              : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"
          }
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p
            className={
              tone === "red"
                ? "text-2xl font-semibold tabular-nums text-red-600"
                : "text-2xl font-semibold tabular-nums text-neutral-900"
            }
          >
            {value}
          </p>
          <p className="text-sm text-neutral-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AiOverviewPage() {
  let prompts: AiPrompt[] = [];
  let jobs: AutomationJob[] = [];
  let runs: AiRun[] = [];
  let recentRuns: AutomationRun[] = [];

  try {
    prompts = await aiPromptsService.list();
  } catch {
    prompts = [];
  }
  try {
    jobs = await automationJobsService.list();
  } catch {
    jobs = [];
  }
  try {
    runs = await aiRunsService.list();
  } catch {
    runs = [];
  }
  try {
    recentRuns = await automationRunsService.recent(20);
  } catch {
    recentRuns = [];
  }

  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const failedRuns = runs.filter((r) => r.status === "error");

  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-500">
        Dies ist das Fundament der AI- &amp; Automation-Schicht: Prompts, Jobs,
        Integrationen und Protokolle sind angelegt und verwaltbar. Live-AI-Calls
        werden in dieser Phase noch nicht ausgefuehrt.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Prompt-Templates"
          value={prompts.length}
          icon={FileText}
        />
        <KpiCard label="Aktive Jobs" value={activeJobs} icon={Workflow} />
        <KpiCard
          label="AI-Runs gesamt"
          value={runs.length}
          icon={PlayCircle}
        />
        <KpiCard
          label="Fehlgeschlagene AI-Runs"
          value={failedRuns.length}
          icon={AlertTriangle}
          tone={failedRuns.length > 0 ? "red" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Letzte Automation-Laeufe</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <EmptyState
                title="Noch keine Laeufe"
                description="Sobald Automation-Jobs ausgefuehrt werden, erscheinen die Laeufe hier."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {recentRuns.map((run) => (
                  <li
                    key={run.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {run.job?.name ?? "Unbekannter Job"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {run.started_at ? formatDate(run.started_at) : "-"}
                      </p>
                    </div>
                    <StatusBadge
                      label={runStatusLabel(run.status)}
                      color={automationRunStatusColor(run.status)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Letzte fehlgeschlagene AI-Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {failedRuns.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Keine Fehler"
                description="Aktuell sind keine fehlgeschlagenen AI-Runs vorhanden."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {failedRuns.slice(0, 20).map((run) => (
                  <li key={run.id} className="py-2.5">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {run.prompt?.name ?? "Ohne Prompt"}
                    </p>
                    <p className="mt-0.5 text-xs text-red-600">
                      {run.error_message ?? "Unbekannter Fehler"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
