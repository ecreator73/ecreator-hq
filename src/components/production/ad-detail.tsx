"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { StatusSelect } from "@/components/production/status-select";
import { TaskList } from "@/components/tasks/task-list";
import {
  AD_PLATFORM_LABELS,
  AD_PROJECT_STATUSES,
  statusLabel,
} from "@/config/catalog";
import { setAdProjectStatusAction } from "@/app/(app)/production/actions";
import { formatCHF, cn } from "@/lib/utils";
import type {
  AdProjectWithRelations,
  TaskWithRelations,
  FileRecord,
} from "@/types/entities";

const TABS = [
  { key: "campaign", label: "Kampagne" },
  { key: "creatives", label: "Creatives" },
  { key: "tracking", label: "Tracking" },
  { key: "reporting", label: "Reporting" },
  { key: "tasks", label: "Aufgaben" },
  { key: "files", label: "Dateien" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

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

export function AdDetail({
  item,
  tasks,
  files,
}: {
  item: AdProjectWithRelations;
  tasks: TaskWithRelations[];
  files: FileRecord[];
}) {
  const [tab, setTab] = useState<TabKey>("campaign");

  return (
    <div className="space-y-5">
      <Link
        href="/production/ads"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu Ad-Kampagnen
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              {item.title ?? "Ohne Titel"}
            </h1>
            <StatusBadge
              label={statusLabel("ad_project", item.status)}
              color={adStatusColor(item.status)}
            />
          </div>
          <p className="text-sm text-neutral-500">
            {[item.client?.name, platformLabel(item.platform)]
              .filter(Boolean)
              .join(" · ") || "-"}
          </p>
        </div>
        <div className="shrink-0">
          <StatusSelect
            id={item.id}
            value={item.status}
            statuses={AD_PROJECT_STATUSES.map((s) => ({
              key: s.key,
              label: s.label,
              color: s.color,
            }))}
            action={setAdProjectStatusAction}
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
          {tab === "campaign" ? (
            <CampaignTab item={item} />
          ) : tab === "creatives" ? (
            <EmptyState
              title="Creatives folgen"
              description="Die Verwaltung von Creatives und Anzeigenmaterial wird hier ergaenzt."
            />
          ) : tab === "tracking" ? (
            <EmptyState
              title="Tracking folgt"
              description="Conversion-Tracking und Pixel-Setup werden hier abgebildet."
            />
          ) : tab === "reporting" ? (
            <EmptyState
              title="Reporting folgt"
              description="Performance-Kennzahlen der Kampagne erscheinen hier."
            />
          ) : tab === "tasks" ? (
            <TaskList
              tasks={tasks}
              emptyTitle="Keine Aufgaben"
              emptyDescription="Fuer diese Kampagne wurde noch keine Aufgabe angelegt."
            />
          ) : (
            <FilesTab files={files} />
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

function CampaignTab({ item }: { item: AdProjectWithRelations }) {
  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Titel">{item.title ?? "-"}</Field>
        <Field label="Kunde">{item.client?.name ?? "-"}</Field>
        <Field label="Plattform">{platformLabel(item.platform)}</Field>
        <Field label="Budget (mtl.)">
          {item.budget != null ? formatCHF(item.budget) : "-"}
        </Field>
        <Field label="Status">
          <StatusBadge
            label={statusLabel("ad_project", item.status)}
            color={adStatusColor(item.status)}
          />
        </Field>
        <Field label="Verantwortlich">{item.owner?.full_name ?? "-"}</Field>
      </dl>

      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Ziel
        </dt>
        <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
          {item.objective ? item.objective : "-"}
        </dd>
      </div>
    </div>
  );
}

function FilesTab({ files }: { files: FileRecord[] }) {
  if (files.length === 0) {
    return (
      <EmptyState
        title="Keine Dateien"
        description="Fuer diese Kampagne wurden noch keine Dateien hinterlegt."
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
