"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_STATUSES,
} from "@/config/catalog";
import {
  createIntegrationAction,
  updateIntegrationAction,
} from "@/app/(app)/settings/ai/actions";
import type {
  IntegrationCreateInput,
  IntegrationUpdateInput,
} from "@/lib/validation/ai";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** initial enthaelt NIE Credentials - diese werden serverseitig verschluesselt. */
export interface IntegrationFormInitial {
  name?: string;
  provider?: string | null;
  status?: string | null;
}

export function IntegrationForm({
  mode,
  id,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: IntegrationFormInitial;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    provider: initial?.provider ?? "",
    status: initial?.status ?? "configured",
    credentials: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Namen fuer die Integration eingeben.");
      return;
    }
    const input: IntegrationCreateInput = {
      name: form.name.trim(),
      provider: (form.provider || undefined) as IntegrationCreateInput["provider"],
      status: form.status || undefined,
      credentials: form.credentials.trim() || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createIntegrationAction(input)
          : await updateIntegrationAction(
              id as string,
              input as IntegrationUpdateInput,
            );
      if (result.ok) {
        onDone?.({ id: result.ok ? result.data?.id : undefined });
      } else {
        setError(result.error);
      }
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
          placeholder="z.B. OpenAI Produktiv-Key"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Anbieter">
          <select
            value={form.provider}
            onChange={(e) => set("provider", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {INTEGRATION_PROVIDERS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
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
            {INTEGRATION_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          {mode === "edit" ? "API-Key / Token ersetzen" : "API-Key / Token"}
        </label>
        <input
          type="password"
          value={form.credentials}
          onChange={(e) => set("credentials", e.target.value)}
          autoComplete="new-password"
          placeholder={mode === "edit" ? "Leer lassen = unveraendert" : "••••••••"}
          className={inputClass}
        />
        <p className="flex items-start gap-1.5 text-xs text-neutral-500">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Wird verschluesselt gespeichert und nie angezeigt.
            {mode === "edit"
              ? " Leer lassen, um den bestehenden Schluessel zu behalten."
              : ""}
          </span>
        </p>
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
            "Integration speichern"
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
