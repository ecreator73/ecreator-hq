"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const selectClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Status-Dropdown fuer ein Produktions-Objekt. Bei Auswahl wird die uebergebene
 * Action (id, status) in einer Transition aufgerufen und danach refreshed.
 */
export function StatusSelect({
  id,
  value,
  statuses,
  action,
}: {
  id: string;
  value: string;
  statuses: readonly { key: string; label: string; color?: string }[];
  action: (id: string, status: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onChange(next: string) {
    if (next === value) return;
    startTransition(async () => {
      await action(id, next);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        aria-label="Status aendern"
      >
        {statuses.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-neutral-400" aria-hidden="true" />
      ) : null}
    </span>
  );
}
