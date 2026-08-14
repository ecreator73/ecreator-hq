"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Repeat, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createDocumentItemAction,
  updateDocumentItemAction,
  deleteDocumentItemAction,
} from "@/app/(app)/sales/actions";
import { formatCHF, cn } from "@/lib/utils";
import type { DocumentItem } from "@/types/entities";

/**
 * Positionen einer Offerte / eines Vertrags bearbeiten.
 * Preise werden in CHF eingegeben und intern in Rappen gespeichert.
 */

const num = (v: string) => Number(String(v).replace(/'/g, "").replace(",", "."));
const toRappen = (chf: string) => Math.round((num(chf) || 0) * 100);
const toChf = (rappen: number) => (rappen / 100).toFixed(2);

const INPUT =
  "h-9 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

interface Draft {
  description: string;
  detail: string;
  quantity: string;
  unit_price: string;
  recurring: boolean;
}
const EMPTY: Draft = {
  description: "",
  detail: "",
  quantity: "1",
  unit_price: "",
  recurring: false,
};

export function ItemsEditor({
  items,
  offerId,
  contractId,
  currency = "CHF",
}: {
  items: DocumentItem[];
  offerId?: string;
  contractId?: string;
  currency?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);

  const once = items
    .filter((i) => !i.recurring)
    .reduce((s, i) => s + Math.round(Number(i.quantity) * i.unit_price), 0);
  const monthly = items
    .filter((i) => i.recurring)
    .reduce((s, i) => s + Math.round(Number(i.quantity) * i.unit_price), 0);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error ?? "Fehler");
        return;
      }
      done?.();
      router.refresh();
    });
  }

  function add() {
    if (!draft.description.trim()) {
      setError("Bitte eine Beschreibung eingeben.");
      return;
    }
    run(
      () =>
        createDocumentItemAction({
          offer_id: offerId,
          contract_id: contractId,
          description: draft.description,
          detail: draft.detail || undefined,
          quantity: num(draft.quantity) || 1,
          unit_price: toRappen(draft.unit_price),
          recurring: draft.recurring,
          sort_order: items.length,
        }),
      () => {
        setDraft(EMPTY);
        setAdding(false);
      },
    );
  }

  function saveEdit(id: string) {
    run(
      () =>
        updateDocumentItemAction(id, {
          description: editDraft.description,
          detail: editDraft.detail || undefined,
          quantity: num(editDraft.quantity) || 1,
          unit_price: toRappen(editDraft.unit_price),
          recurring: editDraft.recurring,
        }),
      () => setEditId(null),
    );
  }

  function startEdit(i: DocumentItem) {
    setEditId(i.id);
    setEditDraft({
      description: i.description,
      detail: i.detail ?? "",
      quantity: String(Number(i.quantity)),
      unit_price: toChf(i.unit_price),
      recurring: i.recurring,
    });
  }

  return (
    <Card className="print:hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Positionen</CardTitle>
        <span className="text-xs text-neutral-500">
          {items.length === 0
            ? "Ohne Positionen erscheint der erfasste Betrag als eine Zeile"
            : `${items.length} Position(en)`}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {items.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="w-10 px-3 py-2 font-medium">Pos.</th>
                  <th className="px-3 py-2 font-medium">Beschreibung</th>
                  <th className="w-20 px-3 py-2 text-right font-medium">Menge</th>
                  <th className="w-32 px-3 py-2 text-right font-medium">Einzelpreis</th>
                  <th className="w-32 px-3 py-2 text-right font-medium">Gesamt</th>
                  <th className="w-20 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((i, idx) =>
                  editId === i.id ? (
                    <tr key={i.id} className="bg-brand-50/40 align-top">
                      <td className="px-3 py-2 text-neutral-400">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          value={editDraft.description}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, description: e.target.value })
                          }
                          className={INPUT}
                          placeholder="Leistung"
                        />
                        <input
                          value={editDraft.detail}
                          onChange={(e) => setEditDraft({ ...editDraft, detail: e.target.value })}
                          className={cn(INPUT, "mt-1 text-xs")}
                          placeholder="Details (optional)"
                        />
                        <label className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-neutral-600">
                          <input
                            type="checkbox"
                            checked={editDraft.recurring}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, recurring: e.target.checked })
                            }
                            className="h-3.5 w-3.5 rounded border-neutral-300"
                          />
                          monatlich
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={editDraft.quantity}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, quantity: e.target.value })
                          }
                          className={cn(INPUT, "text-right")}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={editDraft.unit_price}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, unit_price: e.target.value })
                          }
                          className={cn(INPUT, "text-right")}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-400">-</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(i.id)}
                            disabled={pending}
                            aria-label="Speichern"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50"
                          >
                            {pending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            aria-label="Abbrechen"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={i.id} className="align-top hover:bg-neutral-50">
                      <td className="px-3 py-2.5 text-neutral-400">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => startEdit(i)}
                          className="text-left font-medium text-neutral-900 hover:text-brand-700"
                        >
                          {i.description}
                        </button>
                        {i.detail ? (
                          <p className="mt-0.5 text-xs text-neutral-500">{i.detail}</p>
                        ) : null}
                        {i.recurring ? (
                          <span className="mt-1 inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                            <Repeat className="h-3 w-3" /> monatlich
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">
                        {Number(i.quantity).toLocaleString("de-CH", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">
                        {formatCHF(i.unit_price, currency)}
                        {i.recurring ? "/Mt." : ""}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-neutral-900">
                        {formatCHF(Math.round(Number(i.quantity) * i.unit_price), currency)}
                        {i.recurring ? "/Mt." : ""}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Position loeschen?"))
                                run(() => deleteDocumentItemAction(i.id));
                            }}
                            disabled={pending}
                            aria-label="Position loeschen"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
              <tfoot className="border-t border-neutral-200 bg-neutral-50">
                {once > 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-sm text-neutral-600">
                      Einmalig (exkl. MwSt)
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatCHF(once, currency)}
                    </td>
                    <td />
                  </tr>
                ) : null}
                {monthly > 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-sm text-neutral-600">
                      Monatlich (exkl. MwSt)
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatCHF(monthly, currency)}
                    </td>
                    <td />
                  </tr>
                ) : null}
              </tfoot>
            </table>
          </div>
        ) : null}

        {/* Neue Position */}
        {adding ? (
          <div className="grid gap-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3 sm:grid-cols-[1fr_5rem_8rem_auto]">
            <div>
              <input
                autoFocus
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Leistung, z.B. eCreator Pro Package"
                className={INPUT}
              />
              <input
                value={draft.detail}
                onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
                placeholder="Details, z.B. Content Creation, Social Ads, CRM"
                className={cn(INPUT, "mt-2 text-xs")}
              />
              <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={draft.recurring}
                  onChange={(e) => setDraft({ ...draft, recurring: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-neutral-300"
                />
                monatlich wiederkehrend
              </label>
            </div>
            <input
              value={draft.quantity}
              onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
              placeholder="Menge"
              aria-label="Menge"
              className={cn(INPUT, "text-right")}
            />
            <input
              value={draft.unit_price}
              onChange={(e) => setDraft({ ...draft, unit_price: e.target.value })}
              placeholder="Preis CHF"
              aria-label="Einzelpreis in CHF"
              className={cn(INPUT, "text-right")}
            />
            <div className="flex items-start gap-1">
              <button
                type="button"
                onClick={add}
                disabled={pending}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Hinzufuegen
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setDraft(EMPTY);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
                aria-label="Abbrechen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-300 hover:text-brand-700"
          >
            <Plus className="h-4 w-4" /> Position hinzufuegen
          </button>
        )}

        <p className="text-xs text-neutral-400">
          Preise in CHF exkl. MwSt. Der Betrag am Beleg wird automatisch aus den
          Positionen berechnet.
        </p>
      </CardContent>
    </Card>
  );
}
