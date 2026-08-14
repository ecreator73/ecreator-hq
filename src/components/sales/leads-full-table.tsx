"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Download, Search, X } from "lucide-react";
import { StatusBadge } from "@/components/tasks/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LEAD_STATUSES,
  LEAD_SOURCE_LABELS,
  COMPANY_SIZE_LABELS,
} from "@/config/catalog";
import { formatCHF, formatDate, cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/types/entities";

/**
 * Vollstaendige Lead-Tabelle: ALLE erfassten Felder in einer Ansicht -
 * sortierbar, durchsuchbar, filterbar und als CSV exportierbar.
 * Ergaenzt die kompakte Arbeitsliste unter "Alle Leads".
 */

type Row = LeadWithRelations;

const srcLabel = (s: string | null) =>
  s ? (LEAD_SOURCE_LABELS[s as keyof typeof LEAD_SOURCE_LABELS] ?? s) : "-";
const sizeLabel = (s: string | null) =>
  s ? (COMPANY_SIZE_LABELS[s as keyof typeof COMPANY_SIZE_LABELS] ?? s) : "-";

/** Spaltendefinition: Wert fuer Anzeige, Sortierung und CSV an einer Stelle. */
interface Col {
  key: string;
  label: string;
  group: string;
  /** Rohwert fuer Sortierung/CSV. */
  value: (l: Row) => string | number | null;
  /** Abweichende Darstellung in der Tabelle. */
  render?: (l: Row) => React.ReactNode;
  align?: "right";
  width?: string;
  numeric?: boolean;
}

const COLS: Col[] = [
  // Kontakt
  {
    key: "contact_name",
    label: "Name",
    group: "Kontakt",
    width: "w-[14rem] min-w-[12rem]",
    value: (l) => l.contact_name ?? l.company_name ?? "",
    render: (l) => (
      <Link
        href={`/sales/leads/${l.id}`}
        className="font-medium text-brand-700 hover:underline"
      >
        {l.contact_name || l.company_name}
      </Link>
    ),
  },
  {
    key: "company_name",
    label: "Firma",
    group: "Kontakt",
    width: "w-[16rem] min-w-[14rem]",
    value: (l) => l.company_name ?? "",
  },
  {
    key: "email",
    label: "E-Mail",
    group: "Kontakt",
    width: "min-w-[14rem]",
    value: (l) => l.email ?? "",
    render: (l) =>
      l.email ? (
        <a href={`mailto:${l.email}`} className="hover:text-brand-700">
          {l.email}
        </a>
      ) : (
        <span className="text-neutral-300">-</span>
      ),
  },
  {
    key: "phone",
    label: "Telefon",
    group: "Kontakt",
    width: "min-w-[9rem]",
    value: (l) => l.phone ?? "",
    render: (l) =>
      l.phone ? (
        <a href={`tel:${l.phone}`} className="whitespace-nowrap hover:text-brand-700">
          {l.phone}
        </a>
      ) : (
        <span className="text-neutral-300">-</span>
      ),
  },
  {
    key: "website",
    label: "Website",
    group: "Kontakt",
    width: "min-w-[10rem]",
    value: (l) => l.website ?? "",
    render: (l) =>
      l.website ? (
        <a
          href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
          target="_blank"
          rel="noreferrer"
          className="block max-w-[12rem] truncate hover:text-brand-700"
        >
          {l.website}
        </a>
      ) : (
        <span className="text-neutral-300">-</span>
      ),
  },
  // Qualifizierung
  {
    key: "dienstleistung",
    label: "Dienstleistung",
    group: "Qualifizierung",
    width: "w-[15rem] min-w-[13rem]",
    value: (l) => l.dienstleistung ?? "",
    render: (l) => (
      <span className="block text-xs leading-snug break-words">
        {l.dienstleistung ?? "-"}
      </span>
    ),
  },
  {
    key: "industry",
    label: "Branche",
    group: "Qualifizierung",
    width: "min-w-[9rem]",
    value: (l) => l.industry ?? "",
  },
  {
    key: "company_size",
    label: "Groesse",
    group: "Qualifizierung",
    width: "min-w-[7rem]",
    value: (l) => l.company_size ?? "",
    render: (l) => <span className="whitespace-nowrap">{sizeLabel(l.company_size ?? null)}</span>,
  },
  {
    key: "city",
    label: "Standort",
    group: "Qualifizierung",
    width: "min-w-[9rem]",
    value: (l) => l.city ?? "",
  },
  {
    key: "lead_score",
    label: "Score",
    group: "Qualifizierung",
    align: "right",
    numeric: true,
    width: "min-w-[5rem]",
    value: (l) => l.lead_score ?? 0,
    render: (l) => (
      <span
        className={cn(
          "font-medium tabular-nums",
          (l.lead_score ?? 0) >= 70 ? "text-amber-600" : "text-neutral-600",
        )}
      >
        {l.lead_score ?? 0}
      </span>
    ),
  },
  {
    key: "estimated_value",
    label: "Budget",
    group: "Qualifizierung",
    align: "right",
    numeric: true,
    width: "min-w-[8rem]",
    value: (l) => l.estimated_value ?? 0,
    render: (l) => (
      <span className="whitespace-nowrap tabular-nums">
        {l.estimated_value ? formatCHF(l.estimated_value, l.currency) : "-"}
      </span>
    ),
  },
  // Prozess
  {
    key: "status",
    label: "Status",
    group: "Prozess",
    width: "min-w-[11rem]",
    value: (l) => l.status?.label ?? "",
    render: (l) => <StatusBadge label={l.status?.label} color={l.status?.color} />,
  },
  {
    key: "owner",
    label: "Verantwortlich",
    group: "Prozess",
    width: "min-w-[11rem]",
    value: (l) => l.owner?.full_name ?? l.assigned_to_name ?? "",
    render: (l) => {
      const name = l.owner?.full_name ?? l.assigned_to_name ?? null;
      return name ? (
        <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          {name}
        </span>
      ) : (
        <span className="inline-flex whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
          Nicht zugewiesen
        </span>
      );
    },
  },
  {
    key: "next_action_date",
    label: "Naechste Aktion",
    group: "Prozess",
    width: "min-w-[9rem]",
    value: (l) => l.next_action_date ?? "",
    render: (l) => {
      if (!l.next_action_date) return <span className="text-neutral-300">-</span>;
      const overdue = l.next_action_date < new Date().toISOString().slice(0, 10);
      return (
        <span
          className={cn(
            "whitespace-nowrap",
            overdue ? "font-medium text-red-600" : "text-neutral-600",
          )}
        >
          {formatDate(l.next_action_date)}
        </span>
      );
    },
  },
  {
    key: "created_at",
    label: "Erstellt",
    group: "Prozess",
    width: "min-w-[8rem]",
    value: (l) => l.created_at ?? "",
    render: (l) => (
      <span className="whitespace-nowrap text-neutral-500">
        {l.created_at ? formatDate(l.created_at) : "-"}
      </span>
    ),
  },
  // Herkunft
  {
    key: "source",
    label: "Quelle",
    group: "Herkunft",
    width: "min-w-[8rem]",
    value: (l) => srcLabel(l.source),
    render: (l) => <span className="whitespace-nowrap">{srcLabel(l.source)}</span>,
  },
  {
    key: "campaign_name",
    label: "Kampagne",
    group: "Herkunft",
    width: "w-[14rem] min-w-[12rem]",
    value: (l) => l.campaign_name ?? "",
    render: (l) => (
      <span className="block text-xs leading-snug break-words">
        {l.campaign_name ?? "-"}
      </span>
    ),
  },
  {
    key: "ad_name",
    label: "Anzeige",
    group: "Herkunft",
    width: "min-w-[10rem]",
    value: (l) => l.ad_name ?? "",
    render: (l) => (
      <span className="block max-w-[12rem] truncate text-xs" title={l.ad_name ?? undefined}>
        {l.ad_name ?? "-"}
      </span>
    ),
  },
  {
    key: "form_name",
    label: "Formular",
    group: "Herkunft",
    width: "min-w-[10rem]",
    value: (l) => l.form_name ?? "",
    render: (l) => (
      <span className="block max-w-[12rem] truncate text-xs" title={l.form_name ?? undefined}>
        {l.form_name ?? "-"}
      </span>
    ),
  },
  // Sonstiges
  {
    key: "notes",
    label: "Notiz",
    group: "Sonstiges",
    width: "w-[18rem] min-w-[14rem]",
    value: (l) => l.notes ?? "",
    render: (l) => (
      <span className="block text-xs leading-snug break-words text-neutral-600">
        {l.notes ?? "-"}
      </span>
    ),
  },
  {
    key: "legacy_status",
    label: "Alt-Status",
    group: "Sonstiges",
    width: "min-w-[9rem]",
    value: (l) => l.legacy_status ?? "",
    render: (l) => (
      <span className="whitespace-nowrap text-xs text-neutral-400">
        {l.legacy_status ?? "-"}
      </span>
    ),
  },
];

function csvEscape(v: string | number | null): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function LeadsFullTable({ leads }: { leads: Row[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [sort, setSort] = useState<{ key: string; asc: boolean }>({
    key: "created_at",
    asc: false,
  });

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads) {
      const name = l.owner?.full_name ?? l.assigned_to_name;
      if (name) map.set(name, name);
    }
    return [...map.keys()].sort();
  }, [leads]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.source) set.add(l.source);
    return [...set].sort();
  }, [leads]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = leads.filter((l) => {
      if (status && l.status?.key !== status) return false;
      if (source && l.source !== source) return false;
      if (owner && (l.owner?.full_name ?? l.assigned_to_name) !== owner) return false;
      if (!q) return true;
      return [
        l.contact_name,
        l.company_name,
        l.email,
        l.phone,
        l.dienstleistung,
        l.campaign_name,
        l.industry,
        l.city,
        l.notes,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    const col = COLS.find((c) => c.key === sort.key);
    if (col) {
      out = [...out].sort((a, b) => {
        const va = col.value(a);
        const vb = col.value(b);
        if (col.numeric) {
          const d = Number(va ?? 0) - Number(vb ?? 0);
          return sort.asc ? d : -d;
        }
        const d = String(va ?? "").localeCompare(String(vb ?? ""), "de");
        return sort.asc ? d : -d;
      });
    }
    return out;
  }, [leads, search, status, source, owner, sort]);

  function toggleSort(key: string) {
    setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));
  }

  function exportCsv() {
    const header = COLS.map((c) => c.label).join(";");
    const body = rows
      .map((l) => COLS.map((c) => csvEscape(c.value(l))).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + header + "\n" + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = Boolean(search || status || source || owner);

  return (
    <div className="space-y-4">
      {/* Filterleiste */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen in Name, Firma, E-Mail, Dienstleistung, Notiz …"
            className="h-9 w-full rounded-lg border border-neutral-300 bg-white pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status filtern"
          className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">Alle Status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          aria-label="Quelle filtern"
          className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">Alle Quellen</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {srcLabel(s)}
            </option>
          ))}
        </select>
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
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("");
              setSource("");
              setOwner("");
            }}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" /> Filter loeschen
          </button>
        ) : null}
        <span className="ml-auto flex items-center gap-3">
          <span className="text-sm tabular-nums text-neutral-500">
            {rows.length} von {leads.length}
          </span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </span>
      </div>

      {/* Tabelle */}
      {rows.length === 0 ? (
        <EmptyState
          title={leads.length === 0 ? "Noch keine Leads" : "Keine Treffer"}
          description={
            leads.length === 0
              ? "Sobald Leads eingehen, erscheinen sie hier mit allen erfassten Feldern."
              : "Kein Lead passt zu den gewaehlten Filtern."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-neutral-50">
              {/* Gruppen-Zeile: ordnet die vielen Spalten optisch */}
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400">
                {groupSpans().map((g, i) => (
                  <th
                    key={g.label}
                    colSpan={g.span}
                    className={cn(
                      "px-4 pb-1 pt-2 font-semibold",
                      i > 0 && "border-l border-neutral-200",
                    )}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                {COLS.map((c, i) => {
                  const active = sort.key === c.key;
                  const firstOfGroup =
                    i > 0 && COLS[i - 1]!.group !== c.group;
                  return (
                    <th
                      key={c.key}
                      className={cn(
                        "px-4 py-2 font-medium",
                        c.width,
                        c.align === "right" && "text-right",
                        firstOfGroup && "border-l border-neutral-200",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-neutral-700",
                          active && "text-brand-700",
                        )}
                      >
                        {c.label}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((l) => (
                <tr key={l.id} className="align-top hover:bg-neutral-50">
                  {COLS.map((c, i) => {
                    const firstOfGroup = i > 0 && COLS[i - 1]!.group !== c.group;
                    return (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-2.5 text-neutral-700",
                          c.width,
                          c.align === "right" && "text-right",
                          firstOfGroup && "border-l border-neutral-100",
                        )}
                      >
                        {c.render ? c.render(l) : ((c.value(l) as string) || "-")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Spaltengruppen mit ihrer Breite (colSpan) fuer die Kopfzeile. */
function groupSpans(): Array<{ label: string; span: number }> {
  const out: Array<{ label: string; span: number }> = [];
  for (const c of COLS) {
    const last = out[out.length - 1];
    if (last && last.label === c.group) last.span++;
    else out.push({ label: c.group, span: 1 });
  }
  return out;
}
