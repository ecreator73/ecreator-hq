"use client";

import { useEffect, useState, useTransition } from "react";
import {
  OUTREACH_PIPELINE_KEYS,
  statusLabel,
  outreachMessageStatusColor,
} from "@/config/catalog";
import { setMessageStatusAction } from "@/app/(app)/sales/outreach/actions";
import { MessageCard } from "@/components/outreach/message-card";
import { StatusBadge } from "@/components/tasks/status-badge";
import { cn } from "@/lib/utils";
import type { OutreachMessageWithRelations } from "@/types/entities";

/**
 * Outreach-Pipeline (Kanban). Spalten = OUTREACH_PIPELINE_KEYS (Nachrichten-
 * Status ohne negative/no_interest). HTML5 Drag&Drop verschiebt eine Nachricht
 * optimistisch in eine andere Spalte und ruft setMessageStatusAction; bei
 * Fehler wird der Snapshot zurueckgesetzt. Karten via <MessageCard>.
 */
export function OutreachPipeline({
  messages,
}: {
  messages: OutreachMessageWithRelations[];
}) {
  const [items, setItems] = useState<OutreachMessageWithRelations[]>(messages);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Server-Daten nur uebernehmen, wenn gerade KEINE optimistische Verschiebung
  // laeuft - sonst wuerde das veraltete messages-Prop sie zuruecksetzen.
  useEffect(() => {
    if (!isPending) setItems(messages);
  }, [messages, isPending]);

  function handleDrop(statusKey: string) {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id) return;
    const message = items.find((m) => m.id === id);
    if (!message || message.status === statusKey) return;

    const snapshot = items;

    // Optimistisch verschieben (nur lokales status setzen).
    setItems((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: statusKey as (typeof m)["status"] }
          : m,
      ),
    );

    startTransition(async () => {
      const res = await setMessageStatusAction(id, statusKey);
      if (!res.ok) setItems(snapshot); // bei Fehler zuruecksetzen
    });
  }

  const inColumn = (key: string) => items.filter((m) => m.status === key);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {OUTREACH_PIPELINE_KEYS.map((colKey) => {
        const colMessages = inColumn(colKey);
        return (
          <div
            key={colKey}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(colKey);
            }}
            onDragLeave={() => setOverCol((c) => (c === colKey ? null : c))}
            onDrop={() => handleDrop(colKey)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl border border-neutral-200 bg-neutral-50/60",
              overCol === colKey && "ring-2 ring-brand-300",
            )}
          >
            <header className="flex items-center justify-between px-3 py-2.5">
              <StatusBadge
                label={statusLabel("outreach_message", colKey)}
                color={outreachMessageStatusColor(colKey)}
              />
              <span className="text-xs font-medium text-neutral-400">
                {colMessages.length}
              </span>
            </header>
            <div className="flex-1 space-y-2 px-2 pb-3">
              {colMessages.map((m) => (
                <div
                  key={m.id}
                  draggable
                  onDragStart={() => setDragId(m.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "cursor-grab active:cursor-grabbing",
                    dragId === m.id && "opacity-50",
                  )}
                >
                  <MessageCard message={m} />
                </div>
              ))}
              {colMessages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
                  Keine Nachrichten
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
