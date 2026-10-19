"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUSES } from "@/config/catalog";
import { assignLeadAction, setLeadStatusAction } from "@/app/(app)/leads/actions";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  blue: "bg-brand-50 text-brand-800 border-brand-100",
  green: "bg-emerald-50 text-emerald-800 border-emerald-100",
  amber: "bg-amber-50 text-amber-800 border-amber-100",
  red: "bg-rose-50 text-rose-800 border-rose-100",
  gray: "bg-neutral-50 text-neutral-700 border-neutral-200",
};

/** Status direkt in der Tabelle aendern (Follow-up plant automatisch in 3 Werktagen). */
export function StatusSelect({ leadId, value, color }: { leadId: string; value: string | null; color?: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState(value ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <select
        aria-label="Status"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const key = e.target.value;
          const prev = current;
          setCurrent(key);
          start(async () => {
            const r = await setLeadStatusAction(leadId, key);
            if (!r.ok) {
              setCurrent(prev);
              setMsg(r.error);
            } else {
              setMsg(null);
              router.refresh();
            }
          });
        }}
        className={cn(
          "h-7 max-w-[11rem] rounded-full border px-2 text-xs font-medium disabled:opacity-60",
          TONE[LEAD_STATUSES.find((s) => s.key === current)?.color ?? color ?? "gray"] ?? TONE.gray,
        )}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      {msg ? <span className="mt-0.5 text-[10px] text-rose-600">{msg}</span> : null}
    </span>
  );
}

/** Zustaendigkeit direkt in der Tabelle aendern. */
export function OwnerSelect({ leadId, value, members, fallbackName }: { leadId: string; value: string | null; members: Array<{ id: string; full_name: string | null }>; fallbackName?: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState(value ?? "");
  return (
    <select
      aria-label="Zuständig"
      value={current}
      disabled={pending}
      onChange={(e) => {
        const id = e.target.value;
        const prev = current;
        setCurrent(id);
        start(async () => {
          const r = await assignLeadAction(leadId, id || null);
          if (!r.ok) setCurrent(prev);
          else router.refresh();
        });
      }}
      className="h-7 max-w-[10rem] rounded-md border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700 disabled:opacity-60"
    >
      <option value="">{!value && fallbackName ? `${fallbackName} (ohne Konto)` : "Niemand"}</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.full_name ?? m.id}
        </option>
      ))}
    </select>
  );
}
