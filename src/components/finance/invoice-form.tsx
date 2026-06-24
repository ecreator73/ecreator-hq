"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INVOICE_STATUSES } from "@/config/catalog";
import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/app/(app)/finance/actions";
import type { InvoiceCreateInput } from "@/lib/validation/invoices";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface InvoiceFormInitial {
  client_id?: string | null;
  invoice_number?: string | null;
  title?: string | null;
  /** Nettobetrag in Rappen. */
  amount?: number | null;
  /** MWST-Betrag in Rappen. */
  vat?: number | null;
  due_date?: string | null;
  paid_date?: string | null;
  status?: string | null;
  pdf_url?: string | null;
  notes?: string | null;
}

/** CHF-Anzeigewert aus Rappen (leer bei null/undefined). */
function rappenToChf(rappen: number | null | undefined): string {
  if (rappen == null) return "";
  return String(rappen / 100);
}

/** CHF-Eingabe -> Rappen (undefined bei leerem Feld). */
function chfToRappen(chf: string): number | undefined {
  const trimmed = chf.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  if (Number.isNaN(value)) return undefined;
  return Math.round(value * 100);
}

export function InvoiceForm({
  mode,
  id,
  options,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  options: { clients: { id: string; name: string }[] };
  initial?: InvoiceFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    client_id: initial?.client_id ?? "",
    invoice_number: initial?.invoice_number ?? "",
    title: initial?.title ?? "",
    amount: rappenToChf(initial?.amount),
    vat: rappenToChf(initial?.vat),
    due_date: initial?.due_date ?? "",
    paid_date: initial?.paid_date ?? "",
    status: initial?.status ?? "draft",
    pdf_url: initial?.pdf_url ?? "",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    const input: InvoiceCreateInput = {
      client_id: form.client_id || undefined,
      invoice_number: form.invoice_number.trim() || undefined,
      title: form.title.trim() || undefined,
      amount: chfToRappen(form.amount),
      vat: chfToRappen(form.vat),
      due_date: form.due_date || undefined,
      paid_date: form.paid_date || undefined,
      status: (form.status || undefined) as InvoiceCreateInput["status"],
      pdf_url: form.pdf_url.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createInvoiceAction(input)
          : await updateInvoiceAction(id as string, input);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kunde" className="sm:col-span-2">
          <select
            value={form.client_id}
            onChange={(e) => set("client_id", e.target.value)}
            className={inputClass}
          >
            <option value="">— kein Kunde —</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rechnungsnummer">
          <input
            value={form.invoice_number}
            onChange={(e) => set("invoice_number", e.target.value)}
            placeholder="z. B. 2026-001"
            className={inputClass}
          />
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            {INVOICE_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Titel" className="sm:col-span-2">
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Betrag netto (CHF)">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </Field>
        <Field label="MWST (CHF)">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.vat}
            onChange={(e) => set("vat", e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </Field>
        <Field label="Fällig am">
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => set("due_date", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Bezahlt am">
          <input
            type="date"
            value={form.paid_date}
            onChange={(e) => set("paid_date", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="PDF-Link" className="sm:col-span-2">
          <input
            value={form.pdf_url}
            onChange={(e) => set("pdf_url", e.target.value)}
            placeholder="https://"
            className={inputClass}
          />
        </Field>
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
            "Rechnung erstellen"
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
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className ? `space-y-1.5 ${className}` : "space-y-1.5"}>
      <label className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  );
}
