"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Linkedin,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ProspectForm } from "@/components/linkedin/prospect-form";
import { ProspectImport } from "@/components/linkedin/prospect-import";
import { LINKEDIN_PROSPECT_STATUSES } from "@/config/catalog";
import type { LinkedInProspectStatus } from "@/config/catalog";
import { HOT_PROSPECT_THRESHOLD, isTerminalProspectStatus } from "@/lib/linkedin";
import { formatDate, cn } from "@/lib/utils";
import {
  moveProspectAction,
  deleteProspectAction,
} from "@/app/(app)/sales/linkedin/actions";
import type { LinkedInProspectWithRelations } from "@/types/entities";

const selectClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const SCORE_OPTIONS = [
  { value: "0", label: "Score: alle" },
  { value: "70", label: "Score ab 70" },
  { value: "50", label: "Score ab 50" },
  { value: "30", label: "Score ab 30" },
];

export function ProspectsTable({
  rows,
  total,
  page,
  pageSize,
  options,
}: {
  rows: LinkedInProspectWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  options: {
    users: { id: string; full_name: string }[];
    campaigns: { id: string; name: string }[];
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [searchInput, setSearchInput] = useState(sp.get("search") ?? "");
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProspect, setEditProspect] =
    useState<LinkedInProspectWithRelations | null>(null);
  const [importOpen, setImportOpen] = useState(false);

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

  function changeStatus(id: string, status: LinkedInProspectStatus) {
    setBusyId(id);
    setActionError(null);
    startTransition(async () => {
      const res = await moveProspectAction(id, status);
      if (!res.ok) setActionError(res.error);
      setBusyId(null);
      router.refresh();
    });
  }

  function remove(p: LinkedInProspectWithRelations) {
    if (!window.confirm(`Prospect "${p.full_name}" wirklich loeschen?`)) return;
    setBusyId(p.id);
    setActionError(null);
    startTransition(async () => {
      const res = await deleteProspectAction(p.id);
      if (!res.ok) setActionError(res.error);
      setBusyId(null);
      router.refresh();
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = [
    "search",
    "status",
    "campaign",
    "owner",
    "industry",
    "scoreMin",
  ].some((k) => sp.get(k));

  return (
    <div className="space-y-3">
      {/* Filterleiste */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Suche Name, Firma, Position ..."
            aria-label="Prospects durchsuchen"
            className="h-9 w-64 rounded-lg border border-neutral-300 bg-white pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select value={sp.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value || null)} aria-label="Status filtern" className={selectClass}>
          <option value="">Alle Status</option>
          {LINKEDIN_PROSPECT_STATUSES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
        </select>
        <select value={sp.get("campaign") ?? ""} onChange={(e) => setParam("campaign", e.target.value || null)} aria-label="Kampagne filtern" className={selectClass}>
          <option value="">Alle Kampagnen</option>
          {options.campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <select value={sp.get("owner") ?? ""} onChange={(e) => setParam("owner", e.target.value || null)} aria-label="Verantwortlich filtern" className={selectClass}>
          <option value="">Alle Verantwortlichen</option>
          {options.users.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
        </select>
        <select value={sp.get("scoreMin") ?? "0"} onChange={(e) => setParam("scoreMin", e.target.value === "0" ? null : e.target.value)} aria-label="Mindest-Score filtern" className={selectClass}>
          {SCORE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        {hasFilters ? (
          <button type="button" onClick={() => router.push(pathname)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-neutral-500 hover:bg-neutral-100">
            <X className="h-4 w-4" /> Zuruecksetzen
          </button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
            <FileUp className="h-4 w-4" /> CSV Import
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Prospect
          </Button>
        </div>
      </div>

      {actionError ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      ) : null}

      {/* Tabelle */}
      {rows.length === 0 ? (
        <EmptyState
          title="Keine Prospects gefunden"
          description="Passe die Filter an, erstelle einen Prospect oder importiere eine CSV-Liste."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[80rem] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <SortHeader label="Name" col="full_name" sp={sp} onClick={toggleSort} />
                <SortHeader label="Firma" col="company_name" sp={sp} onClick={toggleSort} />
                <th className="px-4 py-2.5 font-medium">Position</th>
                <th className="px-4 py-2.5 font-medium">Branche</th>
                <th className="px-4 py-2.5 font-medium">Standort</th>
                <th className="px-4 py-2.5 font-medium">Kampagne</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <SortHeader label="Score" col="lead_score" sp={sp} onClick={toggleSort} />
                <th className="px-4 py-2.5 font-medium">Verantwortlich</th>
                <SortHeader label="Follow-up" col="next_followup_date" sp={sp} onClick={toggleSort} />
                <th className="px-4 py-2.5 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((p) => {
                const busy = busyId === p.id && pending;
                const overdue =
                  !!p.next_followup_date &&
                  p.next_followup_date < today &&
                  !isTerminalProspectStatus(p.status);
                return (
                  <tr key={p.id} className={cn("align-middle hover:bg-neutral-50", busy && "opacity-60")}>
                    <td className="px-4 py-2.5">
                      <Link href={`/sales/linkedin/prospects/${p.id}`} className="font-medium text-brand-700 hover:underline">
                        {p.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">{p.company_name ?? "-"}</td>
                    <td className="max-w-[12rem] px-4 py-2.5 text-neutral-600">
                      <span className="block truncate" title={p.position ?? undefined}>{p.position ?? "-"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{p.industry ?? "-"}</td>
                    <td className="px-4 py-2.5 text-neutral-600">{p.location ?? "-"}</td>
                    <td className="max-w-[10rem] px-4 py-2.5 text-neutral-600">
                      <span className="block truncate" title={p.campaign?.name}>{p.campaign?.name ?? "-"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={p.status}
                        onChange={(e) => changeStatus(p.id, e.target.value as LinkedInProspectStatus)}
                        disabled={busy}
                        aria-label="Status aendern"
                        className="h-8 max-w-[13rem] rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
                      >
                        {LINKEDIN_PROSPECT_STATUSES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "tabular-nums",
                          p.lead_score >= HOT_PROSPECT_THRESHOLD
                            ? "font-bold text-amber-600"
                            : "text-neutral-600",
                        )}
                      >
                        {p.lead_score}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {p.owner ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {p.owner.full_name ?? "Zugewiesen"}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                          Nicht zugewiesen
                        </span>
                      )}
                    </td>
                    <td className={cn("px-4 py-2.5 whitespace-nowrap", overdue ? "font-medium text-red-600" : "text-neutral-500")}>
                      {p.next_followup_date ? formatDate(p.next_followup_date) : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                        ) : null}
                        {p.linkedin_url ? (
                          <a
                            href={p.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="LinkedIn-Profil oeffnen"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-brand-600"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        ) : null}
                        <button type="button" onClick={() => setEditProspect(p)} aria-label="Prospect bearbeiten" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-brand-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => remove(p)} disabled={busy} aria-label="Prospect loeschen" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>{total} Prospect(s) · Seite {page} / {totalPages}</span>
        <div className="flex gap-1">
          <button type="button" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))} aria-label="Vorherige Seite" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" disabled={page >= totalPages} onClick={() => setParam("page", String(page + 1))} aria-label="Naechste Seite" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Erstellen / Bearbeiten */}
      <ProspectForm
        open={createOpen || !!editProspect}
        onClose={() => {
          setCreateOpen(false);
          setEditProspect(null);
        }}
        initial={editProspect}
        options={options}
      />

      {/* CSV-Import */}
      <ProspectImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        campaigns={options.campaigns}
      />
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
      <button type="button" onClick={() => onClick(col)} className={cn("inline-flex items-center gap-1 hover:text-neutral-700", active && "text-brand-700")}>
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );
}
