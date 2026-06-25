"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
} from "lucide-react";
import { cn, formatCHF } from "@/lib/utils";
import { parseChfToRappen, rappenToInput } from "@/lib/finance";
import type { MonthlyEntry } from "@/types/entities";
import type { MonthOverviewRow } from "@/server/services/monthly-financials.service";
import {
  createMonthlyEntryAction,
  updateMonthlyEntryAction,
  deleteMonthlyEntryAction,
  copyPreviousMonthAction,
} from "@/app/(app)/finance/actions";

type Kind = "revenue" | "cost";

interface MonthlyTableProps {
  month: string; // YYYY-MM-01
  monthLabel: string;
  prevMonthParam: string;
  nextMonthParam: string;
  prevMonthDate: string;
  entries: MonthlyEntry[];
  overview: MonthOverviewRow[];
  year: number;
  loadError: boolean;
}

const inputClass =
  "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-neutral-900 hover:border-neutral-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100";

export function MonthlyTable({
  month,
  monthLabel,
  prevMonthParam,
  nextMonthParam,
  prevMonthDate,
  entries,
  overview,
  year,
  loadError,
}: MonthlyTableProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const revenues = entries.filter((e) => e.kind === "revenue");
  const costs = entries.filter((e) => e.kind === "cost");
  const revenueTotal = revenues.reduce((s, e) => s + (e.amount ?? 0), 0);
  const costTotal = costs.reduce((s, e) => s + (e.amount ?? 0), 0);
  const profit = revenueTotal - costTotal;
  const margin = revenueTotal > 0 ? Math.round((profit / revenueTotal) * 100) : 0;

  function copyPrev() {
    setError(null);
    start(async () => {
      const r = await copyPreviousMonthAction(prevMonthDate, month);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Monats-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={`/finance/monthly?month=${prevMonthParam}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[10rem] text-center text-base font-semibold text-neutral-900">
            {monthLabel}
          </span>
          <Link
            href={`/finance/monthly?month=${nextMonthParam}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50"
            aria-label="Naechster Monat"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <button
          type="button"
          onClick={copyPrev}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Posten aus Vormonat uebernehmen
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Die Tabelle <code>monthly_financials</code> ist in der Datenbank noch
          nicht vorhanden. Fuehre die Migration <code>0018</code> aus, danach
          funktioniert die Monatsuebersicht.
        </p>
      ) : null}

      {/* Summen */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Umsatz" value={revenueTotal} tone="green" />
        <SummaryTile label="Kosten" value={costTotal} tone="red" />
        <SummaryTile
          label={`Gewinn${revenueTotal > 0 ? ` · Marge ${margin}%` : ""}`}
          value={profit}
          tone={profit >= 0 ? "brand" : "red"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EntrySection
          kind="revenue"
          title="Umsaetze"
          accent="green"
          month={month}
          entries={revenues}
          total={revenueTotal}
          onError={setError}
        />
        <EntrySection
          kind="cost"
          title="Kosten"
          accent="red"
          month={month}
          entries={costs}
          total={costTotal}
          onError={setError}
        />
      </div>

      <YearOverview overview={overview} year={year} currentMonth={month} />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "brand";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-red-600"
        : "text-brand-700";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", toneClass)}>
        {formatCHF(value)}
      </p>
    </div>
  );
}

function EntrySection({
  kind,
  title,
  accent,
  month,
  entries,
  total,
  onError,
}: {
  kind: Kind;
  title: string;
  accent: "green" | "red";
  month: string;
  entries: MonthlyEntry[];
  total: number;
  onError: (msg: string | null) => void;
}) {
  const dot = accent === "green" ? "bg-emerald-500" : "bg-red-500";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <span className={cn("h-2 w-2 rounded-full", dot)} />
          {title}
          <span className="text-neutral-400">({entries.length})</span>
        </h3>
        <span className="text-sm font-semibold tabular-nums text-neutral-700">
          {formatCHF(total)}
        </span>
      </div>

      <div className="divide-y divide-neutral-100">
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-neutral-400">
            Noch keine Posten. Unten hinzufuegen.
          </p>
        ) : (
          entries.map((e) => (
            <EntryRow key={e.id} entry={e} onError={onError} />
          ))
        )}
      </div>

      <AddRow kind={kind} month={month} onError={onError} />
    </div>
  );
}

