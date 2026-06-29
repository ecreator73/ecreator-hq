"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { LeadForm } from "@/components/sales/lead-form";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/config/catalog";
import { formatDate, cn } from "@/lib/utils";
import {
  moveLeadAction,
  deleteLeadAction,
} from "@/app/(app)/sales/actions";
import type { LeadWithRelations } from "@/types/entities";

const selectClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const SCORE_OPTIONS = [
  { value: "0", label: "Score: alle" },
  { value: "40", label: "Score ab 40" },
  { value: "70", label: "Score ab 70" },
];

const SRC_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  tiktok_ads: "TikTok Ads",
  google_ads: "Google Ads",
  linkedin_ads: "LinkedIn Ads",
  manual: "Manuell",
  vermittlung: "Vermittlung",
  lohnrechner: "Lohnrechner",
};
const srcLabel = (s: string | null | undefined) => (s ? SRC_LABELS[s] ?? s : "-");

function toInitial(l: LeadWithRelations) {
  return {
    company_name: l.company_name,
    contact_name: l.contact_name,
    email: l.email,
    phone: l.phone,
    website: l.website,
    industry: l.industry,
    company_size: l.company_size,
    city: l.city,
    country: l.country,
    source: l.source,
    estimated_value: l.estimated_value,
    status: l.status?.key,
    owner_id: l.owner_id,
    next_action_date: l.next_action_date,
    notes: l.notes,
  };
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
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editLead, setEditLead] = useState<LeadWithRelations | null>(null);

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

  function changeStatus(id: string, status: string) {
    setBusyId(id);
    startTransition(async () => {
      await moveLeadAction(id, status);
      setBusyId(null);
      router.refresh();
    });
  }

  function remove(l: LeadWithRelations) {
    const name = l.contact_name || l.company_name;
    if (!window.confirm(`Lead "${name}" wirklich loeschen?`)) return;
    setBusyId(l.id);
    startTransition(async () => {
      await deleteLeadAction(l.id);
      setBusyId(null);
      router.refresh();
    });
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
            placeholder="Suche Name, Firma, E-Mail, Telefon ..."
            aria-label="Leads durchsuchen"
            className="h-9 w-72 rounded-lg border border-neutral-300 bg-white pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select value={sp.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value || null)} aria-label="Status filtern" className={selectClass}>
          <option value="">Alle Status</option>
          {LEAD_STATUSES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
        </select>
        <select value={sp.get("source") ?? ""} onChange={(e) => setParam("source", e.target.value || null)} aria-label="Quelle filtern" className={selectClass}>
          <option value="">Alle Quellen</option>
          {LEAD_SOURCES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
        </select>
        <select value={sp.get("owner") ?? ""} onChange={(e) => setParam("owner", e.target.value || null)} aria-label="Verantwortlich filtern" className={selectClass}>
          <option value="">Alle Verantwortlichen</option>
          {options.users.map((u) => (<option key={u.id} value={u.id}>{u.full_name ?? "Unbenannt"}</option>))}
        </select>
        <select value={sp.get("scoreMin") ?? "0"} onChange={(e) => setParam("scoreMin", e.target.value === "0" ? null : e.target.value)} aria-label="Mindest-Score filtern" className={selectClass}>
          {SCORE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        {hasFilters ? (
          <button type="button" onClick={() => router.push(pathname)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-neutral-500 hover:bg-neutral-100">
            <X className="h-4 w-4" /> Zuruecksetzen
          </button>
        ) : null}
      </div>

      {/* Tabelle */}
      {rows.length === 0 ? (
        <EmptyState title="Keine Leads gefunden" description="Passe die Filter an oder erstelle einen neuen Lead." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[80rem] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">E-Mail</th>
                <th className="px-4 py-2.5 font-medium">Telefon</th>
                <SortHeader label="Firma" col="company_name" sp={sp} onClick={toggleSort} />
                <th className="px-4 py-2.5 font-medium">Quelle</th>
                <th className="px-4 py-2.5 font-medium">Kampagne</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Zugewiesen an</th>
                <th className="px-4 py-2.5 font-medium">Notiz</th>
                <SortHeader label="Erstellt" col="created_at" sp={sp} onClick={toggleSort} />
                <th className="px-4 py-2.5 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((l) => {
                const busy = busyId === l.id && pending;
                return (
                  <tr key={l.id} className={cn("align-middle hover:bg-neutral-50", busy && "opacity-60")}>
                    <td className="px-4 py-2.5">
                      <Link href={`/sales/leads/${l.id}`} className="font-medium text-brand-700 hover:underline">
                        {l.contact_name || l.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {l.email ? <a href={`mailto:${l.email}`} className="hover:text-brand-700">{l.email}</a> : <span className="text-neutral-300">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {l.phone ? <a href={`tel:${l.phone}`} className="hover:text-brand-700">{l.phone}</a> : <span className="text-neutral-300">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">{l.company_name}</td>
                    <td className="px-4 py-2.5 text-neutral-600">{srcLabel(l.source)}</td>
                    <td className="max-w-[12rem] px-4 py-2.5 text-neutral-600">
                      <span className="block truncate" title={l.campaign_name ?? undefined}>{l.campaign_name ?? "-"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={l.status?.key ?? ""}
                        onChange={(e) => changeStatus(l.id, e.target.value)}
                        disabled={busy}
                        aria-label="Status aendern"
                        className="h-8 max-w-[11rem] rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
                      >
                        {LEAD_STATUSES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      {l.owner ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {l.owner.full_name ?? "Zugewiesen"}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                          Nicht zugewiesen
                        </span>
                      )}
                    </td>
                    <td className="max-w-[16rem] px-4 py-2.5 text-neutral-600">
                      <span className="block truncate" title={l.notes ?? undefined}>{l.notes ?? "-"}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-neutral-500">
                      {l.created_at ? formatDate(l.created_at) : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                        ) : null}
                        <button type="button" onClick={() => setEditLead(l)} aria-label="Lead bearbeiten" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-brand-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => remove(l)} disabled={busy} aria-label="Lead loeschen" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
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
        <span>{total} Lead(s) · Seite {page} / {totalPages}</span>
        <div className="flex gap-1">
          <button type="button" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))} aria-label="Vorherige Seite" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" disabled={page >= totalPages} onClick={() => setParam("page", String(page + 1))} aria-label="Naechste Seite" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bearbeiten-Modal */}
      <Modal open={!!editLead} onClose={() => setEditLead(null)} title="Lead bearbeiten" size="lg">
        {editLead ? (
          <LeadForm
            mode="edit"
            leadId={editLead.id}
            users={options.users}
            initial={toInitial(editLead)}
            onCancel={() => setEditLead(null)}
            onDone={() => {
              setEditLead(null);
              router.refresh();
            }}
          />
        ) : null}
      </Modal>
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
