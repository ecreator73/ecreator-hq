"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { TaskList } from "@/components/tasks/task-list";
import { StatusSelect } from "@/components/production/status-select";
import {
  CONTENT_PROJECT_STATUSES,
  CONTENT_TYPE_LABELS,
  CONTENT_PLATFORM_LABELS,
  SHOOT_STATUSES,
  statusLabel,
} from "@/config/catalog";
import { setContentProjectStatusAction } from "@/app/(app)/production/actions";
import { formatDate, cn } from "@/lib/utils";
import type {
  ContentProjectWithRelations,
  ShootWithRelations,
  TaskWithRelations,
  FileRecord,
} from "@/types/entities";

const TABS = [
  { key: "plan", label: "Content Plan" },
  { key: "scripts", label: "Skripte" },
  { key: "shoots", label: "Shootings" },
  { key: "files", label: "Dateien" },
  { key: "tasks", label: "Aufgaben" },
  { key: "approvals", label: "Freigaben" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function typeLabel(key: string | null): string {
  if (!key) return "-";
  return CONTENT_TYPE_LABELS[key as keyof typeof CONTENT_TYPE_LABELS] ?? key;
}

function platformLabel(key: string | null): string {
  if (!key) return "-";
  return (
    CONTENT_PLATFORM_LABELS[key as keyof typeof CONTENT_PLATFORM_LABELS] ?? key
  );
}

function shootStatusColor(status: string): string | undefined {
  return SHOOT_STATUSES.find((s) => s.key === status)?.color;
}

export function ContentDetail({
  item,
  tasks,
  files,
  shoots,
}: {
  item: ContentProjectWithRelations;
  tasks: TaskWithRelations[];
  files: FileRecord[];
  shoots: ShootWithRelations[];
}) {
  const [tab, setTab] = useState<TabKey>("plan");

  return (
    <div className="space-y-5">
      <Link
        href="/production/content"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu Content
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              {item.title ?? "Ohne Titel"}
            </h1>
            <StatusBadge
              label={statusLabel("content_project", item.status)}
              color={
                CONTENT_PROJECT_STATUSES.find((s) => s.key === item.status)
                  ?.color
              }
            />
          </div>
          {item.client?.name ? (
            <p className="text-sm text-neutral-500">{item.client.name}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-neutral-500">Status</span>
          <StatusSelect
            id={item.id}
            value={item.status}
            statuses={CONTENT_PROJECT_STATUSES.map((s) => ({
              key: s.key,
              label: s.label,
              color: s.color,
            }))}
            action={setContentProjectStatusAction}
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
            {t.key === "shoots" && shoots.length > 0
              ? ` (${shoots.length})`
              : ""}
            {t.key === "tasks" && tasks.length > 0 ? ` (${tasks.length})` : ""}
            {t.key === "files" && files.length > 0 ? ` (${files.length})` : ""}
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-5 sm:p-6">
          {tab === "plan" ? (
            <PlanTab item={item} />
          ) : tab === "scripts" ? (
            <EmptyState
              title="Skripte folgen"
              description="Skript-Verwaltung wird in einem spaeteren Schritt ergaenzt."
            />
          ) : tab === "shoots" ? (
            <ShootsTab shoots={shoots} />
          ) : tab === "files" ? (
            <FilesTab files={files} />
          ) : tab === "tasks" ? (
            <TaskList
              tasks={tasks}
              emptyTitle="Keine Aufgaben"
              emptyDescription="Fuer diesen Kunden wurde noch keine Aufgabe angelegt."
            />
          ) : (
            <EmptyState
              title="Freigaben"
              description="Freigaben werden im Assets-Modul verwaltet."
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

function PlanTab({ item }: { item: ContentProjectWithRelations }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Titel">{item.title ?? "-"}</Field>
      <Field label="Content-Typ">{typeLabel(item.content_type)}</Field>
      <Field label="Plattform">{platformLabel(item.platform)}</Field>
      <Field label="Kunde">{item.client?.name ?? "-"}</Field>
      <Field label="Verantwortlich">{item.owner?.full_name ?? "-"}</Field>
      <Field label="Status">
        <StatusBadge
          label={statusLabel("content_project", item.status)}
          color={
            CONTENT_PROJECT_STATUSES.find((s) => s.key === item.status)?.color
          }
        />
      </Field>
    </dl>
  );
}

function ShootsTab({ shoots }: { shoots: ShootWithRelations[] }) {
  if (shoots.length === 0) {
    return (
      <EmptyState
        title="Keine Shootings"
        description="Fuer diese Content-Produktion ist noch kein Dreh geplant."
      />
    );
  }
  return (
    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
      {shoots.map((s) => (
        <li
          key={s.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-800">
              {s.title}
            </p>
            <p className="text-xs text-neutral-500">
              {s.shooting_date ? formatDate(s.shooting_date) : "Kein Datum"}
              {s.location ? ` · ${s.location}` : ""}
            </p>
          </div>
          <StatusBadge
            label={statusLabel("shoot", s.status)}
            color={shootStatusColor(s.status)}
          />
        </li>
      ))}
    </ul>
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
