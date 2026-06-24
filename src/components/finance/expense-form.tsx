"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EXPENSE_CATEGORIES,
  RECURRING_FREQUENCIES,
} from "@/config/catalog";
import {
  createExpenseAction,
  updateExpenseAction,
} from "@/app/(app)/finance/actions";
import type {
  ExpenseCreateInput,
  ExpenseUpdateInput,
} from "@/lib/validation/expenses";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface ExpenseFormInitial {
  title?: string;
  category?: string | null;
  /** Betrag in Rappen. */
  amount?: number | null;
  date?: string | null;
  recurring?: boolean | null;
  recurring_frequency?: string | null;
  notes?: string | null;
}

/** Betrag in Rappen -> CHF-String fuer das Eingabefeld. */
function rappenToChf(rappen?: number | null): string {
  if (rappen == null) return "";
  return String(rappen / 100);
}

export function ExpenseForm({
  mode,
  id,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: ExpenseFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    category: initial?.category ?? "",
    amount: rappenToChf(initial?.amount),
    date: initial?.date ?? "",
    recurring: initial?.recurring ?? false,
    recurring_frequency: initial?.recurring_frequency ?? "monthly",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.title.trim()) {
      setError("Bitte eine Bezeichnung eingeben.");
      return;
    }

    const amount =
      form.amount.trim() === ""
        ? undefined
        : Math.round(Number(form.amount) * 100);
    if (amount !== undefined && Number.isNaN(amount)) {
      setError("Bitte einen gueltigen Betrag eingeben.");
      return;
    }

    const input: ExpenseCreateInput = {
      title: form.title.trim(),
      category: (form.category || undefined) as ExpenseCreateInput["category"],
      amount,
      date: form.date || undefined,
      recurring: form.recurring,
      recurring_frequency: form.recurring
        ? (form.recurring_frequency ||
            undefined) as ExpenseCreateInput["recurring_frequency"]
        : undefined,
      notes: form.notes || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createExpenseAction(input)
          : await updateExpenseAction(id as string, input as ExpenseUpdateInput);
      if (result.ok)
        onDone?.({ id: result.ok ? result.data?.id : undefined });
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
          Bezeichnung *
        </label>
        <input
          autoFocus
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategorie">
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Betrag (CHF)">
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </Field>
        <Field label="Datum">
          <input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Wiederkehrend">
          <label className="flex h-[42px] items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 shadow-sm">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => set("recurring", e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
            />
            Wiederkehrende Kosten
          </label>
        </Field>
        {form.recurring ? (
          <Field label="Frequenz">
            <select
              value={form.recurring_frequency}
              onChange={(e) => set("recurring_frequency", e.target.value)}
              className={inputClass}
            >
              {RECURRING_FREQUENCIES.map((fq) => (
                <option key={fq.key} value={fq.key}>
                  {fq.label}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Notizen
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
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
            "Kosten erstellen"
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
