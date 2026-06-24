"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AD_PLATFORMS, AD_PROJECT_STATUSES } from "@/config/catalog";
import {
  createAdProjectAction,
  updateAdProjectAction,
} from "@/app/(app)/production/actions";
import type { AdProjectCreateInput } from "@/lib/validation/production";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface AdProjectFormOptions {
  users: { id: string; full_name: string | null }[];
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
}

export interface AdProjectFormInitial {
  title?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  owner_id?: string | null;
  platform?: string | null;
  budget?: number | null;
  objective?: string | null;
  status?: string | null;
}

const defaultStatus =
  AD_PROJECT_STATUSES.find((s) => "isDefault" in s && s.isDefault)?.key ??
  AD_PROJECT_STATUSES[0].key;

export function AdProjectForm({
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
  options: AdProjectFormOptions;
  initial?: AdProjectFormInitial;
  clientId?: string;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    client_id: clientId ?? initial?.client_id ?? "",
    project_id: initial?.project_id ?? "",
    owner_id: initial?.owner_id ?? "",
    platform: initial?.platform ?? "",
    budget:
      initial?.budget != null && initial.budget !== undefined
        ? String(initial.budget / 100)
        : "",
    objective: initial?.objective ?? "",
    status: initial?.status ?? defaultStatus,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.title.trim()) {
      setError("Bitte einen Kampagnentitel eingeben.");
      return;
    }
    const input: AdProjectCreateInput = {
      title: form.title.trim(),
      client_id: form.client_id || undefined,
      project_id: form.project_id || undefined,
      owner_id: form.owner_id || undefined,
      platform: (form.platform || undefined) as AdProjectCreateInput["platform"],
      budget: form.budget ? Math.round(Number(form.budget) * 100) : undefined,
      objective: form.objective || undefined,
      status: (form.status || undefined) as AdProjectCreateInput["status"],
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAdProjectAction(input)
          : await updateAdProjectAction(id as string, input);
      if (result.ok) onDone?.({ id: result.data?.id });
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

        {clientId ? null : (
          <Field label="Kunde">
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
          </Field>
        )}

        <Field label="Projekt">
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
        </Field>

        <Field label="Verantwortlich">
          <select
            value={form.owner_id}
            onChange={(e) => set("owner_id", e.target.value)}
            className={inputClass}
          >
            <option value="">- niemand -</option>
            {options.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? "Unbenannt"}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Plattform">
          <select
            value={form.platform}
            onChange={(e) => set("platform", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {AD_PLATFORMS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Budget (CHF)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.budget}
            onChange={(e) => set("budget", e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </Field>

        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            {AD_PROJECT_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Zielsetzung
        </label>
        <textarea
          value={form.objective}
          onChange={(e) => set("objective", e.target.value)}
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
          ) : mode === "create" ? (
            "Ads-Kampagne erstellen"
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
