"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOKED_MEETING_STATUSES, MEETING_SOURCES } from "@/config/catalog";
import { createMeetingAction } from "@/app/(app)/sales/outreach/actions";
import type { BookedMeetingCreateInput } from "@/lib/validation/outreach";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/**
 * Formular fuer einen gebuchten Termin. Erstellt ueber createMeetingAction.
 * Leads werden als Optionen uebergeben (vom Quick-Create geladen).
 */
export function MeetingForm({
  options,
  onDone,
  onCancel,
}: {
  options: { leads: { id: string; company_name: string }[] };
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    lead_id: "",
    title: "",
    date: "",
    status: "requested",
    source: "manual",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    const input: BookedMeetingCreateInput = {
      lead_id: form.lead_id || undefined,
      title: form.title.trim() || undefined,
      date: form.date || undefined,
      status: (form.status || undefined) as BookedMeetingCreateInput["status"],
      source: (form.source || undefined) as BookedMeetingCreateInput["source"],
      notes: form.notes.trim() || undefined,
    };

    startTransition(async () => {
      const result = await createMeetingAction(input);
      if (result.ok) onDone?.({});
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lead" full>
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
        </Field>
        <Field label="Titel" full>
          <input
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="z. B. Erstgespraech"
            className={inputClass}
          />
        </Field>
        <Field label="Datum & Uhrzeit">
          <input
            type="datetime-local"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            {BOOKED_MEETING_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Quelle">
          <select
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
            className={inputClass}
          >
            {MEETING_SOURCES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
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
            "Termin erstellen"
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <label className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  );
}
