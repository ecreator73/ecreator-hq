"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addUnsubscribeAction } from "@/app/(app)/sales/outreach/actions";
import type { UnsubscribeCreateInput } from "@/lib/validation/outreach";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/**
 * Formular zum Eintragen einer Opt-out-Adresse. Eingetragene Adressen werden
 * nie wieder kontaktiert (vom Service erzwungen). Bestaetigt durch einen
 * deutlichen Hinweis vor dem Absenden.
 */
export function UnsubscribeForm() {
  const [form, setForm] = useState({ email: "", reason: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.email.trim()) {
      setError("Bitte eine E-Mail-Adresse eingeben.");
      return;
    }
    const input: UnsubscribeCreateInput = {
      email: form.email.trim(),
      reason: form.reason.trim() || undefined,
    };

    startTransition(async () => {
      const result = await addUnsubscribeAction(input);
      if (result.ok) {
        setForm({ email: "", reason: "" });
        router.refresh();
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
          E-Mail *
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="kontakt@firma.ch"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Grund
        </label>
        <textarea
          value={form.reason}
          onChange={(e) => set("reason", e.target.value)}
          rows={2}
          placeholder="optional"
          className={inputClass}
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Diese Adresse wird nie wieder kontaktiert.</span>
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

      <div className="flex items-center justify-end pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Eintragen ...
            </>
          ) : (
            "Adresse eintragen"
          )}
        </Button>
      </div>
    </form>
  );
}
