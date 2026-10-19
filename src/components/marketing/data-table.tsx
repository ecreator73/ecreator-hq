"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sortierbare, durchsuchbare Tabelle. Spalten werden serialisierbar
 * beschrieben (Format als Schluessel), damit Server-Seiten sie direkt
 * befuellen koennen. Fehlende Werte erscheinen als «–», nie als 0.
 */

export type ColFormat = "text" | "int" | "dec" | "pct" | "chf" | "datetime" | "date" | "badge";

export interface Column {
  key: string;
  label: string;
  format?: ColFormat;
  align?: "left" | "right";
  /** Zeilenfeld mit einem Link-Ziel fuer diese Spalte */
  hrefKey?: string;
  /** Spalte auf kleinen Bildschirmen ausblenden */
  hideSm?: boolean;
  title?: string;
}

export type Row = Record<string, string | number | boolean | null | undefined>;

const nf0 = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nfChf = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dtf = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const df = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric" });

export function formatCell(v: Row[string], f: ColFormat = "text"): string {
  if (v == null || v === "") return "–";
  if (typeof v === "boolean") return v ? "Ja" : "Nein";
  switch (f) {
    case "int":
      return typeof v === "number" ? nf0.format(v) : String(v);
    case "dec":
      return typeof v === "number" ? nf1.format(v) : String(v);
    case "pct":
      return typeof v === "number" ? `${nf1.format(v * 100)} %` : String(v);
    case "chf": // Werte in Micros
      return typeof v === "number" ? nfChf.format(v / 1_000_000) : String(v);
    case "datetime":
      return dtf.format(new Date(String(v)));
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v).split("-").reverse().join(".") : df.format(new Date(String(v)));
    default:
      return String(v);
  }
}

const BADGE: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  blue: "bg-brand-50 text-brand-700 border-brand-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  red: "bg-rose-50 text-rose-700 border-rose-100",
  gray: "bg-neutral-50 text-neutral-600 border-neutral-200",
};

export function DataTable({
  columns,
  rows,
  searchKeys,
  defaultSort,
  empty = "Keine Daten verfügbar",
  pageSize = 50,
  totals,
}: {
  columns: Column[];
  rows: Row[];
  searchKeys?: string[];
  defaultSort?: { key: string; dir: "asc" | "desc" };
  empty?: string;
  pageSize?: number;
  /** Summenzeile (bereits berechnet; Schluessel wie Spalten) */
  totals?: Row;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(defaultSort ?? null);
  const [limit, setLimit] = useState(pageSize);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let out = rows;
    if (s && searchKeys?.length) out = out.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s)));
    if (sort) {
      out = [...out].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "de-CH");
        return sort.dir === "asc" ? c : -c;
      });
    }
    return out;
  }, [rows, q, sort, searchKeys]);

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  return (
    <div className="space-y-2">
      {searchKeys?.length ? (
        <div className="flex items-center justify-between gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen…"
            aria-label="Tabelle durchsuchen"
            className="h-8 w-full max-w-xs rounded-md border border-neutral-200 bg-white px-2.5 text-xs"
          />
          <span className="shrink-0 text-[11px] text-neutral-400">{nf0.format(filtered.length)} Einträge</span>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[560px] text-xs">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              {columns.map((c) => {
                const right = c.align === "right" || (c.format && !["text", "badge", "datetime", "date"].includes(c.format));
                return (
                  <th key={c.key} scope="col" title={c.title} className={cn("whitespace-nowrap px-3 py-2 font-medium", right ? "text-right" : "text-left", c.hideSm && "hidden md:table-cell")}>
                    <button type="button" onClick={() => toggle(c.key)} className={cn("inline-flex items-center gap-1 hover:text-neutral-800", right && "flex-row-reverse")}>
                      {c.label}
                      {sort?.key === c.key ? sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-neutral-500">
                  {empty}
                </td>
              </tr>
            ) : (
              filtered.slice(0, limit).map((r, i) => (
                <tr key={String(r.id ?? i)} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                  {columns.map((c) => {
                    const right = c.align === "right" || (c.format && !["text", "badge", "datetime", "date"].includes(c.format));
                    const text = formatCell(r[c.key], c.format);
                    const href = c.hrefKey ? (r[c.hrefKey] as string | null | undefined) : null;
                    let content: React.ReactNode = text;
                    if (c.format === "badge" && r[c.key]) {
                      const color = String(r[`${c.key}_color`] ?? "gray");
                      content = <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium", BADGE[color] ?? BADGE.gray)}>{text}</span>;
                    }
                    if (href) content = <Link href={href} className="font-medium text-neutral-900 hover:text-brand-700 hover:underline">{content}</Link>;
                    return (
                      <td key={c.key} className={cn("max-w-[280px] truncate px-3 py-2 text-neutral-700", right && "text-right tabular-nums", c.hideSm && "hidden md:table-cell")} title={text.length > 40 ? text : undefined}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          {totals && filtered.length > 0 ? (
            <tfoot className="border-t border-neutral-200 bg-neutral-50 font-medium">
              <tr>
                {columns.map((c) => {
                  const right = c.align === "right" || (c.format && !["text", "badge", "datetime", "date"].includes(c.format));
                  return (
                    <td key={c.key} className={cn("px-3 py-2 text-neutral-900", right && "text-right tabular-nums", c.hideSm && "hidden md:table-cell")}>
                      {totals[c.key] !== undefined ? formatCell(totals[c.key], c.format) : ""}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {filtered.length > limit ? (
        <button type="button" onClick={() => setLimit((l) => l + pageSize)} className="text-xs font-medium text-brand-700 hover:underline">
          Weitere {Math.min(pageSize, filtered.length - limit)} anzeigen
        </button>
      ) : null}
    </div>
  );
}
