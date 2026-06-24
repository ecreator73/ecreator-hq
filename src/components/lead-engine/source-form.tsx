"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEAD_DISCOVERY_SOURCE_TYPES } from "@/config/catalog";
import { createLeadSourceAction } from "@/app/(app)/sales/lead-engine/actions";
import type { LeadSourceCreateInput } from "@/lib/validation/lead-engine";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const SOURCE_STATUSES = [
  { key: "active", label: "Aktiv" },
  { key: "paused", label: "Pausiert" },
] as const;

export function SourceForm({
  onDone,
  onCancel,
}: {
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    source_type: "manual",
    status: "active",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Namen fuer die Quelle eingeben.");
      return;
    }
    const input: LeadSourceCreateInput = {
      name: form.name.trim(),
      source_type: (form.source_type ||
        undefined) as LeadSourceCreateInput["source_type"],
      status: form.status || undefined,
    };

    startTransition(async () => {
      const result = await createLeadSourceAction(input);
      if (result.ok) onDone?.();
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
          onChange={(e) => set("name", e.target.value)}
          placeholder="z.B. OSM Kanton Zuerich"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Typ
          </label>
          <select
            value={form.source_type}
            onChange={(e) => set("source_type", e.target.value)}
            className={inputClass}
          >
            {LEAD_DISCOVERY_SOURCE_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            {SOURCE_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
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
          ) : (
            "Quelle erstellen"
          )}
        </Button>
      </div>
    </form>
  );
}
