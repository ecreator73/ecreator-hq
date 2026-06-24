"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/tasks/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportingCallQuickCreate } from "@/components/clients/reporting-call-quick-create";
import { statusLabel, REPORTING_CALL_STATUSES } from "@/config/catalog";
import {
  markReportingCallStatusAction,
  createTasksFromReportingAction,
} from "@/app/(app)/clients/actions";
import { formatDate, cn } from "@/lib/utils";
import { Section, List, Row, EmptyRow, statusColorOf } from "../detail-ui";
import type {
  ReportingCallWithRelations,
  ProfileMini,
} from "@/types/entities";

/** Startbeginn des heutigen Tages (lokal) als Vergleichsanker. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function callTime(rc: ReportingCallWithRelations): number {
  return rc.scheduled_date ? new Date(rc.scheduled_date).getTime() : 0;
}

export function ReportingTab({
  clientId,
  calls,
  users: _users,
}: {
  clientId: string;
  calls: ReportingCallWithRelations[];
  users: ProfileMini[];
}) {
  void _users;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = useMemo(() => startOfToday().getTime(), []);

  /** Historie: alle Calls nach Datum absteigend. */
  const sorted = useMemo(
    () => [...calls].sort((a, b) => callTime(b) - callTime(a)),
    [calls],
  );

  /** Letzter Call: juengster mit Status "completed" ODER scheduled_date < heute. */
  const lastCall = useMemo(() => {
    const past = calls.filter(
      (rc) =>
        rc.status === "completed" ||
        (rc.scheduled_date != null &&
          new Date(rc.scheduled_date).getTime() < today),
    );
    if (past.length === 0) return null;
    return past.reduce((best, rc) =>
      callTime(rc) > callTime(best) ? rc : best,
    );
  }, [calls, today]);

  /** Naechster Call: fruehester ab heute, Status nicht completed/cancelled. */
  const nextCall = useMemo(() => {
    const upcoming = calls.filter(
      (rc) =>
        rc.scheduled_date != null &&
        new Date(rc.scheduled_date).getTime() >= today &&
        rc.status !== "completed" &&
        rc.status !== "cancelled",
    );
    if (upcoming.length === 0) return null;
    return upcoming.reduce((best, rc) =>
      callTime(rc) < callTime(best) ? rc : best,
    );
  }, [calls, today]);

  function setStatus(id: string, status: string) {
    setBusyId(id);
    startTransition(async () => {
      await markReportingCallStatusAction(id, status);
      router.refresh();
      setBusyId(null);
    });
  }

  function createTasks(id: string) {
    setBusyId(id);
    startTransition(async () => {
      await createTasksFromReportingAction(id);
      router.refresh();
      setBusyId(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Kopf */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">
            Reporting Calls
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Termine, Status und Ergebnisse der Kundengespraeche.
          </p>
        </div>
        <ReportingCallQuickCreate
          clientId={clientId}
          label="Reporting Call planen"
          variant="primary"
        />
      </div>

      {/* Highlight-Karten */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HighlightCard
          icon={CalendarCheck}
          title="Letzter Call"
          call={lastCall}
          emptyLabel="Noch kein Call durchgefuehrt."
        />
        <HighlightCard
          icon={CalendarClock}
          title="Naechster Call"
          call={nextCall}
          emptyLabel="Kein Call geplant."
        />
      </div>

      {/* Historie */}
      {calls.length === 0 ? (
        <EmptyState
          title="Keine Reporting-Calls"
          description="Plane den ersten Reporting-Call."
          icon={CalendarClock}
        />
      ) : (
        <Section title="Historie">
          <List>
            {sorted.map((rc) => {
              const hasDetails =
                Boolean(rc.summary) ||
                Boolean(rc.next_steps) ||
                Boolean(rc.agenda) ||
                Boolean(rc.notes);
              const rowBusy = pending && busyId === rc.id;
              return (
                <li
                  key={rc.id}
                  className="px-4 py-3 transition-colors hover:bg-neutral-50/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-sm font-medium tabular-nums text-neutral-900">
                        {rc.scheduled_date ? formatDate(rc.scheduled_date) : "Offen"}
                      </span>
                      <StatusBadge
                        label={statusLabel("reporting_call", rc.status)}
                        color={statusColorOf("reporting_call", rc.status)}
                      />
                      {rc.owner?.full_name ? (
                        <span className="truncate text-xs text-neutral-500">
                          {rc.owner.full_name}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {rowBusy ? (
                        <Loader2
                          className="h-4 w-4 animate-spin text-neutral-400"
                          aria-hidden="true"
                        />
                      ) : null}
                      <label className="sr-only" htmlFor={`rc-status-${rc.id}`}>
                        Status aendern
                      </label>
                      <select
                        id={`rc-status-${rc.id}`}
                        value={rc.status}
                        disabled={pending}
                        onChange={(e) => setStatus(rc.id, e.target.value)}
                        className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 disabled:opacity-50"
                      >
                        {REPORTING_CALL_STATUSES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {hasDetails ? (
                    <details className="group mt-2">
                      <summary className="inline-flex cursor-pointer select-none items-center text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-800">
                        Details
                      </summary>
                      <div className="mt-2 space-y-3 rounded-lg border border-neutral-100 bg-neutral-50/60 px-3 py-3">
                        <DetailBlock label="Agenda" value={rc.agenda} />
                        <DetailBlock
                          label="Zusammenfassung"
                          value={rc.summary}
                        />
                        <DetailBlock label="Next Steps" value={rc.next_steps} />
                        <DetailBlock label="Notizen" value={rc.notes} />
                        {rc.next_steps ? (
                          <div className="pt-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={pending}
                              onClick={() => createTasks(rc.id)}
                            >
                              {rowBusy ? (
                                <Loader2
                                  className="h-4 w-4 animate-spin"
                                  aria-hidden="true"
                                />
                              ) : null}
                              Aufgaben aus Next Steps
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </List>
        </Section>
      )}
    </div>
  );
}

function HighlightCard({
  icon: Icon,
  title,
  call,
  emptyLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  call: ReportingCallWithRelations | null;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </div>
      {call ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-base font-semibold tabular-nums text-neutral-900">
              {call.scheduled_date ? formatDate(call.scheduled_date) : "Offen"}
            </span>
            <StatusBadge
              label={statusLabel("reporting_call", call.status)}
              color={statusColorOf("reporting_call", call.status)}
            />
          </div>
          <p className="truncate text-sm text-neutral-500">
            {call.owner?.full_name ?? "Kein Verantwortlicher"}
          </p>
        </div>
      ) : (
        <EmptyRow>{emptyLabel}</EmptyRow>
      )}
    </div>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className={cn("min-w-0")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-700">
        {value}
      </p>
    </div>
  );
}
