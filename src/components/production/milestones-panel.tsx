"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, cn } from "@/lib/utils";
import {
  createMilestoneAction,
  toggleMilestoneAction,
  deleteMilestoneAction,
} from "@/app/(app)/production/actions";
import type { ProjectMilestone } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/**
 * Meilenstein-Panel fuer ein Projekt: Liste mit Checkbox (toggle), Loeschen,
 * Fortschritt und kleines Inline-Formular zum Anlegen.
 */
export function MilestonesPanel({
  projectId,
  items,
}: {
  projectId: string;
  items: ProjectMilestone[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = items.length;
  const done = items.filter((m) => m.completed).length;

  function toggle(id: string, completed: boolean) {
    startTransition(async () => {
      await toggleMilestoneAction(id, completed);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteMilestoneAction(id);
      router.refresh();
    });
  }

  function add() {
    setError(null);
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    startTransition(async () => {
      const result = await createMilestoneAction({
        project_id: projectId,
        title: title.trim(),
        due_date: dueDate || undefined,
      });
      if (result.ok) {
        setTitle("");
        setDueDate("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700">Meilensteine</h3>
        {total > 0 ? (
          <span className="text-xs text-neutral-500">
            {done} / {total} erledigt
          </span>
        ) : null}
      </div>

      {total === 0 ? (
        <EmptyState
          title="Keine Meilensteine"
          description="Lege unten den ersten Meilenstein fuer dieses Projekt an."
        />
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                checked={m.completed}
                disabled={pending}
                onChange={() => toggle(m.id, !m.completed)}
                className="h-4 w-4 shrink-0 rounded border-neutral-300 text-brand-600 focus:ring-brand-100"
                aria-label="Meilenstein erledigt"
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  m.completed
                    ? "text-neutral-400 line-through"
                    : "text-neutral-900",
                )}
              >
                {m.title}
              </span>
              {m.due_date ? (
                <span className="shrink-0 text-xs text-neutral-500">
                  {formatDate(m.due_date)}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => remove(m.id)}
                disabled={pending}
                className="shrink-0 text-neutral-400 transition-colors hover:text-red-600 disabled:opacity-50"
                aria-label="Meilenstein loeschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Neuer Meilenstein"
            className={cn(inputClass, "sm:flex-1")}
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={cn(inputClass, "sm:w-44")}
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Hinzufuegen
          </Button>
        </div>
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </form>
    </div>
  );
}
