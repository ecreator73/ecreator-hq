"use client";

import { useState, useTransition } from "react";
import { AlertCircle, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KNOWLEDGE_CATEGORIES,
  SOP_STATUSES,
} from "@/config/catalog";
import {
  createSopAction,
  updateSopAction,
} from "@/app/(app)/operations/actions";
import type { SopCreateInput } from "@/lib/validation/knowledge";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface SopFormInitial {
  title?: string;
  category?: string | null;
  status?: string | null;
  steps?: { title?: string; description?: string | null }[] | null;
}

interface StepDraft {
  title: string;
  description: string;
}

export function SopForm({
  mode,
  id,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: SopFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [status, setStatus] = useState(initial?.status ?? "draft");
  const [steps, setSteps] = useState<StepDraft[]>(
    initial?.steps && initial.steps.length > 0
      ? initial.steps.map((s) => ({
          title: s.title ?? "",
          description: s.description ?? "",
        }))
      : [{ title: "", description: "" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setStep(index: number, key: keyof StepDraft, value: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    );
  }

  function addStep() {
    setSteps((prev) => [...prev, { title: "", description: "" }]);
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }

    const cleanedSteps = steps
      .map((s) => ({
        title: s.title.trim(),
        description: s.description.trim() || undefined,
      }))
      .filter((s) => s.title.length > 0);

    const input: SopCreateInput = {
      title: title.trim(),
      category: (category || undefined) as SopCreateInput["category"],
      status: (status || undefined) as SopCreateInput["status"],
      steps: cleanedSteps.length > 0 ? cleanedSteps : undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSopAction(input)
          : await updateSopAction(id as string, input);
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Onboarding neuer Kunde"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Kategorie
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {KNOWLEDGE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {SOP_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700">
            Schritte
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={addStep}>
            <Plus className="h-4 w-4" />
            Schritt hinzufuegen
          </Button>
        </div>

        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li
              key={index}
              className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 flex items-center gap-1 text-neutral-400">
                  <GripVertical className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-semibold tabular-nums text-neutral-500">
                    {index + 1}
                  </span>
                </span>
                <div className="flex-1 space-y-2">
                  <input
                    value={step.title}
                    onChange={(e) => setStep(index, "title", e.target.value)}
                    placeholder={`Schritt ${index + 1} – Titel`}
                    className={inputClass}
                  />
                  <textarea
                    value={step.description}
                    onChange={(e) =>
                      setStep(index, "description", e.target.value)
                    }
                    rows={2}
                    placeholder="Beschreibung (optional)"
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  disabled={steps.length <= 1}
                  aria-label="Schritt entfernen"
                  className="mt-1 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
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
            "SOP erstellen"
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
  );
}
