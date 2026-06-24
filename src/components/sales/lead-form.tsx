"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  COMPANY_SIZES,
} from "@/config/catalog";
import {
  createLeadAction,
  updateLeadAction,
} from "@/app/(app)/sales/actions";
import type { LeadCreateInput } from "@/lib/validation/leads";
import type { ProfileMini } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface LeadFormInitial {
  company_name?: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  company_size?: string | null;
  city?: string | null;
  country?: string | null;
  source?: string | null;
  /** in Rappen */
  estimated_value?: number | null;
  status?: string;
  owner_id?: string | null;
  next_action_date?: string | null;
  notes?: string | null;
}

export function LeadForm({
  mode,
  leadId,
  users,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  leadId?: string;
  users: ProfileMini[];
  initial?: LeadFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    company_name: initial?.company_name ?? "",
    contact_name: initial?.contact_name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    website: initial?.website ?? "",
    industry: initial?.industry ?? "",
    company_size: initial?.company_size ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? "",
    source: initial?.source ?? "",
    estimated_value:
      initial?.estimated_value != null
        ? String(Math.round(initial.estimated_value / 100))
        : "",
    status: initial?.status ?? "new",
    owner_id: initial?.owner_id ?? "",
    next_action_date: initial?.next_action_date ?? "",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.company_name.trim()) {
      setError("Bitte einen Firmennamen eingeben.");
      return;
    }
    const input: LeadCreateInput = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      website: form.website || undefined,
      industry: form.industry || undefined,
      company_size: (form.company_size || undefined) as LeadCreateInput["company_size"],
      city: form.city || undefined,
      country: form.country || undefined,
      source: (form.source || undefined) as LeadCreateInput["source"],
      estimated_value:
        form.estimated_value === ""
          ? undefined
          : Math.round(Number(form.estimated_value) * 100),
      status: form.status as LeadCreateInput["status"],
      owner_id: form.owner_id || undefined,
      next_action_date: form.next_action_date || undefined,
      notes: form.notes || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createLeadAction(input)
          : await updateLeadAction(leadId as string, input);
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
            Firma *
          </label>
          <input
            autoFocus
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            className={inputClass}
          />
        </div>
        <Field label="Ansprechpartner">
          <input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className={inputClass} />
        </Field>
        <Field label="E-Mail">
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Telefon">
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Website">
          <input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" className={inputClass} />
        </Field>
        <Field label="Branche">
          <input value={form.industry} onChange={(e) => set("industry", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Unternehmensgroesse">
          <select value={form.company_size} onChange={(e) => set("company_size", e.target.value)} className={inputClass}>
            <option value="">- keine Angabe -</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Stadt">
          <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Land">
          <input value={form.country} onChange={(e) => set("country", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Quelle">
          <select value={form.source} onChange={(e) => set("source", e.target.value)} className={inputClass}>
            <option value="">- keine Angabe -</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Geschaetzter Wert (CHF)">
          <input type="number" min={0} value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
            {LEAD_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Verantwortlich">
          <select value={form.owner_id} onChange={(e) => set("owner_id", e.target.value)} className={inputClass}>
            <option value="">- niemand -</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name ?? "Unbenannt"}</option>
            ))}
          </select>
        </Field>
        <Field label="Naechstes Follow-up">
          <input type="date" value={form.next_action_date} onChange={(e) => set("next_action_date", e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">Notizen</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={inputClass} />
      </div>

      <p className="text-xs text-neutral-400">
        Hinweis: Ausser bei Status &bdquo;Gewonnen&ldquo;/&bdquo;Verloren&ldquo;
        ist ein Follow-up-Datum Pflicht - kein Lead ohne naechste Aktion.
      </p>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
            "Lead erstellen"
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}
