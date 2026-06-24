"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PRICING_CATEGORIES, PRICING_CATEGORY_LABELS } from "@/config/catalog";
import {
  addProposalItemAction,
  deleteProposalItemAction,
} from "@/app/(app)/sales/proposals/actions";
import { formatCHF, cn } from "@/lib/utils";
import type { ProposalItem } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** CHF-Eingabe -> Rappen (ganzzahlig). Leere Eingabe -> undefined. */
function chfToRappen(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const num = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(num)) return undefined;
  return Math.round(num * 100);
}

export function ProposalItemsEditor({
  proposalId,
  items,
}: {
  proposalId: string;
  items: ProposalItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    quantity: "1",
    unit_price: "",
    recurring: false,
    category: "",
  });

  function resetForm() {
    setForm({
      title: "",
      quantity: "1",
      unit_price: "",
      recurring: false,
      category: "",
    });
  }

  function addItem() {
    setError(null);
    if (!form.title.trim()) {
      setError("Bitte einen Titel fuer die Position eingeben.");
      return;
    }
    const quantityNum = Number(form.quantity);
    startTransition(async () => {
      const result = await addProposalItemAction({
        proposal_id: proposalId,
        title: form.title.trim(),
        quantity: Number.isFinite(quantityNum) && quantityNum > 0 ? quantityNum : 1,
        unit_price: chfToRappen(form.unit_price),
        recurring: form.recurring,
        category: form.category || undefined,
      });
      if (result.ok) {
        resetForm();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function removeItem(id: string) {
    startTransition(async () => {
      const result = await deleteProposalItemAction(id, proposalId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      {items.length === 0 ? (
        <EmptyState
          title="Noch keine Leistungen"
          description="Fuege unten Positionen hinzu, um Umfang und Preis des Angebots zu definieren."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2.5">Position</th>
                <th className="px-3 py-2.5 text-right">Menge</th>
                <th className="px-3 py-2.5 text-right">Einzelpreis</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5">Abrechnung</th>
                <th className="px-3 py-2.5 sr-only">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="px-3 py-2.5 align-top">
                    <div className="font-medium text-neutral-900">
                      {item.title}
                    </div>
                    {item.description ? (
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {item.description}
                      </div>
                    ) : null}
                    {item.category ? (
                      <div className="mt-1 text-xs text-neutral-400">
                        {PRICING_CATEGORY_LABELS[
                          item.category as keyof typeof PRICING_CATEGORY_LABELS
                        ] ?? item.category}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-700">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-700">
                    {formatCHF(item.unit_price)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums text-neutral-900">
                    {formatCHF(item.total_price)}
                  </td>
                  <td className="px-3 py-2.5">
                    {item.recurring ? (
                      <Badge tone="brand">monatlich</Badge>
                    ) : (
                      <Badge tone="neutral">einmalig</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={pending}
                      aria-label="Position loeschen"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline-Add-Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
        className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4"
      >
        <p className="mb-3 text-sm font-medium text-neutral-700">
          Position hinzufuegen
        </p>
        <div className="grid gap-3 sm:grid-cols-12">
          <div className="space-y-1.5 sm:col-span-5">
            <label className="block text-xs font-medium text-neutral-600">
              Titel *
            </label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className={inputClass}
              placeholder="z. B. Meta Ads Betreuung"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-600">
              Menge
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-600">
              Einzelpreis (CHF)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.unit_price}
              onChange={(e) =>
                setForm((f) => ({ ...f, unit_price: e.target.value }))
              }
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <label className="block text-xs font-medium text-neutral-600">
              Kategorie
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">- keine -</option>
              {PRICING_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) =>
                setForm((f) => ({ ...f, recurring: e.target.checked }))
              }
              className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-100"
            />
            Wiederkehrend (monatlich)
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Hinzufuegen
          </Button>
        </div>

        {error ? (
          <div
            role="alert"
            className={cn(
              "mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700",
            )}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </form>
    </div>
  );
}
