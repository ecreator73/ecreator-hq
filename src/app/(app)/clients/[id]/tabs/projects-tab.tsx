"use client";

import { Section, statusColorOf } from "../detail-ui";
import { StatusBadge } from "@/components/tasks/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectQuickCreate } from "@/components/clients/detail-quick-creates";
import { statusLabel, PROJECT_TYPES } from "@/config/catalog";
import { formatDate, cn } from "@/lib/utils";
import type { Project, ProfileMini } from "@/types/entities";

/** Status-Heuristik fuer den Fortschrittsbalken (es gibt kein echtes progress-Feld). */
const STATUS_PROGRESS: Record<string, number> = {
  planned: 10,
  active: 60,
  on_hold: 40,
  completed: 100,
  cancelled: 0,
};

export function ProjectsTab({
  clientId,
  projects,
  users,
}: {
  clientId: string;
  projects: Project[];
  users: ProfileMini[];
}) {
  return (
    <Section
      title="Projekte"
      description="Alle laufenden und abgeschlossenen Projekte dieses Kunden."
      action={
        <ProjectQuickCreate
          clientId={clientId}
          users={users}
          label="Projekt erstellen"
          variant="primary"
        />
      }
    >
      {projects.length === 0 ? (
        <EmptyState
          title="Keine Projekte"
          description="Lege das erste Projekt fuer diesen Kunden an."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const typeLabel =
              PROJECT_TYPES.find((t) => t.key === p.project_type)?.label ?? p.project_type;
            const owner = users.find((u) => u.id === p.owner_id)?.full_name ?? "—";
            const progress = STATUS_PROGRESS[p.status] ?? 0;

            return (
              <div
                key={p.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">{p.title}</p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">{typeLabel}</p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge
                      label={statusLabel("project", p.status)}
                      color={statusColorOf("project", p.status)}
                    />
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                      Verantwortlich
                    </dt>
                    <dd className="mt-0.5 truncate text-sm text-neutral-800">{owner}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                      Deadline
                    </dt>
                    <dd className="mt-0.5 truncate text-sm text-neutral-800">
                      {p.due_date ? formatDate(p.due_date) : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                    <span>Status</span>
                    <span className="tabular-nums text-neutral-500">{progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={cn("h-full rounded-full bg-brand-500 transition-all")}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
