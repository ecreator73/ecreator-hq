"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AI_PROMPT_CATEGORIES,
  AI_PROMPT_STATUSES,
  AI_MODELS,
} from "@/config/catalog";
import {
  createPromptAction,
  updatePromptAction,
} from "@/app/(app)/settings/ai/actions";
import type { AiPromptCreateInput } from "@/lib/validation/ai";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface PromptFormInitial {
  name?: string;
  category?: string | null;
  description?: string | null;
  system_prompt?: string | null;
  user_prompt_template?: string | null;
  variables?: string[] | null;
  model?: string | null;
  temperature?: number | null;
  status?: string | null;
}

export function PromptForm({
  mode,
  id,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: PromptFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    model: initial?.model ?? "",
    temperature:
      initial?.temperature != null ? String(initial.temperature) : "0.7",
    status: initial?.status ?? "active",
    description: initial?.description ?? "",
    system_prompt: initial?.system_prompt ?? "",
    user_prompt_template: initial?.user_prompt_template ?? "",
    variables: (initial?.variables ?? []).join(", "),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Namen eingeben.");
      return;
    }

    const variables = form.variables
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    const input: AiPromptCreateInput = {
      name: form.name.trim(),
      category: (form.category || undefined) as AiPromptCreateInput["category"],
      model: (form.model || undefined) as AiPromptCreateInput["model"],
      temperature: form.temperature === "" ? undefined : Number(form.temperature),
      status: (form.status || undefined) as AiPromptCreateInput["status"],
      description: form.description.trim() || undefined,
      system_prompt: form.system_prompt.trim() || undefined,
      user_prompt_template: form.user_prompt_template.trim() || undefined,
      variables: variables.length ? variables : undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPromptAction(input)
          : await updatePromptAction(id as string, input);
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
            Name *
          </label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="z. B. Lead-Qualifizierung"
            className={inputClass}
          />
        </div>
        <Field label="Kategorie">
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {AI_PROMPT_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Modell">
          <select
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {AI_MODELS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Temperatur">
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={form.temperature}
            onChange={(e) => set("temperature", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            {AI_PROMPT_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Beschreibung
        </label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          placeholder="Wofuer wird dieser Prompt verwendet?"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          System-Prompt
        </label>
        <textarea
          value={form.system_prompt}
          onChange={(e) => set("system_prompt", e.target.value)}
          rows={5}
          placeholder="Rolle und Verhalten des Modells (Systemanweisung)."
          className={`${inputClass} font-mono`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          User-Prompt-Template
        </label>
        <textarea
          value={form.user_prompt_template}
          onChange={(e) => set("user_prompt_template", e.target.value)}
          rows={6}
          placeholder="Platzhalter im Format {{variable}} verwenden."
          className={`${inputClass} font-mono`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Variablen
        </label>
        <input
          value={form.variables}
          onChange={(e) => set("variables", e.target.value)}
          placeholder="company_name, website_url"
          className={inputClass}
        />
        <p className="text-xs text-neutral-500">
          Komma-getrennt. Leer = automatisch aus den Platzhaltern im Template
          ableiten.
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
            "Prompt erstellen"
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
