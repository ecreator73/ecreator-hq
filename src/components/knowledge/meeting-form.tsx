"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MEETING_STATUSES, MEETING_TYPES } from "@/config/catalog";
import {
  createMeetingAction,
  updateMeetingAction,
} from "@/app/(app)/operations/actions";
import type { MeetingCreateInput } from "@/lib/validation/meetings";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface MeetingFormInitial {
  title?: string;
  meeting_type?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  meeting_date?: string | null;
  status?: string | null;
  recording_url?: string | null;
  notes?: string | null;
  decisions?: string | null;
  next_steps?: string | null;
}

export interface MeetingFormOptions {
  clients: { id: string; name: string }[];
  leads: { id: string; company_name: string }[];
}

/** ISO/Datetime-String -> Wert fuer <input type="datetime-local"> (YYYY-MM-DDTHH:mm). */
function toLocalInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MeetingForm({
  mode,
  id,
  options,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  options: MeetingFormOptions;
  initial?: MeetingFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    meeting_type: initial?.meeting_type ?? "",
    client_id: initial?.client_id ?? "",
    lead_id: initial?.lead_id ?? "",
    meeting_date: toLocalInput(initial?.meeting_date),
    status: initial?.status ?? "planned",
    recording_url: initial?.recording_url ?? "",
    notes: initial?.notes ?? "",
    decisions: initial?.decisions ?? "",
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
      title: form.title.trim(),
      meeting_type: (form.meeting_type || undefined) as MeetingCreateInput["meeting_type"],
      client_id: form.client_id || undefined,
      lead_id: form.lead_id || undefined,
      meeting_date: form.meeting_date
        ? new Date(form.meeting_date).toISOString()
        : undefined,
      status: (form.status || undefined) as MeetingCreateInput["status"],
      recording_url: form.recording_url.trim() || undefined,
      notes: form.notes.trim() || undefined,
      decisions: form.decisions.trim() || undefined,
      next_steps: form.next_steps.trim() || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createMeetingAction(input)
          : await updateMeetingAction(id as string, input);
      if (result.ok) onDone?.({ id: result.ok ? result.data?.id : undefined });
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
        <Field label="Meeting-Typ">
          <select
            value={form.meeting_type}
            onChange={(e) => set("meeting_type", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {MEETING_TYPES.map((t) => (
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
            {MEETING_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kunde">
          <select
            value={form.client_id}
            onChange={(e) => set("client_id", e.target.value)}
            className={inputClass}
          >
            <option value="">- keiner -</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lead">
          <select
            value={form.lead_id}
            onChange={(e) => set("lead_id", e.target.value)}
            className={inputClass}
          >
            <option value="">- keiner -</option>
            {options.leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.company_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Datum / Uhrzeit">
          <input
            type="datetime-local"
            value={form.meeting_date}
            onChange={(e) => set("meeting_date", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Aufzeichnung (URL)">
          <input
            value={form.recording_url}
            onChange={(e) => set("recording_url", e.target.value)}
            placeholder="https://"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Notizen">
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Field>
      <Field label="Entscheidungen">
        <textarea
          value={form.decisions}
          onChange={(e) => set("decisions", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Field>
      <Field label="Naechste Schritte">
        <textarea
          value={form.next_steps}
          onChange={(e) => set("next_steps", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Field>

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
            "Meeting erstellen"
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
