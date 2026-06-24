"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROMPT_LIBRARY_CATEGORIES } from "@/config/catalog";
import {
  createPromptLibraryAction,
  updatePromptLibraryAction,
} from "@/app/(app)/operations/actions";
import type { PromptLibraryCreateInput } from "@/lib/validation/knowledge";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface PromptLibFormInitial {
  title?: string;
  category?: string | null;
  prompt?: string | null;
  tags?: string[] | null;
}

/** Komma-separierten String in ein bereinigtes string[] umwandeln. */
function toList(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function PromptLibForm({
  mode,
  id,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: PromptLibFormInitial;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    category: initial?.category ?? "",
    prompt: initial?.prompt ?? "",
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
    const tags = toList(form.tags);
    const input: PromptLibraryCreateInput = {
      title: form.title.trim(),
      category: (form.category || undefined) as PromptLibraryCreateInput["category"],
      prompt: form.prompt.trim() || undefined,
      tags: tags.length ? tags : undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPromptLibraryAction(input)
          : await updatePromptLibraryAction(id as string, input);
      if (result.ok) onDone?.();
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
            {PROMPT_LIBRARY_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Tags
          </label>
          <input
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="Komma-getrennt, z. B. Sales, Outbound"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Prompt
        </label>
        <textarea
          value={form.prompt}
          onChange={(e) => set("prompt", e.target.value)}
          rows={10}
          placeholder="Vollstaendiger Prompt-Text. Variablen z. B. als {{firma}} markieren."
          className={`${inputClass} font-mono`}
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
            "Prompt erstellen"
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
  );
}
