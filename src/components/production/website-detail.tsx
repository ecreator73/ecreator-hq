"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { TaskList } from "@/components/tasks/task-list";
import { StatusSelect } from "@/components/production/status-select";
import { MilestonesPanel } from "@/components/production/milestones-panel";
import {
  WEBSITE_PROJECT_STATUSES,
  WEBSITE_CHECKLIST_ITEMS,
  CMS_OPTION_LABELS,
  statusLabel,
} from "@/config/catalog";
import { setWebsiteProjectStatusAction } from "@/app/(app)/production/actions";
import { formatDate, cn } from "@/lib/utils";
import type {
  WebsiteProjectWithRelations,
  TaskWithRelations,
  FileRecord,
  ProjectMilestone,
} from "@/types/entities";

const TABS = [
  { key: "overview", label: "Uebersicht" },
  { key: "tasks", label: "Aufgaben" },
  { key: "files", label: "Dateien" },
  { key: "seo", label: "SEO" },
  { key: "tracking", label: "Tracking" },
  { key: "checklist", label: "Launch Checklist" },
  { key: "activity", label: "Aktivitaet" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function statusColor(status: string): string | undefined {
  return WEBSITE_PROJECT_STATUSES.find((s) => s.key === status)?.color;
}

function cmsLabel(cms: string | null): string {
  if (!cms) return "-";
  return CMS_OPTION_LABELS[cms as keyof typeof CMS_OPTION_LABELS] ?? cms;
}

export function WebsiteDetail({
  item,
  tasks,
  files,
  milestones,
}: {
  item: WebsiteProjectWithRelations;
  tasks: TaskWithRelations[];
  files: FileRecord[];
  milestones: ProjectMilestone[];
}) {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-5">
      <Link
        href="/production/websites"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu Websites
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              {item.title || item.domain || "Website-Projekt"}
            </h1>
            <StatusBadge
              label={statusLabel("website_project", item.status)}
              color={statusColor(item.status)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
            {item.domain ? (
              <a
                href={
                  item.domain.startsWith("http")
                    ? item.domain
                    : `https://${item.domain}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-brand-700 hover:underline"
              >
                {item.domain}
              </a>
            ) : null}
            {item.client?.name ? <span>{item.client.name}</span> : null}
            {item.owner?.full_name ? (
              <span>{item.owner.full_name}</span>
            ) : null}
          </div>
        </div>
        <StatusSelect
          id={item.id}
          value={item.status}
          statuses={WEBSITE_PROJECT_STATUSES}
          action={setWebsiteProjectStatusAction}
        />
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
          {tab === "overview" ? (
            <OverviewTab item={item} />
          ) : tab === "tasks" ? (
            <TaskList
              tasks={tasks}
              emptyTitle="Keine Aufgaben"
              emptyDescription="Fuer den Kunden dieses Projekts sind keine Aufgaben erfasst."
            />
          ) : tab === "files" ? (
            <FilesTab files={files} />
          ) : tab === "seo" ? (
            <InfoTab
              label="SEO-Status"
              value={item.seo_status}
              hint="Halte den Stand der Suchmaschinen-Optimierung fest (z.B. Onpage, Meta-Tags, Indexierung). Bearbeite das Projekt, um den SEO-Status zu aktualisieren."
            />
          ) : tab === "tracking" ? (
            <InfoTab
              label="Tracking-Status"
              value={item.tracking_status}
              hint="Stand des Trackings (z.B. GA4, Meta Pixel, Conversion-Events). Bearbeite das Projekt, um den Tracking-Status zu aktualisieren."
            />
          ) : tab === "checklist" ? (
            <ChecklistTab item={item} milestones={milestones} />
          ) : (
            <EmptyState
              title="Aktivitaet folgt"
              description="Der Aktivitaetsverlauf fuer Website-Projekte wird spaeter ergaenzt."
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

function OverviewTab({ item }: { item: WebsiteProjectWithRelations }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Titel">{item.title || "-"}</Field>
      <Field label="Domain">
        {item.domain ? (
          <a
            href={
              item.domain.startsWith("http")
                ? item.domain
                : `https://${item.domain}`
            }
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 hover:underline"
          >
            {item.domain}
          </a>
        ) : (
          "-"
        )}
      </Field>
      <Field label="CMS">{cmsLabel(item.cms)}</Field>
      <Field label="Hosting">{item.hosting || "-"}</Field>
      <Field label="Launch-Datum">
        {item.launch_date ? formatDate(item.launch_date) : "-"}
      </Field>
      <Field label="Kunde">{item.client?.name ?? "-"}</Field>
      <Field label="Verantwortlich">{item.owner?.full_name ?? "-"}</Field>
      <Field label="SEO-Status">{item.seo_status || "-"}</Field>
      <Field label="Tracking-Status">{item.tracking_status || "-"}</Field>
    </dl>
  );
}

function InfoTab({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          {label}
        </dt>
        <dd className="mt-1 text-sm text-neutral-800">
          {value ? (
            value
          ) : (
            <span className="italic text-neutral-400">Noch nicht erfasst</span>
          )}
        </dd>
      </div>
      <p className="text-sm leading-relaxed text-neutral-500">{hint}</p>
    </div>
  );
}

function FilesTab({ files }: { files: FileRecord[] }) {
  if (files.length === 0) {
    return (
      <EmptyState
        title="Keine Dateien"
        description="Fuer den Kunden dieses Projekts sind keine Dateien hinterlegt."
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

function ChecklistTab({
  item,
  milestones,
}: {
  item: WebsiteProjectWithRelations;
  milestones: ProjectMilestone[];
}) {
  if (item.project_id) {
    return <MilestonesPanel projectId={item.project_id} items={milestones} />;
  }
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {WEBSITE_CHECKLIST_ITEMS.map((label) => (
          <li
            key={label}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700"
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-neutral-300"
            />
            {label}
          </li>
        ))}
      </ul>
      <p className="text-sm leading-relaxed text-neutral-500">
        Verknuepfe ein Basisprojekt fuer echte Meilensteine.
      </p>
    </div>
  );
}
