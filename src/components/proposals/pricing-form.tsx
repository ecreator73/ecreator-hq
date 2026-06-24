"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICING_CATEGORIES } from "@/config/catalog";
import {
  createPricingItemAction,
  updatePricingItemAction,
} from "@/app/(app)/sales/proposals/actions";
import type { PricingItemCreateInput } from "@/lib/validation/proposals";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface PricingFormInitial {
  name?: string;
  category?: string | null;
  /** unit_price in Rappen */
  unit_price?: number | null;
  recurring?: boolean | null;
  active?: boolean | null;
}

export function PricingForm({
  mode,
  id,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: PricingFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    // CHF-Eingabe; aus Rappen initialisiert
    unit_price:
      initial?.unit_price != null ? String(initial.unit_price / 100) : "",
    recurring: initial?.recurring ?? false,
    active: initial?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Namen eingeben.");
      return;
    }

    const input: PricingItemCreateInput = {
      name: form.name.trim(),
      category: (form.category || undefined) as PricingItemCreateInput["category"],
      unit_price:
        form.unit_price.trim() === ""
          ? undefined
          : Math.round(Number(form.unit_price) * 100),
      recurring: form.recurring,
      active: form.active,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPricingItemAction(input)
          : await updatePricingItemAction(id as string, input);
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
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Name *
        </label>
        <input
          autoFocus
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="z.B. Landingpage, Meta-Ads-Betreuung ..."
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
            onChange={(e) => setField("category", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {PRICING_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Einzelpreis (CHF)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={form.unit_price}
            onChange={(e) => setField("unit_price", e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2.5 rounded-lg border border-neutral-200 bg-neutral-50/60 px-3.5 py-3">
        <label className="flex items-center gap-2.5 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={form.recurring}
            onChange={(e) => setField("recurring", e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-200"
          />
          <span>
            Wiederkehrend
            <span className="ml-1 text-neutral-400">(monatlich)</span>
          </span>
        </label>
        <label className="flex items-center gap-2.5 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setField("active", e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-200"
          />
          <span>
            Aktiv
            <span className="ml-1 text-neutral-400">
              (im Katalog auswaehlbar)
            </span>
          </span>
        </label>
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
            "Preis erstellen"
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
  );
}
