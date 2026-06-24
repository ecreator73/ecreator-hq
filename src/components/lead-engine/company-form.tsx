"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TARGET_INDUSTRIES,
  TARGET_REGIONS,
  WATCHLIST_STATUSES,
  WEBSITE_SCAN_CHECKS,
} from "@/config/catalog";
import {
  createLeadCompanyAction,
  updateLeadCompanyAction,
} from "@/app/(app)/sales/lead-engine/actions";
import type { LeadCompanyCreateInput } from "@/lib/validation/lead-engine";
import type { WebsiteScan } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** Boolean-Scan-Schluessel (load_time_ms separat als Zahl). */
type ScanBoolKey = (typeof WEBSITE_SCAN_CHECKS)[number]["key"];

export interface CompanyFormInitial {
  name?: string;
  industry?: string | null;
  website?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  canton?: string | null;
  country?: string | null;
  source_id?: string | null;
  website_scan?: WebsiteScan | null;
  watchlist_status?: string | null;
  notes?: string | null;
}

export function CompanyForm({
  mode,
  id,
  options,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  options: { sources: { id: string; name: string }[] };
  initial?: CompanyFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    industry: initial?.industry ?? "",
    website: initial?.website ?? "",
    contact_name: initial?.contact_name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    city: initial?.city ?? "",
    canton: initial?.canton ?? "",
    country: initial?.country ?? "",
    source_id: initial?.source_id ?? "",
    watchlist_status: initial?.watchlist_status ?? "watch",
    notes: initial?.notes ?? "",
  });

  const [scan, setScan] = useState<Record<ScanBoolKey, boolean>>(() => {
    const base = {} as Record<ScanBoolKey, boolean>;
    for (const check of WEBSITE_SCAN_CHECKS) {
      base[check.key] = Boolean(initial?.website_scan?.[check.key]);
    }
    return base;
  });
  const [loadTimeMs, setLoadTimeMs] = useState<string>(
    initial?.website_scan?.load_time_ms != null
      ? String(initial.website_scan.load_time_ms)
      : "",
  );

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildWebsiteScan(): WebsiteScan {
    const result: WebsiteScan = {};
    for (const check of WEBSITE_SCAN_CHECKS) {
      result[check.key] = scan[check.key];
    }
    const ms = loadTimeMs.trim() ? Number(loadTimeMs) : undefined;
    if (ms != null && Number.isFinite(ms)) {
      result.load_time_ms = Math.max(0, Math.round(ms));
    }
    return result;
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Firmennamen eingeben.");
      return;
    }
    const input: LeadCompanyCreateInput = {
      name: form.name.trim(),
      industry: form.industry || undefined,
      website: form.website || undefined,
      contact_name: form.contact_name || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      city: form.city || undefined,
      canton: form.canton || undefined,
      country: form.country || undefined,
      source_id: form.source_id || undefined,
      website_scan: buildWebsiteScan(),
      watchlist_status:
        (form.watchlist_status ||
          undefined) as LeadCompanyCreateInput["watchlist_status"],
      notes: form.notes || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createLeadCompanyAction(input)
          : await updateLeadCompanyAction(id as string, input);
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
      className="space-y-5"
    >
      {/* Stammdaten */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-sm font-medium text-neutral-700">
            Firmenname *
          </label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
          />
        </div>
        <Field label="Branche">
          <input
            value={form.industry}
            onChange={(e) => set("industry", e.target.value)}
            list="lead-industries"
            placeholder="z. B. Treuhaender"
            className={inputClass}
          />
          <datalist id="lead-industries">
            {TARGET_INDUSTRIES.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </Field>
        <Field label="Website">
          <input
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://"
            className={inputClass}
          />
        </Field>
        <Field label="Ansprechpartner">
          <input
            value={form.contact_name}
            onChange={(e) => set("contact_name", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="E-Mail">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Telefon">
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Stadt">
          <input
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Kanton / Region">
          <input
            value={form.canton}
            onChange={(e) => set("canton", e.target.value)}
            list="lead-regions"
            className={inputClass}
          />
          <datalist id="lead-regions">
            {TARGET_REGIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field label="Land">
          <input
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            placeholder="Schweiz"
            className={inputClass}
          />
        </Field>
        <Field label="Quelle">
          <select
            value={form.source_id}
            onChange={(e) => set("source_id", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Quelle -</option>
            {options.sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Watchlist-Status">
          <select
            value={form.watchlist_status}
            onChange={(e) => set("watchlist_status", e.target.value)}
            className={inputClass}
          >
            {WATCHLIST_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Website-Scan */}
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
        <h3 className="text-sm font-semibold text-neutral-800">
          Website-Analyse
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEBSITE_SCAN_CHECKS.map((check) => (
            <label
              key={check.key}
              className="flex items-center gap-2 text-sm text-neutral-700"
            >
              <input
                type="checkbox"
                checked={scan[check.key]}
                onChange={(e) =>
                  setScan((s) => ({ ...s, [check.key]: e.target.checked }))
                }
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
              />
              {check.label}
            </label>
          ))}
        </div>
        <div className="max-w-xs space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Ladezeit (ms)
          </label>
          <input
            type="number"
            min={0}
            value={loadTimeMs}
            onChange={(e) => setLoadTimeMs(e.target.value)}
            placeholder="z. B. 2400"
            className={inputClass}
          />
        </div>
      </div>

      {/* Notizen */}
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
            "Firma erstellen"
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
