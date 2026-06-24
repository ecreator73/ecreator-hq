"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { statusLabel, CLIENT_INTERACTION_TYPE_LABELS } from "@/config/catalog";
import { formatDate, cn } from "@/lib/utils";
import type {
  ClientInteraction,
  ReportingCallWithRelations,
  TaskWithRelations,
  Contract,
} from "@/types/entities";

type TimelineEntry = {
  date: string;
  kind: string;
  label: string;
  title: string;
  sub?: string;
  color: string;
};

/** Farbpunkt-Klasse je Quellen-Farbe. */
const DOT_CLASS: Record<string, string> = {
  blue: "bg-brand-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  neutral: "bg-neutral-400",
};

/** Badge-Ton je Quellen-Farbe (passend zur Badge-API). */
const BADGE_TONE: Record<string, "brand" | "amber" | "green" | "neutral"> = {
  blue: "brand",
  amber: "amber",
  green: "green",
  neutral: "neutral",
};

export function ActivityTab({
  interactions,
  reportingCalls,
  tasks,
  contracts,
}: {
  interactions: ClientInteraction[];
  reportingCalls: ReportingCallWithRelations[];
  tasks: TaskWithRelations[];
  contracts: Contract[];
}) {
  const entries = useMemo<TimelineEntry[]>(() => {
    const all: (TimelineEntry & { date: string | null })[] = [
      ...interactions.map((it) => {
        const label =
          CLIENT_INTERACTION_TYPE_LABELS[
            it.type as keyof typeof CLIENT_INTERACTION_TYPE_LABELS
          ] ?? it.type;
        return {
          date: it.interaction_date,
          kind: it.type,
          label,
          title: it.subject ?? label,
          sub: it.body ?? undefined,
          color: "blue",
        };
      }),
      ...reportingCalls.map((rc) => ({
        date: rc.scheduled_date ?? rc.created_at,
        kind: "reporting",
        label: "Reporting Call",
        title: statusLabel("reporting_call", rc.status),
        sub: rc.summary ?? undefined,
        color: "amber",
      })),
      ...tasks.map((t) => ({
        date: t.created_at,
        kind: "task",
        label: "Aufgabe",
        title: t.title,
        sub: t.status?.label ?? undefined,
        color: "green",
      })),
      ...contracts.map((c) => ({
        date: c.created_at,
        kind: "contract",
        label: "Vertrag",
        title: c.title,
        sub: undefined,
        color: "neutral",
      })),
    ];

    return all
      .filter((e): e is TimelineEntry => Boolean(e.date))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, 60);
  }, [interactions, reportingCalls, tasks, contracts]);

  if (entries.length === 0) {
    return <EmptyState title="Noch keine Aktivitaet" />;
  }

  return (
    <ol className="relative space-y-5 border-l border-neutral-200 pl-5">
      {entries.map((e, i) => (
        <li key={`${e.kind}-${i}-${e.date}`} className="relative">
          {/* Farbpunkt links auf der Linie */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute -left-[1.4375rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white",
              DOT_CLASS[e.color] ?? DOT_CLASS.neutral,
            )}
          />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={BADGE_TONE[e.color] ?? "neutral"}>{e.label}</Badge>
                <span className="truncate text-sm font-medium text-neutral-900">
                  {e.title}
                </span>
              </div>
              {e.sub ? (
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-neutral-500">
                  {e.sub}
                </p>
              ) : null}
            </div>
            <time className="shrink-0 whitespace-nowrap text-xs text-neutral-400">
              {formatDate(e.date)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