function EntryRow({
  entry,
  onError,
}: {
  entry: MonthlyEntry;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(entry.label);
  const [amountStr, setAmountStr] = useState(rappenToInput(entry.amount));
  const [pending, start] = useTransition();

  function commit() {
    const trimmed = label.trim();
    const amount = parseChfToRappen(amountStr);
    const labelChanged = trimmed && trimmed !== entry.label;
    const amountChanged = amount !== entry.amount;
    if (!trimmed) {
      setLabel(entry.label); // leeres Label nicht erlauben -> zuruecksetzen
      return;
    }
    if (!labelChanged && !amountChanged) return;
    onError(null);
    start(async () => {
      const r = await updateMonthlyEntryAction(entry.id, {
        label: trimmed,
        amount,
      });
      if (!r.ok) {
        onError(r.error);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    onError(null);
    start(async () => {
      const r = await deleteMonthlyEntryAction(entry.id);
      if (!r.ok) {
        onError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commit}
        className={cn(inputClass, "flex-1")}
        placeholder="Bezeichnung"
      />
      <input
        value={amountStr}
        onChange={(e) => setAmountStr(e.target.value)}
        onBlur={commit}
        inputMode="decimal"
        className={cn(inputClass, "w-28 text-right tabular-nums")}
        placeholder="0"
      />
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        aria-label="Posten loeschen"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function AddRow({
  kind,
  month,
  onError,
}: {
  kind: Kind;
  month: string;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [pending, start] = useTransition();

  function add() {
    const trimmed = label.trim();
    if (!trimmed) return;
    onError(null);
    start(async () => {
      const r = await createMonthlyEntryAction({
        month,
        kind,
        label: trimmed,
        amount: parseChfToRappen(amountStr),
      });
      if (!r.ok) {
        onError(r.error);
        return;
      }
      setLabel("");
      setAmountStr("");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 border-t border-neutral-100 bg-neutral-50/60 px-2 py-1.5">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        className={cn(inputClass, "flex-1 bg-white")}
        placeholder={kind === "revenue" ? "Umsatz hinzufuegen…" : "Kosten hinzufuegen…"}
      />
      <input
        value={amountStr}
        onChange={(e) => setAmountStr(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        inputMode="decimal"
        className={cn(inputClass, "w-28 bg-white text-right tabular-nums")}
        placeholder="0"
      />
      <button
        type="button"
        onClick={add}
        disabled={pending || !label.trim()}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
        aria-label="Hinzufuegen"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function YearOverview({
  overview,
  year,
  currentMonth,
}: {
  overview: MonthOverviewRow[];
  year: number;
  currentMonth: string;
}) {
  const fmtMonth = (m: string) =>
    new Intl.DateTimeFormat("de-CH", { month: "long" }).format(
      new Date(`${m}T00:00:00`),
    );
  const totals = overview.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      cost: acc.cost + r.cost,
      profit: acc.profit + r.profit,
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          Jahresuebersicht {year}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-2 font-medium">Monat</th>
              <th className="px-4 py-2 text-right font-medium">Umsatz</th>
              <th className="px-4 py-2 text-right font-medium">Kosten</th>
              <th className="px-4 py-2 text-right font-medium">Gewinn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {overview.map((r) => {
              const isCurrent = r.month === currentMonth;
              const empty = r.revenue === 0 && r.cost === 0;
              return (
                <tr
                  key={r.month}
                  className={cn(
                    "transition-colors",
                    isCurrent ? "bg-brand-50/60" : "hover:bg-neutral-50",
                  )}
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/finance/monthly?month=${r.month.slice(0, 7)}`}
                      className={cn(
                        "font-medium capitalize",
                        isCurrent ? "text-brand-700" : "text-neutral-700 hover:text-brand-700",
                      )}
                    >
                      {fmtMonth(r.month)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-600">
                    {empty ? "–" : formatCHF(r.revenue)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-600">
                    {empty ? "–" : formatCHF(r.cost)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right font-medium tabular-nums",
                      empty
                        ? "text-neutral-300"
                        : r.profit >= 0
                          ? "text-emerald-600"
                          : "text-red-600",
                    )}
                  >
                    {empty ? "–" : formatCHF(r.profit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold">
              <td className="px-4 py-2.5 text-neutral-900">Gesamt {year}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-neutral-900">
                {formatCHF(totals.revenue)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-neutral-900">
                {formatCHF(totals.cost)}
              </td>
              <td
                className={cn(
                  "px-4 py-2.5 text-right tabular-nums",
                  totals.profit >= 0 ? "text-emerald-600" : "text-red-600",
                )}
              >
                {formatCHF(totals.profit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
