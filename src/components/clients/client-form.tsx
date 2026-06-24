"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CLIENT_PACKAGES,
  CLIENT_STATUSES,
  COMPANY_TYPES,
} from "@/config/catalog";
import {
  createClientAction,
  updateClientAction,
} from "@/app/(app)/clients/actions";
import type { ClientCreateInput } from "@/lib/validation/clients";
import type { ProfileMini } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface ClientFormInitial {
  name?: string;
  package?: string | null;
  status?: string | null;
  account_manager_id?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  company_type?: string | null;
  start_date?: string | null;
  notes?: string | null;
}

export function ClientForm({
  mode,
  clientId,
  users,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  clientId?: string;
  users: ProfileMini[];
  initial?: ClientFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    package: initial?.package ?? "",
    status: initial?.status ?? "onboarding",
    account_manager_id: initial?.account_manager_id ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    website: initial?.website ?? "",
    industry: initial?.industry ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? "",
    company_type: initial?.company_type ?? "",
    start_date: initial?.start_date ?? "",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Kundennamen eingeben.");
      return;
    }
    const input: ClientCreateInput = {
      name: form.name.trim(),
      package: form.package || undefined,
      status: (form.status || undefined) as ClientCreateInput["status"],
      account_manager_id: form.account_manager_id || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      website: form.website || undefined,
      industry: form.industry || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      company_type: (form.company_type || undefined) as ClientCreateInput["company_type"],
      start_date: form.start_date || undefined,
      notes: form.notes || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createClientAction(input)
          : await updateClientAction(clientId as string, input);
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
            Name *
          </label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
          />
        </div>
        <Field label="Paket">
          <select value={form.package} onChange={(e) => set("package", e.target.value)} className={inputClass}>
            <option value="">- keine Angabe -</option>
            {CLIENT_PACKAGES.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
            {CLIENT_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Account Manager">
          <select value={form.account_manager_id} onChange={(e) => set("account_manager_id", e.target.value)} className={inputClass}>
            <option value="">- niemand -</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name ?? "Unbenannt"}</option>
            ))}
          </select>
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
        <Field label="Stadt">
          <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Land">
          <input value={form.country} onChange={(e) => set("country", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Unternehmensform">
          <select value={form.company_type} onChange={(e) => set("company_type", e.target.value)} className={inputClass}>
            <option value="">- keine Angabe -</option>
            {COMPANY_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Startdatum">
          <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">Notizen</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={inputClass} />
      </div>

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
            "Kunde erstellen"
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
