"use client";

import { useEffect, useState, useTransition } from "react";
import { LEAD_PIPELINE_KEYS, LEAD_STATUSES } from "@/config/catalog";
import { moveLeadAction } from "@/app/(app)/sales/actions";
import { LeadCard } from "@/components/sales/lead-card";
import { StatusBadge } from "@/components/tasks/status-badge";
import { cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/types/entities";

// Status-Lookup (key -> {label,color}) fuer Spalten-Header + optimistic move.
const STATUS_MAP = new Map<string, { key: string; label: string; color: string }>(
  LEAD_STATUSES.map((s) => [s.key, { key: s.key, label: s.label, color: s.color }]),
);

export function LeadPipeline({ leads }: { leads: LeadWithRelations[] }) {
  const [items, setItems] = useState<LeadWithRelations[]>(leads);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Server-Daten (revalidate) nur uebernehmen, wenn gerade KEINE optimistische
  // Verschiebung laeuft - sonst wuerde das veraltete leads-Prop sie zuruecksetzen.
  useEffect(() => {
    if (!isPending) setItems(leads);
  }, [leads, isPending]);

  function handleDrop(statusKey: string) {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id) return;
    const lead = items.find((l) => l.id === id);
    if (!lead || lead.status?.key === statusKey) return;

    const col = STATUS_MAP.get(statusKey);
    if (!col) return;
    const snapshot = items;

    // Optimistisch verschieben (nur lokales status setzen).
    setItems((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: { key: col.key, label: col.label, color: col.color },
            }
          : l,
      ),
    );

    startTransition(async () => {
      const res = await moveLeadAction(id, statusKey);
      if (!res.ok) setItems(snapshot); // bei Fehler zuruecksetzen
    });
  }

  const inColumn = (key: string) =>
    items.filter((l) => l.status?.key === key);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {LEAD_PIPELINE_KEYS.map((colKey) => {
        const col = STATUS_MAP.get(colKey)!;
        const colLeads = inColumn(colKey);
        return (
          <div
            key={colKey}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(colKey);
            }}
            onDragLeave={() =>
              setOverCol((c) => (c === colKey ? null : c))
            }
            onDrop={() => handleDrop(colKey)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl border border-neutral-200 bg-neutral-50/60",
              overCol === colKey && "ring-2 ring-brand-300",
            )}
          >
            <header className="flex items-center justify-between px-3 py-2.5">
              <StatusBadge label={col.label} color={col.color} />
              <span className="text-xs font-medium text-neutral-400">
                {colLeads.length}
              </span>
            </header>
            <div className="flex-1 space-y-2 px-2 pb-3">
              {colLeads.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={() => setDragId(l.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "cursor-grab active:cursor-grabbing",
                    dragId === l.id && "opacity-50",
                  )}
                >
                  <LeadCard lead={l} />
                </div>
              ))}
              {colLeads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
                  Keine Leads
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
