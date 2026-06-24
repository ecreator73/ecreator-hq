"use client";

import { useMemo, useState } from "react";
import { Section } from "../detail-ui";
import { QuickCreate } from "@/components/tasks/quick-create";
import { TaskList } from "@/components/tasks/task-list";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/types/entities";

type View = "open" | "overdue" | "week" | "done";

const isOpen = (t: TaskWithRelations) =>
  t.status?.key !== "done" && t.status?.key !== "archived";

/**
 * Aufgaben-Tab: vier kuratierte Ansichten (Offen / Ueberfaellig / Diese Woche /
 * Erledigt) als segmentierte Leiste, jeweils mit Count-Badge. Ruhige
 * Karten-Anmutung ueber die geteilte Section, mobil sauber gestapelt.
 */
export function TasksTab({
  clientId,
  tasks,
}: {
  clientId: string;
  tasks: TaskWithRelations[];
}) {
  const [view, setView] = useState<View>("open");

  const { open, overdue, week, done } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    return {
      open: tasks.filter(isOpen),
      overdue: tasks.filter(
        (t) => t.due_date && t.due_date < today && isOpen(t),
      ),
      week: tasks.filter(
        (t) => t.due_date && t.due_date >= today && t.due_date <= weekEnd,
      ),
      done: tasks.filter((t) => t.status?.key === "done"),
    };
  }, [tasks]);

  const segments: { key: View; label: string; bucket: TaskWithRelations[] }[] = [
    { key: "open", label: "Offen", bucket: open },
    { key: "overdue", label: "Ueberfaellig", bucket: overdue },
    { key: "week", label: "Diese Woche", bucket: week },
    { key: "done", label: "Erledigt", bucket: done },
  ];

  const active = segments.find((s) => s.key === view) ?? segments[0];

  return (
    <Section
      title="Aufgaben"
      description="Ansichten nach Faelligkeit und Status."
      action={
        <QuickCreate
          initial={{ client_id: clientId }}
          label="Aufgabe"
          variant="primary"
        />
      }
    >
      <div className="space-y-4">
        <div className="-mx-1 flex flex-wrap gap-1.5 px-1" role="tablist" aria-label="Aufgaben-Ansichten">
          {segments.map((s) => {
            const isActive = s.key === view;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setView(s.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-brand-600 text-brand-700"
                    : "border-neutral-200 text-neutral-500 hover:text-neutral-800",
                )}
              >
                {s.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "bg-neutral-100 text-neutral-500",
                  )}
                >
                  {s.bucket.length}
                </span>
              </button>
            );
          })}
        </div>

        <TaskList
          tasks={active.bucket}
          emptyTitle="Keine Aufgaben"
          emptyDescription="In dieser Ansicht sind keine Aufgaben."
        />
      </div>
    </Section>
  );
}
