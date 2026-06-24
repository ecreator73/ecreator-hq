"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EMAIL_TEMPLATE_CATEGORIES } from "@/config/catalog";
import {
  createTemplateAction,
  updateTemplateAction,
} from "@/app/(app)/sales/outreach/actions";
import type { EmailTemplateCreateInput } from "@/lib/validation/outreach";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface TemplateFormInitial {
  name?: string;
  category?: string | null;
  subject?: string | null;
  body?: string | null;
  active?: boolean | null;
}

/**
 * Formular fuer E-Mail-Templates. Variablen werden serverseitig aus {{...}}
 * im Betreff/Text abgeleitet — hier nur Name, Kategorie, Betreff, Text, Aktiv.
 */
export function TemplateForm({
  mode,
  id,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: TemplateFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    subject: initial?.subject ?? "",
    body: initial?.body ?? "",
    active: initial?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Template-Namen eingeben.");
      return;
    }
    const input: EmailTemplateCreateInput = {
      name: form.name.trim(),
      category: (form.category || undefined) as EmailTemplateCreateInput["category"],
      subject: form.subject || undefined,
      body: form.body || undefined,
      active: form.active,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTemplateAction(input)
          : await updateTemplateAction(id as string, input);
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
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-sm font-medium text-neutral-700">
            Name *
          </label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="z. B. Website-Audit Erstkontakt"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Kategorie
          </label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {EMAIL_TEMPLATE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
            />
            Aktiv
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">Betreff</label>
        <input
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
          placeholder="z. B. Kurze Frage zu {{company_name}}"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">Text</label>
        <textarea
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          rows={10}
          placeholder={"Hallo {{first_name}},\n\n..."}
          className={`${inputClass} font-mono`}
        />
        <p className="text-xs text-neutral-400">
          Platzhalter mit doppelten geschweiften Klammern schreiben, z. B.{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5">{"{{company_name}}"}</code>{" "}
          — Variablen werden automatisch erkannt.
        </p>
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
            "Template erstellen"
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
  );
}
