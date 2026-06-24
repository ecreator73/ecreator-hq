"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createGoalAction, updateGoalAction } from "@/app/(app)/executive/actions";
import type { CompanyGoalCreateInput } from "@/lib/validation/executive";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface GoalFormInitial {
  title?: string;
  target_value?: number | null;
  current_value?: number | null;
  unit?: string | null;
  due_date?: string | null;
}

export function GoalForm({
  mode,
  id,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: GoalFormInitial;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    target_value:
      initial?.target_value == null ? "" : String(initial.target_value),
    current_value:
      initial?.current_value == null ? "" : String(initial.current_value),
    unit: initial?.unit ?? "",
    due_date: initial?.due_date ?? "",
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
    const input: CompanyGoalCreateInput = {
      title: form.title.trim(),
      target_value: form.target_value === "" ? undefined : Number(form.target_value),
      current_value: form.current_value === "" ? undefined : Number(form.current_value),
      unit: form.unit.trim() || undefined,
      due_date: form.due_date || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createGoalAction(input)
          : await updateGoalAction(id as string, input);
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
        <label className="block text-sm font-medium text-neutral-700">Titel *</label>
        <input
          autoFocus
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="z.B. MRR auf 50'000 CHF"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">Zielwert</label>
          <input
            type="number"
            inputMode="decimal"
            value={form.target_value}
            onChange={(e) => set("target_value", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">Aktueller Wert</label>
          <input
            type="number"
            inputMode="decimal"
            value={form.current_value}
            onChange={(e) => set("current_value", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">Einheit</label>
          <input
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="z.B. CHF, Kunden, %"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">Faelligkeit</label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => set("due_date", e.target.value)}
            className={inputClass}
          />
        </div>
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
            "Ziel erstellen"
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
  );
}
