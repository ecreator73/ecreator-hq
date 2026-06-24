"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/tasks/status-badge";
import { CLIENT_STATUSES, statusLabel } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import { bulkUpdateClientsAction } from "@/app/(app)/clients/import/actions";
import type { ClientWithStats } from "@/types/entities";

const selectClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function ClientsTable({ clients }: { clients: ClientWithStats[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>(CLIENT_STATUSES[0].key);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const allSelected =
    clients.length > 0 && clients.every((c) => selected.has(c.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(clients.map((c) => c.id)));
  }
  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function applyStatus() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkError(null);
    startTransition(async () => {
      const res = await bulkUpdateClientsAction(ids, { status: bulkStatus });
      if (!res.ok) {
        setBulkError(res.error ?? "Aktualisierung fehlgeschlagen.");
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {/* Bulk-Leiste */}
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
          <span className="font-medium text-brand-800">
            {selected.size} ausgewaehlt
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className={selectClass}
            disabled={pending}
          >
            {CLIENT_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            onClick={applyStatus}
            disabled={pending}
          >
            Status setzen
          </Button>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          ) : null}
          {bulkError ? (
            <span className="font-medium text-red-600">{bulkError}</span>
          ) : null}
        </div>
      ) : null}

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[72rem] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Alle auswaehlen"
                />
              </th>
              <th className="px-4 py-2.5 font-medium">Firma</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Paket</th>
              <th className="px-4 py-2.5 text-right font-medium">MRR</th>
              <th className="px-4 py-2.5 font-medium">Start</th>
              <th className="px-4 py-2.5 font-medium">Letzter Kontakt</th>
              <th className="px-4 py-2.5 font-medium">Naechster Reporting</th>
              <th className="px-4 py-2.5 text-right font-medium">
                Offene Aufgaben
              </th>
              <th className="px-4 py-2.5 font-medium">Verantwortlich</th>
              <th className="px-4 py-2.5 font-medium">Warnungen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {clients.map((c) => (
              <tr key={c.id} className="align-top hover:bg-neutral-50">
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                    aria-label={`${c.name} auswaehlen`}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/clients/${c.id}`}
                    className="font-medium text-neutral-900 hover:text-brand-700"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge
                    label={statusLabel("client", c.status)}
                    color={
                      CLIENT_STATUSES.find((s) => s.key === c.status)?.color
                    }
                  />
                </td>
                <td className="px-4 py-2.5 text-neutral-700">
                  {c.package ?? "-"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                  {formatCHF(c.mrr)}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {c.start_date ? formatDate(c.start_date) : "-"}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {c.last_contact ? formatDate(c.last_contact) : "-"}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {c.next_reporting ? formatDate(c.next_reporting) : "-"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                  {c.open_tasks}
                </td>
                <td className="px-4 py-2.5 text-neutral-700">
                  {c.account_manager?.full_name ?? "-"}
                </td>
                <td className="px-4 py-2.5">
                  {c.warnings.length > 0 ? (
                    <Badge tone="amber">{c.warnings.length}</Badge>
                  ) : (
                    <span className="text-neutral-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
