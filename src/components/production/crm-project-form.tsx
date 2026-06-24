"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CRM_TYPES, CRM_PROJECT_STATUSES } from "@/config/catalog";
import {
  createCrmProjectAction,
  updateCrmProjectAction,
} from "@/app/(app)/production/actions";
import type { CrmProjectCreateInput } from "@/lib/validation/production";
import type { ProfileMini, ClientMini } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface CrmProjectFormInitial {
  title?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  owner_id?: string | null;
  crm_type?: string | null;
  go_live_date?: string | null;
  status?: string | null;
}

interface ProjectMiniOption {
  id: string;
  title: string;
}

export function CrmProjectForm({
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
  options: { users: ProfileMini[]; clients: ClientMini[]; projects: ProjectMiniOption[] };
  initial?: CrmProjectFormInitial;
  clientId?: string;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    client_id: initial?.client_id ?? clientId ?? "",
    project_id: initial?.project_id ?? "",
    owner_id: initial?.owner_id ?? "",
    crm_type: initial?.crm_type ?? "",
    go_live_date: initial?.go_live_date ?? "",
    status: initial?.status ?? CRM_PROJECT_STATUSES[0].key,
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
    const input: CrmProjectCreateInput = {
      title: form.title.trim(),
      client_id: form.client_id || undefined,
      project_id: form.project_id || undefined,
      owner_id: form.owner_id || undefined,
      crm_type: (form.crm_type || undefined) as CrmProjectCreateInput["crm_type"],
      go_live_date: form.go_live_date || undefined,
      status: (form.status || undefined) as CrmProjectCreateInput["status"],
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCrmProjectAction(input)
          : await updateCrmProjectAction(id as string, input);
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
        <div className="space-y-1.5 sm:col-span-2">
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
        <Field label="Kunde">
          <select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} className={inputClass}>
            <option value="">- keine Angabe -</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Projekt">
          <select value={form.project_id} onChange={(e) => set("project_id", e.target.value)} className={inputClass}>
            <option value="">- keine Angabe -</option>
            {options.projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Verantwortlich">
          <select value={form.owner_id} onChange={(e) => set("owner_id", e.target.value)} className={inputClass}>
            <option value="">- niemand -</option>
            {options.users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name ?? "Unbenannt"}</option>
            ))}
          </select>
        </Field>
        <Field label="CRM-Typ">
          <select value={form.crm_type} onChange={(e) => set("crm_type", e.target.value)} className={inputClass}>
            <option value="">- keine Angabe -</option>
            {CRM_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Go-Live-Datum">
          <input type="date" value={form.go_live_date} onChange={(e) => set("go_live_date", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
            {CRM_PROJECT_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </Field>
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
            "CRM-Projekt erstellen"
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
