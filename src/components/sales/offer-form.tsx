"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OFFER_TYPES, OFFER_STATUSES } from "@/config/catalog";
import { createOfferAction, updateOfferAction } from "@/app/(app)/sales/actions";
import type { OfferCreateInput } from "@/lib/validation/offers";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface OfferFormInitial {
  title?: string;
  offer_type?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  /** in Rappen */
  amount?: number | null;
  status?: string;
  valid_until?: string | null;
  owner_id?: string | null;
  pdf_url?: string | null;
}

export interface OfferFormOptions {
  clients: { id: string; name: string }[];
  users: { id: string; full_name: string | null }[];
  leads: { id: string; company_name: string }[];
}

export function OfferForm({
  mode,
  offerId,
  options,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  offerId?: string;
  options: OfferFormOptions;
  initial?: OfferFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    offer_type: initial?.offer_type ?? "",
    client_id: initial?.client_id ?? "",
    lead_id: initial?.lead_id ?? "",
    amount:
      initial?.amount != null ? String(Math.round(initial.amount / 100)) : "",
    status: initial?.status ?? "draft",
    valid_until: initial?.valid_until ?? "",
    owner_id: initial?.owner_id ?? "",
    pdf_url: initial?.pdf_url ?? "",
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
    if (!form.client_id && !form.lead_id) {
      setError("Angebot muss einem Kunden oder Lead zugeordnet sein.");
      return;
    }

    const input: OfferCreateInput = {
      title: form.title.trim(),
      offer_type: (form.offer_type || undefined) as OfferCreateInput["offer_type"],
      client_id: form.client_id || undefined,
      lead_id: form.lead_id || undefined,
      amount:
        form.amount === "" ? undefined : Math.round(Number(form.amount) * 100),
      status: form.status as OfferCreateInput["status"],
      valid_until: form.valid_until || undefined,
      owner_id: form.owner_id || undefined,
      pdf_url: form.pdf_url || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createOfferAction(input)
          : await updateOfferAction(offerId as string, input);
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
        <div className="space-y-1.5 sm:col-span-2">
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

        <Field label="Typ">
          <select
            value={form.offer_type}
            onChange={(e) => set("offer_type", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {OFFER_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            {OFFER_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Kunde">
          <select
            value={form.client_id}
            onChange={(e) => {
              const v = e.target.value;
              setForm((f) => ({ ...f, client_id: v, lead_id: v ? "" : f.lead_id }));
            }}
            className={inputClass}
          >
            <option value="">- kein Kunde -</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Lead">
          <select
            value={form.lead_id}
            onChange={(e) => {
              const v = e.target.value;
              setForm((f) => ({ ...f, lead_id: v, client_id: v ? "" : f.client_id }));
            }}
            className={inputClass}
          >
            <option value="">- kein Lead -</option>
            {options.leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.company_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Betrag (CHF)">
          <input
            type="number"
            min={0}
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Gueltig bis">
          <input
            type="date"
            value={form.valid_until}
            onChange={(e) => set("valid_until", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Verantwortlich">
          <select
            value={form.owner_id}
            onChange={(e) => set("owner_id", e.target.value)}
            className={inputClass}
          >
            <option value="">- niemand -</option>
            {options.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? "Unbenannt"}
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-sm font-medium text-neutral-700">
            PDF-Link
          </label>
          <input
            value={form.pdf_url}
            onChange={(e) => set("pdf_url", e.target.value)}
            placeholder="https://"
            className={inputClass}
          />
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        Hinweis: Ein Angebot muss entweder einem Kunden oder einem Lead
        zugeordnet sein - nicht beides.
      </p>

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
            "Angebot erstellen"
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
