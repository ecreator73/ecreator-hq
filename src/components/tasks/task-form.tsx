"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TASK_STATUSES, PRIORITIES } from "@/config/catalog";
import {
  createTaskAction,
  updateTaskAction,
  type TaskFormOptions,
} from "@/app/(app)/tasks/actions";
import type { TaskCreateInput } from "@/lib/validation/tasks";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface TaskFormInitial {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assigned_to?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  lead_id?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  estimated_hours?: number | null;
  tags?: string[];
}

export function TaskForm({
  mode,
  taskId,
  options,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  taskId?: string;
  options: TaskFormOptions;
  initial?: TaskFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "open",
    priority: initial?.priority ?? "medium",
    assigned_to: initial?.assigned_to ?? "",
    client_id: initial?.client_id ?? "",
    project_id: initial?.project_id ?? "",
    lead_id: initial?.lead_id ?? "",
    due_date: initial?.due_date ?? "",
    start_date: initial?.start_date ?? "",
    estimated_hours:
      initial?.estimated_hours != null ? String(initial.estimated_hours) : "",
    tags: (initial?.tags ?? []).join(", "),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    const input: TaskCreateInput = {
      title: form.title.trim(),
      description: form.description || undefined,
      status: form.status as TaskCreateInput["status"],
      priority: form.priority as TaskCreateInput["priority"],
      assigned_to: form.assigned_to || undefined,
      client_id: form.client_id || undefined,
      project_id: form.project_id || undefined,
      lead_id: form.lead_id || undefined,
      due_date: form.due_date || undefined,
      start_date: form.start_date || undefined,
      estimated_hours:
        form.estimated_hours === "" ? undefined : Number(form.estimated_hours),
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTaskAction(input)
          : await updateTaskAction(taskId as string, input);
      if (result.ok) {
        onDone?.({ id: result.ok ? result.data?.id : undefined });
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Titel *
        </label>
        <input
          autoFocus
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Was muss getan werden?"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Beschreibung
        </label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Prioritaet
          </label>
          <select
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
            className={inputClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Kunde
          </label>
          <select
            value={form.client_id}
            onChange={(e) => set("client_id", e.target.value)}
            className={inputClass}
          >
            <option value="">- kein Kunde -</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Projekt
          </label>
          <select
            value={form.project_id}
            onChange={(e) => set("project_id", e.target.value)}
            className={inputClass}
          >
            <option value="">- kein Projekt -</option>
            {options.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Verantwortlich
          </label>
          <select
            value={form.assigned_to}
            onChange={(e) => set("assigned_to", e.target.value)}
            className={inputClass}
          >
            <option value="">- niemand -</option>
            {options.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? "Unbenannt"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Faellig am
          </label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => set("due_date", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Startdatum
          </label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Geschaetzte Stunden
          </label>
          <input
            type="number"
            min={0}
            step={0.25}
            value={form.estimated_hours}
            onChange={(e) => set("estimated_hours", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Tags (kommagetrennt)
        </label>
        <input
          value={form.tags}
          onChange={(e) => set("tags", e.target.value)}
          placeholder="z.B. dringend, website"
          className={inputClass}
        />
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

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Speichern ...
            </>
          ) : mode === "create" ? (
            "Aufgabe erstellen"
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
  );
}
