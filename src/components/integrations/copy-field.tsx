"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Feld mit Kopieren-Button (fuer Webhook-URLs, Header etc.). */
export function CopyField({
  label,
  value,
  masked = false,
}: {
  label: string;
  value: string;
  masked?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Browser blockiert - Nutzer markiert manuell */
    }
  }

  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
          {value}
        </code>
        {masked ? null : (
          <button
            type="button"
            onClick={copy}
            aria-label={`${label} kopieren`}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-300 hover:text-brand-700"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
        )}
      </div>
    </div>
  );
}
