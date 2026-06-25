"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/config/catalog";
import { formatDate, formatCHF, cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/types/entities";

const selectClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const SCORE_OPTIONS = [
  { value: "0", label: "Score: alle" },
  { value: "40", label: "Score ab 40" },
  { value: "70", label: "Score ab 70" },
];

const today = () => new Date().toISOString().slice(0, 10);

const TERMINAL_LEAD = ["abgeschlossen", "absage", "fehleintrag", "andere"];
function isOverdue(lead: LeadWithRelations): boolean {
  if (!lead.next_action_date) return false;
  if (TERMINAL_LEAD.includes(lead.status?.key ?? "")) return false;
  return lead.next_action_date < today();
}

function scoreTone(score: number): string {
  if (score >= 70) return "bg-green-50 text-green-700 border-green-100";
  if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-neutral-100 text-neutral-600 border-neutral-200";
}

export function LeadsTable({
  rows,
  total,
  page,
  pageSize,
  options,
}: {
  rows: LeadWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  options: { users: { id: string; full_name: string | null }[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [searchInput, setSearchInput] = useState(sp.get("search") ?? "");

  // Debounced Suche -> URL
  useEffect(() => {
    const current = sp.get("search") ?? "";
    if (searchInput === current) return;
    const t = setTimeout(() => setParam("search", searchInput || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, sp]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(Array.from(sp.entries()));
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleSort(col: string) {
    const params = new URLSearchParams(Array.from(sp.entries()));
    const curSort = sp.get("sort");
    const curDir = sp.get("dir") ?? "asc";
    if (curSort === col) params.set("dir", curDir === "asc" ? "desc" : "asc");
    else {
      params.set("sort", col);
      params.set("dir", "asc");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const hasFilters = ["search", "status", "source", "owner", "scoreMin"].some(
    (k) => sp.get(k),
  );

  return (
    <div className="space-y-3">
      {/* Filterleiste */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Suche Firma, Ansprechpartner, E-Mail, Telefon ..."
            aria-label="Leads durchsuchen"
            className="h-9 w-72 rounded-lg border border-neutral-300 bg-white pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <select
          value={sp.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value || null)}
          aria-label="Status filtern"
          className={selectClass}
        >
          <option value="">Alle Status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={sp.get("source") ?? ""}
          onChange={(e) => setParam("source", e.target.value || null)}
          aria-label="Quelle filtern"
          className={selectClass}
        >
          <option value="">Alle Quellen</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={sp.get("owner") ?? ""}
          onChange={(e) => setParam("owner", e.target.value || null)}
          aria-label="Verantwortlich filtern"
          className={selectClass}
        >
          <option value="">Alle Verantwortlichen</option>
          {options.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? "Unbenannt"}
            </option>
          ))}
        </select>

        <select
          value={sp.get("scoreMin") ?? "0"}
          onChange={(e) => setParam("scoreMin", e.target.value === "0" ? null : e.target.value)}
          aria-label="Mindest-Score filtern"
          className={selectClass}
        >
          {SCORE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
            Zuruecksetzen
          </button>
        ) : null}
      </div>

      {/* Tabelle */}
      {rows.length === 0 ? (
        <EmptyState
          title="Keine Leads gefunden"
          description="Passe die Filter an oder erstelle einen neuen Lead."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[60rem] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <SortHeader label="Firma" col="company_name" sp={sp} onClick={toggleSort} />
                <th className="px-4 py-2.5 font-medium">Ansprechpartner</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <SortHeader label="Score" col="lead_score" sp={sp} onClick={toggleSort} />
                <SortHeader label="Wert" col="estimated_value" sp={sp} onClick={toggleSort} />
                <th className="px-4 py-2.5 font-medium">Verantwortlich</th>
                <SortHeader
                  label="Naechste Aktion"
                  col="next_action_date"
                  sp={sp}
                  onClick={toggleSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/sales/leads/${l.id}`}
                      className="font-medium text-neutral-900 hover:text-brand-700"
                    >
                      {l.company_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">
                    {l.contact_name ?? "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge label={l.status?.label} color={l.status?.color} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-1.5 py-0.5 text-[11px] font-semibold",
                        scoreTone(l.lead_score),
                      )}
                    >
                      {l.lead_score}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">
                    {l.estimated_value != null
                      ? formatCHF(l.estimated_value, l.currency)
                      : "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    {l.owner ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar
                          name={l.owner.full_name ?? "?"}
                          className="h-6 w-6 text-[10px]"
                        />
                        <span className="text-neutral-600">
                          {l.owner.full_name ?? "Unbenannt"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {l.next_action_date ? (
                      <span
                        className={cn(
                          isOverdue(l)
                            ? "font-medium text-red-600"
                            : "text-neutral-600",
                        )}
                      >
                        {formatDate(l.next_action_date)}
                      </span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          {total} Lead(s) · Seite {page} / {totalPages}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
            aria-label="Vorherige Seite"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setParam("page", String(page + 1))}
            aria-label="Naechste Seite"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  col,
  sp,
  onClick,
}: {
  label: string;
  col: string;
  sp: URLSearchParams;
  onClick: (col: string) => void;
}) {
  const active = sp.get("sort") === col;
  return (
    <th className="px-4 py-2.5 font-medium">
      <button
        type="button"
        onClick={() => onClick(col)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-neutral-700",
          active && "text-brand-700",
        )}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );
}
