"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHOOT_STATUSES } from "@/config/catalog";
import {
  createShootAction,
  updateShootAction,
} from "@/app/(app)/production/actions";
import type { ShootCreateInput } from "@/lib/validation/production";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface ShootFormInitial {
  title?: string | null;
  client_id?: string | null;
  content_project_id?: string | null;
  shooting_date?: string | null;
  location?: string | null;
  videographer?: string | null;
  status?: string | null;
  notes?: string | null;
}

/** Wandelt einen ISO-String in den `datetime-local`-Eingabewert (lokale Zeit). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ShootForm({
  mode,
  id,
  options,
  initial,
  clientId,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  options: {
    clients: { id: string; name: string }[];
    contentProjects: { id: string; title: string }[];
  };
  initial?: ShootFormInitial;
  /** Fester Kunde - blendet die Kundenauswahl aus. */
  clientId?: string;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const fixedClientId = clientId ?? initial?.client_id ?? "";
  const lockClient = Boolean(clientId);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    client_id: fixedClientId,
    content_project_id: initial?.content_project_id ?? "",
    shooting_date: toLocalInput(initial?.shooting_date),
    location: initial?.location ?? "",
    videographer: initial?.videographer ?? "",
    status: initial?.status ?? "planned",
    notes: initial?.notes ?? "",
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
    const input: ShootCreateInput = {
      title: form.title.trim(),
      client_id: form.client_id || undefined,
      content_project_id: form.content_project_id || undefined,
      shooting_date: form.shooting_date
        ? new Date(form.shooting_date).toISOString()
        : undefined,
      location: form.location || undefined,
      videographer: form.videographer || undefined,
      status: (form.status || undefined) as ShootCreateInput["status"],
      notes: form.notes || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createShootAction(input)
          : await updateShootAction(id as string, input);
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
        {!lockClient ? (
          <Field label="Kunde">
            <select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} className={inputClass}>
              <option value="">- keine Angabe -</option>
              {options.clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Content-Projekt">
          <select value={form.content_project_id} onChange={(e) => set("content_project_id", e.target.value)} className={inputClass}>
            <option value="">- keine Angabe -</option>
            {options.contentProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Shooting-Termin">
          <input type="datetime-local" value={form.shooting_date} onChange={(e) => set("shooting_date", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
            {SHOOT_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Ort">
          <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Videograf">
          <input value={form.videographer} onChange={(e) => set("videographer", e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">Notizen</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={inputClass} />
      </div>

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
            "Shooting erstellen"
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
