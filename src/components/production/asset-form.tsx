"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ASSET_CATEGORIES } from "@/config/catalog";
import {
  createAssetAction,
  updateAssetAction,
} from "@/app/(app)/production/actions";
import type { AssetCreateInput } from "@/lib/validation/production";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface AssetFormInitial {
  title?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  category?: string | null;
  file_url?: string | null;
  tags?: string[] | null;
}

/** Wandelt eine Komma-getrennte Eingabe in ein bereinigtes string[]. */
function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function AssetForm({
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
    projects: { id: string; title: string }[];
  };
  initial?: AssetFormInitial;
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
    project_id: initial?.project_id ?? "",
    category: initial?.category ?? "",
    file_url: initial?.file_url ?? "",
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
    const tags = parseTags(form.tags);
    const input: AssetCreateInput = {
      title: form.title.trim(),
      client_id: form.client_id || undefined,
      project_id: form.project_id || undefined,
      category: (form.category || undefined) as AssetCreateInput["category"],
      file_url: form.file_url || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAssetAction(input)
          : await updateAssetAction(id as string, input);
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
        <Field label="Projekt">
          <select value={form.project_id} onChange={(e) => set("project_id", e.target.value)} className={inputClass}>
            <option value="">- keine Angabe -</option>
            {options.projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Kategorie">
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
            <option value="">- keine Angabe -</option>
            {ASSET_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Datei-URL">
          <input value={form.file_url} onChange={(e) => set("file_url", e.target.value)} placeholder="https://" className={inputClass} />
        </Field>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">Tags</label>
        <input
          value={form.tags}
          onChange={(e) => set("tags", e.target.value)}
          placeholder="Komma-getrennt, z.B. logo, kampagne, herbst"
          className={inputClass}
        />
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
            "Asset erstellen"
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
