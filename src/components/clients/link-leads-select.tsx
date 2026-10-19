"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkExternalLeadsAction } from "@/app/(app)/clients/crm-actions";

/** Leads eines alten Kundennamens einem bestehenden Kunden zuweisen. */
export function LinkLeadsSelect({ externalName, clients }: { externalName: string; clients: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <select
        aria-label={`Leads von ${externalName} einem Kunden zuweisen`}
        defaultValue=""
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return;
          const target = clients.find((c) => c.id === id)?.name ?? "Kunde";
          if (!window.confirm(`Alle Leads von «${externalName}» dem Kunden «${target}» zuweisen?`)) {
            e.target.value = "";
            return;
          }
          start(async () => {
            const r = await linkExternalLeadsAction(externalName, id);
            setMsg(r.ok ? r.message ?? "Zugewiesen" : r.error);
            if (r.ok) router.refresh();
          });
        }}
        className="h-7 max-w-[200px] rounded-md border border-neutral-200 bg-white px-1.5 text-xs"
      >
        <option value="">Kunde zuweisen…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {pending ? <span className="text-xs text-neutral-500">Weist zu…</span> : msg ? <span className="text-xs text-neutral-500" role="status">{msg}</span> : null}
    </span>
  );
}
