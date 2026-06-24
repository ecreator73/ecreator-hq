"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TESTIMONIAL_TYPES, TESTIMONIAL_STATUSES } from "@/config/catalog";
import {
  createTestimonialAction,
  updateTestimonialAction,
} from "@/app/(app)/clients/growth/actions";
import type {
  TestimonialCreateInput,
  TestimonialUpdateInput,
} from "@/lib/validation/growth";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export interface TestimonialFormInitial {
  client_id?: string | null;
  type?: string | null;
  status?: string | null;
  content?: string | null;
}

/**
 * Formular zum Erfassen/Bearbeiten eines Testimonials (Text/Video/Fallstudie).
 * create -> createTestimonialAction, edit -> updateTestimonialAction.
 * Leere Felder werden als undefined uebergeben.
 */
export function TestimonialForm({
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
  initial?: TestimonialFormInitial;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    client_id: initial?.client_id ?? "",
    type: initial?.type ?? "",
    status: initial?.status ?? "requested",
    content: initial?.content ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.client_id) {
      setError("Bitte einen Kunden auswaehlen.");
      return;
    }
    const base = {
      type: (form.type || undefined) as TestimonialCreateInput["type"],
      status: (form.status || undefined) as TestimonialCreateInput["status"],
      content: form.content.trim() || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTestimonialAction({
              client_id: form.client_id,
              ...base,
            } satisfies TestimonialCreateInput)
          : await updateTestimonialAction(id as string, {
              client_id: form.client_id,
              ...base,
            } satisfies TestimonialUpdateInput);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-sm font-medium text-neutral-700">
            Kunde *
          </label>
          <select
            value={form.client_id}
            onChange={(e) => set("client_id", e.target.value)}
            className={inputClass}
          >
            <option value="">- Kunde waehlen -</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Field label="Typ">
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className={inputClass}
          >
            <option value="">- keine Angabe -</option>
            {TESTIMONIAL_TYPES.map((t) => (
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
            {TESTIMONIAL_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Inhalt
        </label>
        <textarea
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          rows={4}
          placeholder="Zitat, Notizen oder Link zur Fallstudie ..."
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
            "Testimonial erstellen"
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
