"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { EyeOff, Search, X } from "lucide-react";
import { LEAD_PIPELINE_KEYS, LEAD_STATUSES } from "@/config/catalog";
import { moveLeadAction } from "@/app/(app)/sales/actions";
import { LeadCard } from "@/components/sales/lead-card";
import { formatCHF, cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/types/entities";

// Status-Lookup (key -> {label,color}) fuer Spalten-Header + optimistic move.
const STATUS_MAP = new Map<string, { key: string; label: string; color: string }>(
  LEAD_STATUSES.map((s) => [s.key, { key: s.key, label: s.label, color: s.color }]),
);

/** Abschluss-Status - lassen sich ausblenden, damit das Board arbeitsfaehig bleibt. */
const TERMINAL = new Set(["abgeschlossen", "absage", "fehleintrag", "andere"]);

/** Farbakzent je Status (Katalogfarbe -> Tailwind). */
const DOT: Record<string, string> = {
  gray: "bg-neutral-400",
  blue: "bg-brand-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};
const BAR: Record<string, string> = {
  gray: "bg-neutral-300",
  blue: "bg-brand-400",
  green: "bg-green-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
};

export function LeadPipeline({ leads }: { leads: LeadWithRelations[] }) {
  const [items, setItems] = useState<LeadWithRelations[]>(leads);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [hideDone, setHideDone] = useState(true);

  // Server-Daten (revalidate) nur uebernehmen, wenn gerade KEINE optimistische
  // Verschiebung laeuft - sonst wuerde das veraltete leads-Prop sie zuruecksetzen.
  useEffect(() => {
    if (!isPending) setItems(leads);
  }, [leads, isPending]);

  const owners = useMemo(() => {
    const set = new Set<string>();
    for (const l of items) {
      const n = l.owner?.full_name ?? l.assigned_to_name;
      if (n) set.add(n);
    }
    return [...set].sort();
  }, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((l) => {
      if (owner && (l.owner?.full_name ?? l.assigned_to_name) !== owner) return false;
      if (!q) return true;
      return [l.contact_name, l.company_name, l.email, l.phone, l.dienstleistung, l.campaign_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, search, owner]);

  const columns = useMemo(
    () => LEAD_PIPELINE_KEYS.filter((k) => !(hideDone && TERMINAL.has(k))),
    [hideDone],
  );

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
          ? { ...l, status: { key: col.key, label: col.label, color: col.color } }
          : l,
      ),
    );

    startTransition(async () => {
      const res = await moveLeadAction(id, statusKey);
      if (!res.ok) setItems(snapshot); // bei Fehler zuruecksetzen
    });
  }

  const inColumn = (key: string) => visible.filter((l) => l.status?.key === key);

  const openLeads = visible.filter((l) => !TERMINAL.has(l.status?.key ?? ""));
  const openValue = openLeads.reduce((s, l) => s + (l.estimated_value ?? 0), 0);
  const filtered = Boolean(search || owner);

  return (
    <div className="space-y-4">
      {/* Kopfzeile: Ueberblick + Filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[15rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen: Name, Firma, Telefon, Dienstleistung …"
            className="h-9 w-full rounded-lg border border-neutral-300 bg-white pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          aria-label="Verantwortlich filtern"
          className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">Alle Verantwortlichen</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setHideDone((v) => !v)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
            hideDone
              ? "border-neutral-200 bg-white text-neutral-700 hover:border-brand-300"
              : "border-brand-300 bg-brand-50 text-brand-700",
          )}
          title="Abgeschlossen, Absage, Fehleintrag und Andere ein-/ausblenden"
        >
          <EyeOff className="h-4 w-4" />
          {hideDone ? "Abgeschlossene einblenden" : "Abgeschlossene ausblenden"}
        </button>
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setOwner("");
            }}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" /> Filter loeschen
          </button>
        ) : null}
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-neutral-500">
            <span className="font-semibold tabular-nums text-neutral-900">
              {openLeads.length}
            </span>{" "}
            offen
          </span>
          {openValue > 0 ? (
            <span className="text-neutral-500">
              Wert{" "}
              <span className="font-semibold tabular-nums text-neutral-900">
                {formatCHF(openValue)}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((colKey) => {
          const col = STATUS_MAP.get(colKey)!;
          const colLeads = inColumn(colKey);
          const colValue = colLeads.reduce((s, l) => s + (l.estimated_value ?? 0), 0);
          const isOver = overCol === colKey;
          return (
            <section
              key={colKey}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(colKey);
              }}
              onDragLeave={() => setOverCol((c) => (c === colKey ? null : c))}
              onDrop={() => handleDrop(colKey)}
              className={cn(
                "flex w-[17rem] shrink-0 flex-col overflow-hidden rounded-xl border bg-neutral-100/70 transition-colors",
                isOver
                  ? "border-brand-400 bg-brand-50/70 ring-2 ring-brand-200"
                  : "border-neutral-200",
              )}
            >
              {/* Farbstreifen je Status */}
              <div className={cn("h-1 w-full", BAR[col.color] ?? BAR.gray)} />

              <header className="sticky top-0 z-10 border-b border-neutral-200/80 bg-neutral-100/90 px-3 py-2.5 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", DOT[col.color] ?? DOT.gray)}
                  />
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800">
                    {col.label}
                  </h3>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-600 shadow-sm">
                    {colLeads.length}
                  </span>
                </div>
                {colValue > 0 ? (
                  <p className="mt-1 pl-4 text-[11px] tabular-nums text-neutral-500">
                    {formatCHF(colValue)}
                  </p>
                ) : null}
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto px-2 py-2 [max-height:calc(100vh-19rem)]">
                {colLeads.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "cursor-grab active:cursor-grabbing",
                      dragId === l.id && "opacity-40",
                    )}
                  >
                    <LeadCard lead={l} />
                  </div>
                ))}
                {colLeads.length === 0 ? (
                  <div
                    className={cn(
                      "rounded-lg border border-dashed px-3 py-8 text-center text-xs transition-colors",
                      isOver
                        ? "border-brand-400 bg-white/60 text-brand-600"
                        : "border-neutral-300 text-neutral-400",
                    )}
                  >
                    {isOver ? "Hier ablegen" : "Keine Leads"}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-neutral-400">
        Karten per Drag &amp; Drop in eine andere Spalte ziehen - der Status wird
        sofort gespeichert und das Follow-up automatisch neu geplant.
      </p>
    </div>
  );
}
