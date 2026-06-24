"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  addSubtaskAction,
  toggleSubtaskAction,
  deleteSubtaskAction,
} from "@/app/(app)/tasks/actions";
import type { Subtask } from "@/types/entities";

export function SubtaskList({
  taskId,
  subtasks,
}: {
  taskId: string;
  subtasks: Subtask[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const done = subtasks.filter((s) => s.completed).length;
  const pct = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;

  function add() {
    if (!title.trim()) return;
    startTransition(async () => {
      await addSubtaskAction(taskId, title.trim());
      setTitle("");
      router.refresh();
    });
  }
  function toggle(s: Subtask) {
    startTransition(async () => {
      await toggleSubtaskAction(s.id, !s.completed, taskId);
      router.refresh();
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      await deleteSubtaskAction(id, taskId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {subtasks.length > 0 ? (
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-medium text-neutral-500">
            {done}/{subtasks.length}
          </span>
        </div>
      ) : null}

      <ul className="space-y-1">
        {subtasks.map((s) => (
          <li
            key={s.id}
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-50"
          >
            <input
              type="checkbox"
              checked={s.completed}
              onChange={() => toggle(s)}
              className="h-4 w-4"
            />
            <span
              className={
                s.completed
                  ? "flex-1 text-sm text-neutral-400 line-through"
                  : "flex-1 text-sm text-neutral-700"
              }
            >
              {s.title}
            </span>
            <button
              type="button"
              onClick={() => remove(s.id)}
              aria-label="Subtask loeschen"
              className="text-neutral-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Subtask hinzufuegen ..."
          className="h-9 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || !title.trim()}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-neutral-100 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Hinzufuegen
        </button>
      </div>
    </div>
  );
}
