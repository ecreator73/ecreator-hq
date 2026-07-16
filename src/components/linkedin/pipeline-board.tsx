"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Megaphone } from "lucide-react";
import {
  LINKEDIN_PROSPECT_STATUSES,
  statusLabel,
  type LinkedInProspectStatus,
} from "@/config/catalog";
import { HOT_PROSPECT_THRESHOLD, isTerminalProspectStatus } from "@/lib/linkedin";
import { moveProspectAction } from "@/app/(app)/sales/linkedin/actions";
import { StatusBadge } from "@/components/tasks/status-badge";
import { formatDate, cn } from "@/lib/utils";
import type { LinkedInProspectWithRelations } from "@/types/entities";

/** Follow-up ueberfaellig? (Terminal-Status haben keine Follow-up-Pflicht.) */
function isOverdue(p: LinkedInProspectWithRelations): boolean {
  if (!p.next_followup_date) return false;
  if (isTerminalProspectStatus(p.status)) return false;
  return p.next_followup_date < new Date().toISOString().slice(0, 10);
}

function ProspectCard({ prospect }: { prospect: LinkedInProspectWithRelations }) {
  const hot = prospect.lead_score >= HOT_PROSPECT_THRESHOLD;
  return (
    <Link
      href={`/sales/linkedin/prospects/${prospect.id}`}
      draggable={false}
      className="block rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-colors hover:border-brand-300"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-neutral-900">
          {prospect.full_name}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold",
            hot
              ? "border-amber-100 bg-amber-50 text-amber-700"
              : "border-neutral-200 bg-neutral-100 text-neutral-600",
          )}
        >
          {prospect.lead_score}
        </span>
      </div>
      {prospect.company_name ? (
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {prospect.company_name}
        </p>
      ) : null}

      {prospect.next_followup_date ? (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs",
            isOverdue(prospect)
              ? "font-medium text-red-600"
              : "text-neutral-400",
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDate(prospect.next_followup_date)}
        </div>
      ) : null}

      {prospect.campaign ? (
        <p className="mt-1.5 inline-flex items-center gap-1 truncate text-[11px] text-neutral-400">
          <Megaphone className="h-3 w-3 shrink-0" />
          {prospect.campaign.name}
        </p>
      ) : null}
    </Link>
  );
}

export function PipelineBoard({
  prospects,
}: {
  prospects: LinkedInProspectWithRelations[];
}) {
  const [items, setItems] = useState<LinkedInProspectWithRelations[]>(prospects);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Server-Daten (revalidate) nur uebernehmen, wenn gerade KEINE optimistische
  // Verschiebung laeuft - sonst wuerde das veraltete prospects-Prop sie zuruecksetzen.
  useEffect(() => {
    if (!isPending) setItems(prospects);
  }, [prospects, isPending]);

  function handleDrop(statusKey: LinkedInProspectStatus) {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id) return;
    const prospect = items.find((p) => p.id === id);
    if (!prospect || prospect.status === statusKey) return;

    const snapshot = items;
    setError(null);

    // Optimistisch verschieben (nur lokalen Status setzen).
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: statusKey } : p)),
    );

    startTransition(async () => {
      const res = await moveProspectAction(id, statusKey);
      if (!res.ok) {
        setItems(snapshot); // bei Fehler zuruecksetzen
        setError(res.error);
      }
    });
  }

  const inColumn = (key: LinkedInProspectStatus) =>
    items.filter((p) => p.status === key);

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {LINKEDIN_PROSPECT_STATUSES.map((col) => {
          const colProspects = inColumn(col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.key);
              }}
              onDragLeave={() =>
                setOverCol((c) => (c === col.key ? null : c))
              }
              onDrop={() => handleDrop(col.key)}
              className={cn(
                "flex w-64 shrink-0 flex-col rounded-xl border border-neutral-200 bg-neutral-50/60",
                overCol === col.key && "ring-2 ring-brand-300",
              )}
            >
              <header className="flex items-center justify-between px-3 py-2.5">
                <StatusBadge
                  label={statusLabel("linkedin_prospect", col.key)}
                  color={col.color}
                />
                <span className="text-xs font-medium text-neutral-400">
                  {colProspects.length}
                </span>
              </header>
              <div className="flex-1 space-y-2 px-2 pb-3">
                {colProspects.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "cursor-grab active:cursor-grabbing",
                      dragId === p.id && "opacity-50",
                    )}
                  >
                    <ProspectCard prospect={p} />
                  </div>
                ))}
                {colProspects.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
                    Keine Prospects
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
