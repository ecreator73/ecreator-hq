"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MEETING_STATUSES } from "@/config/catalog";
import { createSalesMeetingAction } from "@/app/(app)/sales/actions";
import type { SalesFormOptions } from "@/app/(app)/sales/actions";
import type { MeetingCreateInput } from "@/lib/validation/meetings";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface MeetingFormInitial {
  lead_id?: string | null;
  title?: string;
  /** ISO-Datum (wird intern in datetime-local konvertiert) */
  meeting_date?: string | null;
  duration_minutes?: number | null;
  status?: string;
  notes?: string | null;
  next_steps?: string | null;
}

/** ISO-String -> Wert fuer <input type="datetime-local"> (lokale Zeit). */
function isoToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function MeetingForm({
  options,
  initial,
  onDone,
  onCancel,
}: {
  options: SalesFormOptions;
  initial?: MeetingFormInitial;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    lead_id: initial?.lead_id ?? "",
    title: initial?.title ?? "",
    meeting_date: isoToLocalInput(initial?.meeting_date),
    duration_minutes:
      initial?.duration_minutes != null ? String(initial.duration_minutes) : "",
    status: initial?.status ?? "planned",
    notes: initial?.notes ?? "",
    next_steps: initial?.next_steps ?? "",
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
    const input: MeetingCreateInput = {
      lead_id: form.lead_id || undefined,
      title: form.title.trim(),
      meeting_date: form.meeting_date
        ? new Date(form.meeting_date).toISOString()
        : undefined,
      duration_minutes:
        form.duration_minutes === ""
          ? undefined
          : Number(form.duration_minutes),
      status: form.status as MeetingCreateInput["status"],
      notes: form.notes || undefined,
      next_steps: form.next_steps || undefined,
    };

    startTransition(async () => {
      const result = await createSalesMeetingAction(input);
      if (result.ok) onDone?.();
      else setError(result.error);
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
          Lead
        </label>
        <select
          value={form.lead_id}
          onChange={(e) => set("lead_id", e.target.value)}
          className={inputClass}
        >
          <option value="">- kein Lead -</option>
          {options.leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.company_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Titel *
        </label>
        <input
          autoFocus
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Datum &amp; Uhrzeit
          </label>
          <input
            type="datetime-local"
            value={form.meeting_date}
            onChange={(e) => set("meeting_date", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Dauer (Minuten)
          </label>
          <input
            type="number"
            min={0}
            value={form.duration_minutes}
            onChange={(e) => set("duration_minutes", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            {MEETING_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Notizen
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Naechste Schritte
        </label>
        <textarea
          value={form.next_steps}
          onChange={(e) => set("next_steps", e.target.value)}
          rows={2}
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
          ) : (
            "Termin speichern"
          )}
        </Button>
      </div>
    </form>
  );
}
