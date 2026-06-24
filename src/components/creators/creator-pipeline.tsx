"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CREATOR_PIPELINE_KEYS, CREATOR_STATUSES, statusLabel } from "@/config/catalog";
import { setCreatorStatusAction } from "@/app/(app)/production/creators/actions";
import { CreatorCard } from "@/components/creators/creator-card";
import { StatusBadge } from "@/components/tasks/status-badge";
import { cn } from "@/lib/utils";
import type { CreatorWithStats } from "@/types/entities";

// Farbe je Status-Key (fuer Spalten-Header-Badge).
const COLOR_MAP = new Map<string, string>(
  CREATOR_STATUSES.map((s) => [s.key, s.color]),
);

/**
 * Kanban-Pipeline der Creator (spiegelt sales/lead-pipeline.tsx).
 * Spalten = CREATOR_PIPELINE_KEYS. HTML5 Drag&Drop verschiebt einen Creator
 * in eine andere Status-Spalte: optimistisch lokal + setCreatorStatusAction;
 * bei Fehler Revert + router.refresh.
 */
export function CreatorPipeline({ creators }: { creators: CreatorWithStats[] }) {
  const router = useRouter();
  const [items, setItems] = useState<CreatorWithStats[]>(creators);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Server-Daten (revalidate) nur uebernehmen, wenn gerade KEINE optimistische
  // Verschiebung laeuft - sonst wuerde das veraltete creators-Prop sie zuruecksetzen.
  useEffect(() => {
    if (!isPending) setItems(creators);
  }, [creators, isPending]);

  function handleDrop(statusKey: string) {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id) return;
    const creator = items.find((c) => c.id === id);
    if (!creator || creator.status === statusKey) return;
    if (!CREATOR_PIPELINE_KEYS.includes(statusKey as (typeof CREATOR_PIPELINE_KEYS)[number]))
      return;

    const snapshot = items;

    // Optimistisch verschieben (nur lokales status setzen).
    setItems((prev) =>
      prev.map((c) =>
        c.id === id
          ? ({ ...c, status: statusKey } as CreatorWithStats)
          : c,
      ),
    );

    startTransition(async () => {
      const res = await setCreatorStatusAction(id, statusKey);
      if (!res.ok) {
        setItems(snapshot); // bei Fehler zuruecksetzen
        router.refresh();
      }
    });
  }

  const inColumn = (key: string) => items.filter((c) => c.status === key);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {CREATOR_PIPELINE_KEYS.map((colKey) => {
        const colCreators = inColumn(colKey);
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
              <StatusBadge
                label={statusLabel("creator", colKey)}
                color={COLOR_MAP.get(colKey)}
              />
              <span className="text-xs font-medium text-neutral-400">
                {colCreators.length}
              </span>
            </header>
            <div className="flex-1 space-y-2 px-2 pb-3">
              {colCreators.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "cursor-grab active:cursor-grabbing",
                    dragId === c.id && "opacity-50",
                  )}
                >
                  <CreatorCard creator={c} />
                </div>
              ))}
              {colCreators.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
                  Keine Creator
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
