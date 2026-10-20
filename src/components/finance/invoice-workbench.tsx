"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import type { BillingInvoiceDetail } from "@/server/services/billing.service";
import {
  cancelInvoiceAction,
  deletePaymentAction,
  markSentAction,
  recordPaymentAction,
  releaseInvoicesAction,
  remindAction,
  saveDraftAction,
} from "@/app/(app)/finance/billing-actions";
import { StatusBadge } from "@/components/tasks/status-badge";
import { INVOICE_STATUSES, statusLabel } from "@/config/catalog";
import { formatCHFExact, cn } from "@/lib/utils";

type Res = { ok: boolean; message?: string; error?: string };
const chDate = (d: string | null | undefined) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : "–");
const today = () => new Date().toISOString().slice(0, 10);
const input = "h-9 rounded-lg border border-neutral-200 bg-white px-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium disabled:opacity-50";
const toRappen = (s: string) => Math.round(Number(s.replace(/['\s]/g, "").replace(",", ".")) * 100);

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<Res>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? r.message ?? null : r.error ?? "Fehler");
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  return { pending, msg, run };
}

/** Aktionen neben «Drucken». */
export function InvoiceToolbar({ invoice, status }: { invoice: BillingInvoiceDetail; status: string }) {
  const { pending, msg, run } = useRun();
  const router = useRouter();
  return (
    <>
      {msg ? <span className="text-xs text-neutral-600" role="status">{msg}</span> : null}
      {invoice.status === "draft" ? (
        <>
          <button type="button" disabled={pending} onClick={() => run(() => releaseInvoicesAction([invoice.id]))} className={cn(btn, "bg-emerald-600 text-white hover:bg-emerald-700")}>
            Freigeben
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Entwurf verwerfen?")) run(() => cancelInvoiceAction(invoice.id), () => router.push("/finance/invoices"));
            }}
            className={cn(btn, "text-rose-700 hover:bg-rose-50")}
          >
            Verwerfen
          </button>
        </>
      ) : null}
      {invoice.status === "open" && !invoice.sent_at ? (
        <button type="button" disabled={pending} onClick={() => run(() => markSentAction(invoice.id))} className={cn(btn, "border border-neutral-200 text-neutral-700 hover:bg-neutral-50")}>
          Als versendet markieren
        </button>
      ) : null}
      {status === "overdue" ? (
        <button type="button" disabled={pending} onClick={() => run(() => remindAction(invoice.id))} className={cn(btn, "border border-amber-300 text-amber-800 hover:bg-amber-50")}>
          Mahnung {Math.min(3, invoice.reminder_stage + 1)} vermerken
        </button>
      ) : null}
      {invoice.status === "open" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Rechnung ${invoice.invoice_number} stornieren?`)) run(() => cancelInvoiceAction(invoice.id));
          }}
          className={cn(btn, "text-rose-700 hover:bg-rose-50")}
        >
          Stornieren
        </button>
      ) : null}
    </>
  );
}

/** Status, Zahlungen und Entwurfsbearbeitung (nicht gedruckt). */
export function InvoiceWorkbench({ invoice, status }: { invoice: BillingInvoiceDetail; status: string }) {
  const { pending, msg, run } = useRun();
  const open = invoice.total - invoice.paid;
  const color = INVOICE_STATUSES.find((s) => s.key === status)?.color;
  const [pay, setPay] = useState({ amount: open > 0 ? (open / 100).toFixed(2) : "", date: today(), note: "" });

  return (
    <div className="mx-auto w-full max-w-[210mm] space-y-4 print:hidden">
      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm">
        <StatusBadge label={statusLabel("invoice", status)} color={color} />
        <span className="text-neutral-600">
          Total <strong className="tabular-nums text-neutral-900">{formatCHFExact(invoice.total)}</strong>
        </span>
        {invoice.status !== "draft" ? (
          <span className="text-neutral-600">
            Bezahlt <strong className="tabular-nums text-neutral-900">{formatCHFExact(invoice.paid)}</strong>
            {open > 0 && invoice.status !== "cancelled" ? (
              <>
                {" "}· offen <strong className={cn("tabular-nums", status === "overdue" ? "text-rose-700" : "text-neutral-900")}>{formatCHFExact(open)}</strong>
              </>
            ) : null}
          </span>
        ) : null}
        {invoice.sent_at ? <span className="text-xs text-neutral-500">versendet {chDate(invoice.sent_at.slice(0, 10))}</span> : null}
        {invoice.reminder_stage ? <span className="text-xs font-medium text-amber-700">Mahnstufe {invoice.reminder_stage}{invoice.last_reminder_at ? ` (${chDate(invoice.last_reminder_at.slice(0, 10))})` : ""}</span> : null}
        {msg ? <span className="text-xs text-neutral-600" role="status">{msg}</span> : null}
      </section>

      {invoice.status === "draft" ? <DraftEditor invoice={invoice} /> : null}

      {invoice.status !== "draft" && invoice.status !== "cancelled" ? (
        <section className="rounded-xl border border-neutral-200 bg-white">
          <header className="border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">Zahlungen</h2>
          </header>
          {invoice.payments.length ? (
            <ul className="divide-y divide-neutral-100">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-24 tabular-nums text-neutral-600">{chDate(p.paid_on)}</span>
                  <span className="w-28 text-right font-medium tabular-nums">{formatCHFExact(p.amount)}</span>
                  <span className="flex-1 truncate text-xs text-neutral-500">{p.source === "camt" ? "Kontoauszug" : "manuell"}{p.note ? ` · ${p.note}` : ""}</span>
                  <button type="button" aria-label="Zahlung entfernen" disabled={pending} onClick={() => window.confirm("Zahlung entfernen?") && run(() => deletePaymentAction(invoice.id, p.id))} className="h-7 w-7 rounded text-neutral-400 hover:bg-neutral-50 hover:text-rose-700">
                    <Trash2 className="mx-auto h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-neutral-500">Noch keine Zahlung eingegangen.</p>
          )}
          {open > 0 ? (
            <form
              className="flex flex-wrap items-end gap-2 border-t border-neutral-100 px-4 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                const r = toRappen(pay.amount);
                if (!r || r <= 0) return;
                run(() => recordPaymentAction(invoice.id, r, pay.date, pay.note || null), () => setPay({ amount: "", date: today(), note: "" }));
              }}
            >
              <label className="text-xs text-neutral-600">
                Betrag CHF
                <input inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className={cn(input, "block w-32")} />
              </label>
              <label className="text-xs text-neutral-600">
                Eingang am
                <input type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} className={cn(input, "block")} />
              </label>
              <label className="min-w-[10rem] flex-1 text-xs text-neutral-600">
                Notiz (optional)
                <input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} className={cn(input, "block w-full")} />
              </label>
              <button type="submit" disabled={pending} className={cn(btn, "bg-neutral-900 text-white")}>
                Zahlung erfassen
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function DraftEditor({ invoice }: { invoice: BillingInvoiceDetail }) {
  const { pending, msg, run } = useRun();
  const [meta, setMeta] = useState({ issue_date: invoice.issue_date ?? today(), due_date: invoice.due_date ?? today(), period_from: invoice.period_from ?? "", period_to: invoice.period_to ?? "", notes: invoice.notes ?? "" });
  const [items, setItems] = useState(invoice.items.map((i) => ({ title: i.title, description: i.description ?? "", quantity: String(i.quantity), price: (i.unit_price / 100).toFixed(2) })));
  const net = items.reduce((s, i) => s + Math.round((Number(i.quantity) || 0) * toRappen(i.price || "0")), 0);
  const set = (i: number, k: keyof (typeof items)[number], v: string) => setItems((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  return (
    <form
      className="space-y-3 rounded-xl border border-amber-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          saveDraftAction(invoice.id, {
            ...meta,
            period_from: meta.period_from || null,
            period_to: meta.period_to || null,
            notes: meta.notes || null,
            items: items.map((i) => ({ title: i.title, description: i.description.trim() || null, quantity: Number(i.quantity) || 1, unit_price: toRappen(i.price || "0") })),
          }),
        );
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Entwurf bearbeiten</h2>
        {msg ? <span className="text-xs text-neutral-600" role="status">{msg}</span> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {(
          [
            ["issue_date", "Rechnungsdatum"],
            ["due_date", "Zahlbar bis"],
            ["period_from", "Periode von"],
            ["period_to", "Periode bis"],
          ] as const
        ).map(([k, l]) => (
          <label key={k} className="text-xs text-neutral-600">
            {l}
            <input type="date" value={meta[k]} onChange={(e) => setMeta({ ...meta, [k]: e.target.value })} className={cn(input, "block w-full")} />
          </label>
        ))}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-xs text-neutral-600">Positionen (Preise exkl. MWST)</legend>
        {items.map((it, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_8rem_2rem]">
            <div className="space-y-1">
              <input aria-label={`Position ${i + 1} Titel`} value={it.title} onChange={(e) => set(i, "title", e.target.value)} className={cn(input, "w-full")} required />
              <input aria-label={`Position ${i + 1} Beschreibung`} placeholder="Beschreibung (optional)" value={it.description} onChange={(e) => set(i, "description", e.target.value)} className={cn(input, "h-8 w-full text-xs")} />
            </div>
            <input aria-label={`Position ${i + 1} Menge`} inputMode="decimal" value={it.quantity} onChange={(e) => set(i, "quantity", e.target.value)} className={cn(input, "text-right")} />
            <input aria-label={`Position ${i + 1} Einzelpreis CHF`} inputMode="decimal" value={it.price} onChange={(e) => set(i, "price", e.target.value)} className={cn(input, "text-right")} />
            <button type="button" aria-label={`Position ${i + 1} entfernen`} disabled={items.length === 1} onClick={() => setItems((l) => l.filter((_, j) => j !== i))} className="h-9 w-8 rounded text-neutral-400 hover:bg-neutral-50 disabled:opacity-30">
              <X className="mx-auto h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setItems((l) => [...l, { title: "", description: "", quantity: "1", price: "" }])} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Position
        </button>
      </fieldset>
      <label className="block text-xs text-neutral-600">
        Bemerkung auf der Rechnung (optional)
        <textarea rows={2} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} className={cn(input, "block h-auto w-full py-2")} />
      </label>
      <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
        <span className="text-neutral-600">
          Netto <strong className="tabular-nums">{formatCHFExact(net)}</strong> · inkl. MWST <strong className="tabular-nums">{formatCHFExact(net + Math.round((net * invoice.vat_rate) / 100 / 5) * 5)}</strong>
        </span>
        <button type="submit" disabled={pending} className={cn(btn, "bg-brand-600 text-white")}>
          Entwurf speichern
        </button>
      </div>
    </form>
  );
}
