"use client";

import { useEffect, useState, useTransition } from "react";
import { TASK_STATUSES, type TaskStatus } from "@/config/catalog";
import { moveTaskAction } from "@/app/(app)/tasks/actions";
import { TaskCard } from "@/components/tasks/task-card";
import { StatusBadge } from "@/components/tasks/status-badge";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/types/entities";

const COLUMNS = TASK_STATUSES.filter((s) => s.key !== "archived");

export function TaskBoard({ tasks }: { tasks: TaskWithRelations[] }) {
  const [items, setItems] = useState<TaskWithRelations[]>(tasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Server-Daten (revalidate) nur uebernehmen, wenn gerade KEINE optimistische
  // Verschiebung laeuft - sonst wuerde veraltetes tasks-Prop sie zuruecksetzen.
  useEffect(() => {
    if (!isPending) setItems(tasks);
  }, [tasks, isPending]);

  function handleDrop(statusKey: string) {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id) return;
    const task = items.find((t) => t.id === id);
    if (!task || task.status?.key === statusKey) return;

    const col = COLUMNS.find((c) => c.key === statusKey)!;
    const position = Date.now();
    const snapshot = items;

    // Optimistisch verschieben
    setItems((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: { key: col.key, label: col.label, color: col.color },
              position,
            }
          : t,
      ),
    );

    startTransition(async () => {
      const res = await moveTaskAction(id, {
        status: statusKey as TaskStatus,
        position,
      });
      if (!res.ok) setItems(snapshot); // bei Fehler zuruecksetzen
    });
  }

  const inColumn = (key: string) =>
    items
      .filter((t) => t.status?.key === key)
      .sort((a, b) => a.position - b.position);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colTasks = inColumn(col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col.key);
            }}
            onDragLeave={() =>
              setOverCol((c) => (c === col.key ? null : c))
            }
            onDrop={() => handleDrop(col.key)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl border border-neutral-200 bg-neutral-50/60",
              overCol === col.key && "ring-2 ring-brand-300",
            )}
          >
            <header className="flex items-center justify-between px-3 py-2.5">
              <StatusBadge label={col.label} color={col.color} />
              <span className="text-xs font-medium text-neutral-400">
                {colTasks.length}
              </span>
            </header>
            <div className="flex-1 space-y-2 px-2 pb-3">
              {colTasks.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "cursor-grab active:cursor-grabbing",
                    dragId === t.id && "opacity-50",
                  )}
                >
                  <TaskCard task={t} />
                </div>
              ))}
              {colTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
                  Keine Aufgaben
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
