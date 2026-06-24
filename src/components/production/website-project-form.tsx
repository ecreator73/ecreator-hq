"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CMS_OPTIONS, WEBSITE_PROJECT_STATUSES } from "@/config/catalog";
import {
  createWebsiteProjectAction,
  updateWebsiteProjectAction,
} from "@/app/(app)/production/actions";
import type { WebsiteProjectCreateInput } from "@/lib/validation/production";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface WebsiteProjectFormOptions {
  users: { id: string; full_name: string | null }[];
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
}

export interface WebsiteProjectFormInitial {
  title?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  owner_id?: string | null;
  domain?: string | null;
  cms?: string | null;
  hosting?: string | null;
  seo_status?: string | null;
  tracking_status?: string | null;
  launch_date?: string | null;
  status?: string | null;
}

const defaultStatus =
  WEBSITE_PROJECT_STATUSES.find((s) => "isDefault" in s && s.isDefault)?.key ??
  WEBSITE_PROJECT_STATUSES[0].key;

export function WebsiteProjectForm({
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
  options: WebsiteProjectFormOptions;
  initial?: WebsiteProjectFormInitial;
  clientId?: string;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    client_id: clientId ?? initial?.client_id ?? "",
    project_id: initial?.project_id ?? "",
    owner_id: initial?.owner_id ?? "",
    domain: initial?.domain ?? "",
    cms: initial?.cms ?? "",
    hosting: initial?.hosting ?? "",
    seo_status: initial?.seo_status ?? "",
    tracking_status: initial?.tracking_status ?? "",
    launch_date: initial?.launch_date ?? "",
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
      setError("Bitte einen Projekttitel eingeben.");
      return;
    }
    const input: WebsiteProjectCreateInput = {
      title: form.title.trim(),
      client_id: form.client_id || undefined,
      project_id: form.project_id || undefined,
      owner_id: form.owner_id || undefined,
      domain: form.domain || undefined,
      cms: (form.cms || undefined) as WebsiteProjectCreateInput["cms"],
      hosting: form.hosting || undefined,
      seo_status: form.seo_status || undefined,
      tracking_status: form.tracking_status || undefined,
      launch_date: form.launch_date || undefined,
      status: (form.status || undefined) as WebsiteProjectCreateInput["status"],
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createWebsiteProjectAction(input)
          : await updateWebsiteProjectAction(id as string, input);
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

        <Field label="Domain">
          <input
            value={form.domain}
            onChange={(e) => set("domain", e.target.value)}
            placeholder="example.ch"
            className={inputClass}
          />
        </Field>

        <Field label="CMS">
          <select
            value={form.cms}
            onChange={(e) => set("cms", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {CMS_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Hosting">
          <input
            value={form.hosting}
            onChange={(e) => set("hosting", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="SEO-Status">
          <input
            value={form.seo_status}
            onChange={(e) => set("seo_status", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Tracking-Status">
          <input
            value={form.tracking_status}
            onChange={(e) => set("tracking_status", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Launch-Datum">
          <input
            type="date"
            value={form.launch_date}
            onChange={(e) => set("launch_date", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            {WEBSITE_PROJECT_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
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
            "Website-Projekt erstellen"
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
