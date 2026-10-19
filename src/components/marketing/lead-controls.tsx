"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSalesActivityAction, moveLeadAction, updateLeadAction } from "@/app/(app)/sales/actions";
import { LEAD_STATUSES } from "@/config/catalog";

/** Status, Zuständigkeit und Notiz direkt am Lead (gleiche Server-Aktionen wie im CRM). */
export function LeadControls({
  leadId,
  status,
  ownerId,
  users,
}: {
  leadId: string;
  status: string | null;
  ownerId: string | null;
  users: Array<{ id: string; full_name: string | null }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? okText : r.error ?? "Fehler");
      if (r.ok) router.refresh();
    });

  return (
    <div className="space-y-3">
      <label className="block text-xs text-neutral-500">
        Status
        <select
          disabled={pending}
          defaultValue={status ?? ""}
          onChange={(e) => run(() => moveLeadAction(leadId, e.target.value), "Status gespeichert")}
          className="mt-1 h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-900"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-neutral-500">
        Zuständig
        <select
          disabled={pending}
          defaultValue={ownerId ?? ""}
          onChange={(e) => run(() => updateLeadAction(leadId, { owner_id: e.target.value || null }), "Zuständigkeit gespeichert")}
          className="mt-1 h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-900"
        >
          <option value="">Niemand</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.id}
            </option>
          ))}
        </select>
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const body = note.trim();
          if (!body) return;
          run(async () => {
            const r = await createSalesActivityAction({ lead_id: leadId, type: "note", subject: "Notiz", body });
            if (r.ok) setNote("");
            return r;
          }, "Notiz gespeichert");
        }}
        className="space-y-1.5"
      >
        <label className="block text-xs text-neutral-500" htmlFor="mi-note">
          Notiz
        </label>
        <textarea
          id="mi-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={4000}
          className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm"
        />
        <button type="submit" disabled={pending || !note.trim()} className="h-8 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white disabled:opacity-40">
          Notiz speichern
        </button>
      </form>
      {msg ? <p className="text-xs text-neutral-500" role="status">{msg}</p> : null}
    </div>
  );
}
