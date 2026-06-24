"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { NoteQuickCreate } from "@/components/clients/detail-quick-creates";
import { formatDate, cn } from "@/lib/utils";
import { EmptyRow } from "../detail-ui";
import type { ClientInteraction } from "@/types/entities";

/**
 * Notizen-Tab der Kunden-Detailseite. Zeigt alle internen Notizen (type="note")
 * als ruhige Karten, mit Volltextsuche ueber Betreff + Inhalt. Daten kommen
 * ausschliesslich via Props (bereits absteigend sortiert).
 */
export function NotesTab({
  clientId,
  interactions,
}: {
  clientId: string;
  interactions: ClientInteraction[];
}) {
  const [q, setQ] = useState("");

  const notes = useMemo(
    () => interactions.filter((i) => i.type === "note"),
    [interactions],
  );

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return notes;
    return notes.filter((n) =>
      `${n.subject ?? ""} ${n.body ?? ""}`.toLowerCase().includes(query),
    );
  }, [notes, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <label className="sr-only" htmlFor="notes-search">
            Notizen durchsuchen
          </label>
          <input
            id="notes-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Notizen durchsuchen ..."
            className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 pl-8 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="shrink-0">
          <NoteQuickCreate clientId={clientId} label="Notiz" variant="primary" />
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          title="Keine Notizen"
          description="Halte interne Notizen zu diesem Kunden fest."
        />
      ) : filtered.length === 0 ? (
        <EmptyRow>Keine Treffer.</EmptyRow>
      ) : (
        <ul className="space-y-3">
          {filtered.map((n) => (
            <li
              key={n.id}
              className="space-y-1 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              {n.subject ? (
                <p className="font-semibold text-neutral-900">{n.subject}</p>
              ) : null}
              {n.body ? (
                <p className="whitespace-pre-wrap text-sm text-neutral-700">
                  {n.body}
                </p>
              ) : null}
              <p
                className={cn(
                  "flex flex-wrap items-center gap-x-1.5 text-xs text-neutral-400",
                  (n.subject || n.body) && "pt-1",
                )}
              >
                <span>{formatDate(n.interaction_date)}</span>
                {n.author?.full_name ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{n.author.full_name}</span>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
