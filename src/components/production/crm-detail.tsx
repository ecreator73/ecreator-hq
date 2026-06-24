"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskList } from "@/components/tasks/task-list";
import { StatusSelect } from "@/components/production/status-select";
import { MilestonesPanel } from "@/components/production/milestones-panel";
import { setCrmProjectStatusAction } from "@/app/(app)/production/actions";
import {
  CRM_PROJECT_STATUSES,
  CRM_TYPE_LABELS,
  statusLabel,
} from "@/config/catalog";
import { formatDate, cn } from "@/lib/utils";
import type {
  CrmProjectWithRelations,
  TaskWithRelations,
  FileRecord,
  ProjectMilestone,
} from "@/types/entities";

const TABS = [
  { key: "requirements", label: "Anforderungen" },
  { key: "workflows", label: "Workflows" },
  { key: "automations", label: "Automationen" },
  { key: "integrations", label: "Integrationen" },
  { key: "tasks", label: "Aufgaben" },
  { key: "files", label: "Dateien" },
  { key: "activity", label: "Aktivitaet" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function crmTypeLabel(type: string | null): string {
  if (!type) return "-";
  return CRM_TYPE_LABELS[type as keyof typeof CRM_TYPE_LABELS] ?? type;
}

export function CrmDetail({
  item,
  tasks,
  files,
  milestones,
}: {
  item: CrmProjectWithRelations;
  tasks: TaskWithRelations[];
  files: FileRecord[];
  milestones: ProjectMilestone[];
}) {
  const [tab, setTab] = useState<TabKey>("requirements");

  return (
    <div className="space-y-5">
      <Link
        href="/production/crm"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu CRM-Projekten
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            {item.title ?? "Ohne Titel"}
          </h1>
          <p className="text-sm text-neutral-500">
            {item.client?.name ?? "Kein Kunde"}
            {item.crm_type ? ` · ${crmTypeLabel(item.crm_type)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusSelect
            id={item.id}
            value={item.status}
            statuses={CRM_PROJECT_STATUSES}
            action={setCrmProjectStatusAction}
          />
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {t.label}
            {t.key === "tasks" && tasks.length > 0 ? ` (${tasks.length})` : ""}
            {t.key === "files" && files.length > 0 ? ` (${files.length})` : ""}
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-5 sm:p-6">
          {tab === "requirements" ? (
            <RequirementsTab item={item} milestones={milestones} />
          ) : tab === "workflows" ? (
            <EmptyState
              title="Keine Workflows"
              description="Workflow-Mapping fuer dieses CRM-Projekt folgt."
            />
          ) : tab === "automations" ? (
            <EmptyState
              title="Keine Automationen"
              description="Automationen werden hier erfasst, sobald die Datenschicht bereitsteht."
            />
          ) : tab === "integrations" ? (
            <EmptyState
              title="Keine Integrationen"
              description="Angebundene Systeme und Schnittstellen erscheinen hier."
            />
          ) : tab === "tasks" ? (
            <TaskList
              tasks={tasks}
              emptyTitle="Keine Aufgaben"
              emptyDescription="Fuer diesen Kunden wurde noch keine Aufgabe angelegt."
            />
          ) : tab === "files" ? (
            <FilesTab files={files} />
          ) : (
            <EmptyState
              title="Noch keine Aktivitaet"
              description="Aenderungen und Ereignisse zu diesem CRM-Projekt erscheinen hier."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-neutral-800">{children}</dd>
    </div>
  );
}

function RequirementsTab({
  item,
  milestones,
}: {
  item: CrmProjectWithRelations;
  milestones: ProjectMilestone[];
}) {
  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Titel">{item.title ?? "-"}</Field>
        <Field label="Kunde">{item.client?.name ?? "-"}</Field>
        <Field label="CRM-Typ">{crmTypeLabel(item.crm_type)}</Field>
        <Field label="Go-Live">
          {item.go_live_date ? formatDate(item.go_live_date) : "-"}
        </Field>
        <Field label="Status">{statusLabel("crm_project", item.status)}</Field>
        <Field label="Verantwortlich">{item.owner?.full_name ?? "-"}</Field>
      </dl>

      {item.project_id ? (
        <MilestonesPanel projectId={item.project_id} items={milestones} />
      ) : null}
    </div>
  );
}

function FilesTab({ files }: { files: FileRecord[] }) {
  if (files.length === 0) {
    return (
      <EmptyState
        title="Keine Dateien"
        description="Fuer diesen Kunden wurde noch keine Datei hinterlegt."
      />
    );
  }
  return (
    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
      {files.map((f) => (
        <li
          key={f.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          {f.file_url ? (
            <a
              href={f.file_url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium text-neutral-800 hover:text-brand-700"
            >
              {f.filename}
            </a>
          ) : (
            <span className="truncate text-sm font-medium text-neutral-800">
              {f.filename}
            </span>
          )}
          <span className="shrink-0 text-xs text-neutral-500">
            {f.category ?? "-"}
          </span>
        </li>
      ))}
    </ul>
  );
}
