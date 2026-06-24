"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REPORTING_CALL_STATUSES } from "@/config/catalog";
import {
  createReportingCallAction,
  updateReportingCallAction,
} from "@/app/(app)/clients/actions";
import type { ReportingCallCreateInput } from "@/lib/validation/reporting-calls";
import type { ProfileMini } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface ReportingCallFormInitial {
  client_id?: string | null;
  owner_id?: string | null;
  scheduled_date?: string | null;
  status?: string | null;
  meeting_link?: string | null;
  agenda?: string | null;
  topics?: string | null;
  results?: string | null;
  challenges?: string | null;
  notes?: string | null;
  summary?: string | null;
  next_steps?: string | null;
  responsibilities?: string | null;
}

/** Wandelt einen ISO-String in den `datetime-local`-Eingabewert (lokale Zeit). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReportingCallForm({
  mode,
  callId,
  users,
  clients,
  clientId,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  callId?: string;
  users: ProfileMini[];
  /** Auswahlliste der Kunden; entfaellt, wenn ein fester clientId gesetzt ist. */
  clients?: { id: string; name: string }[];
  /** Fester Kunde - blendet die Kundenauswahl aus. */
  clientId?: string;
  initial?: ReportingCallFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const fixedClientId = clientId ?? initial?.client_id ?? "";
  const lockClient = Boolean(clientId);
  const [form, setForm] = useState({
    client_id: fixedClientId,
    owner_id: initial?.owner_id ?? "",
    scheduled_date: toLocalInput(initial?.scheduled_date),
    status: initial?.status ?? "open",
    meeting_link: initial?.meeting_link ?? "",
    agenda: initial?.agenda ?? "",
    topics: initial?.topics ?? "",
    results: initial?.results ?? "",
    challenges: initial?.challenges ?? "",
    notes: initial?.notes ?? "",
    summary: initial?.summary ?? "",
    next_steps: initial?.next_steps ?? "",
    responsibilities: initial?.responsibilities ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.client_id) {
      setError("Bitte einen Kunden auswaehlen.");
      return;
    }
    const input: ReportingCallCreateInput = {
      client_id: form.client_id,
      owner_id: form.owner_id || undefined,
      scheduled_date: form.scheduled_date
        ? new Date(form.scheduled_date).toISOString()
        : undefined,
      status: (form.status || undefined) as ReportingCallCreateInput["status"],
      meeting_link: form.meeting_link || undefined,
      agenda: form.agenda || undefined,
      topics: form.topics || undefined,
      results: form.results || undefined,
      challenges: form.challenges || undefined,
      notes: form.notes || undefined,
      summary: form.summary || undefined,
      next_steps: form.next_steps || undefined,
      responsibilities: form.responsibilities || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createReportingCallAction(input)
          : await updateReportingCallAction(callId as string, input);
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
      <div className="grid gap-4 sm:grid-cols-2">
        {!lockClient ? (
          <Field label="Kunde *">
            <select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} className={inputClass}>
              <option value="">- bitte waehlen -</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Verantwortlich">
          <select value={form.owner_id} onChange={(e) => set("owner_id", e.target.value)} className={inputClass}>
            <option value="">- niemand -</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name ?? "Unbenannt"}</option>
            ))}
          </select>
        </Field>
        <Field label="Termin">
          <input type="datetime-local" value={form.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
            {REPORTING_CALL_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Meeting-Link">
          <input value={form.meeting_link} onChange={(e) => set("meeting_link", e.target.value)} placeholder="https://" className={inputClass} />
        </Field>
      </div>

      <TextareaField label="Agenda" value={form.agenda} onChange={(v) => set("agenda", v)} />
      <TextareaField label="Themen" value={form.topics} onChange={(v) => set("topics", v)} />
      <TextareaField label="Ergebnisse" value={form.results} onChange={(v) => set("results", v)} />
      <TextareaField label="Herausforderungen" value={form.challenges} onChange={(v) => set("challenges", v)} />
      <TextareaField label="Zusammenfassung" value={form.summary} onChange={(v) => set("summary", v)} />
      <TextareaField label="Naechste Schritte" value={form.next_steps} onChange={(v) => set("next_steps", v)} />
      <TextareaField label="Verantwortlichkeiten" value={form.responsibilities} onChange={(v) => set("responsibilities", v)} />
      <TextareaField label="Notizen" value={form.notes} onChange={(v) => set("notes", v)} />

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
            "Reporting-Call erstellen"
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={inputClass}
      />
    </div>
  );
}
