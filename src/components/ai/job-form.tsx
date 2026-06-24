"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AUTOMATION_JOB_TYPES,
  AUTOMATION_JOB_STATUSES,
  SCHEDULE_TYPES,
} from "@/config/catalog";
import {
  createJobAction,
  updateJobAction,
} from "@/app/(app)/settings/ai/actions";
import type {
  AutomationJobCreateInput,
  AutomationJobUpdateInput,
} from "@/lib/validation/ai";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface JobFormInitial {
  name?: string;
  type?: string | null;
  status?: string | null;
  schedule?: string | null;
  next_run_at?: string | null;
}

/** Wandelt einen ISO-Zeitstempel in den Wert eines datetime-local-Feldes (YYYY-MM-DDTHH:mm). */
function toDatetimeLocal(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function JobForm({
  mode,
  id,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: JobFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    type: initial?.type ?? "",
    status: initial?.status ?? "paused",
    schedule: initial?.schedule ?? "manual",
    next_run_at: toDatetimeLocal(initial?.next_run_at),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Namen fuer den Job eingeben.");
      return;
    }
    const input: AutomationJobCreateInput = {
      name: form.name.trim(),
      type: (form.type || undefined) as AutomationJobCreateInput["type"],
      status: (form.status || undefined) as AutomationJobCreateInput["status"],
      schedule: (form.schedule || undefined) as AutomationJobCreateInput["schedule"],
      next_run_at: form.next_run_at || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createJobAction(input)
          : await updateJobAction(id as string, input as AutomationJobUpdateInput);
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
          Name *
        </label>
        <input
          autoFocus
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="z.B. Taegliche Lead-Suche"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Typ">
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {AUTOMATION_JOB_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            {AUTOMATION_JOB_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Zeitplan">
          <select
            value={form.schedule}
            onChange={(e) => set("schedule", e.target.value)}
            className={inputClass}
          >
            {SCHEDULE_TYPES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Naechste Ausfuehrung">
          <input
            type="datetime-local"
            value={form.next_run_at}
            onChange={(e) => set("next_run_at", e.target.value)}
            className={inputClass}
          />
        </Field>
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
            "Job erstellen"
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  );
}
