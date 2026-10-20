"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Search } from "lucide-react";
import type { BillingInvoice } from "@/server/services/billing.service";
import { createMonthlyInvoicesAction, createSingleInvoiceAction, releaseInvoicesAction } from "@/app/(app)/finance/billing-actions";
import { StatusBadge } from "@/components/tasks/status-badge";
import { INVOICE_STATUSES, statusLabel } from "@/config/catalog";
import { formatCHFExact, cn } from "@/lib/utils";

type Row = BillingInvoice & { effective: string };
const chDate = (d: string | null | undefined) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(2, 4)}` : "–");
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const periodLabel = (d: string | null) => (d ? `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : "–");
const FILTERS = [
  { key: "all", label: "Alle" },
  { key: "draft", label: "Entwürfe" },
  { key: "open", label: "Offen" },
  { key: "overdue", label: "Überfällig" },
  { key: "paid", label: "Bezahlt" },
  { key: "cancelled", label: "Storniert" },
] as const;
const input = "h-9 rounded-lg border border-neutral-200 bg-white px-2.5 text-sm";

function nextPeriod() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function InvoiceList({ invoices, clients, initialFilter }: { invoices: Row[]; clients: Array<{ id: string; name: string }>; initialFilter?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<string>(FILTERS.some((f) => f.key === initialFilter) ? initialFilter! : "all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [gen, setGen] = useState<{ period: string; issue: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [single, setSingle] = useState<{ client: string; title: string } | null>(null);

  const count = (k: string) => invoices.filter((i) => i.effective === k).length;
  const sum = (k: string, field: "total" | "open") => invoices.filter((i) => i.effective === k).reduce((s, i) => s + (field === "total" ? i.total : i.total - i.paid), 0);
  const month = new Date().toISOString().slice(0, 7);
  const paidThisMonth = invoices.filter((i) => i.status === "paid" && i.paid_date?.startsWith(month)).reduce((s, i) => s + i.total, 0);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return invoices.filter((i) => (filter === "all" || i.effective === filter) && (!t || [i.invoice_number, i.client?.name, i.title].some((v) => v?.toLowerCase().includes(t))));
  }, [invoices, filter, q]);
  const drafts = list.filter((i) => i.status === "draft");
  const allDrafts = drafts.length > 0 && drafts.every((d) => sel.has(d.id));

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? r.message ?? null : r.error ?? "Fehler");
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "Entwürfe", v: count("draft"), s: formatCHFExact(sum("draft", "total")) + " zur Freigabe", t: count("draft") ? "text-amber-700" : undefined },
          { l: "Offen", v: formatCHFExact(sum("open", "open")), s: `${count("open")} Rechnungen` },
          { l: "Überfällig", v: formatCHFExact(sum("overdue", "open")), s: `${count("overdue")} Rechnungen`, t: count("overdue") ? "text-rose-700" : undefined },
          { l: "Eingegangen diesen Monat", v: formatCHFExact(paidThisMonth), s: "bezahlte Rechnungen", t: "text-emerald-700" },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">{k.l}</p>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums text-neutral-900", k.t)}>{k.v}</p>
            <p className="text-xs text-neutral-400">{k.s}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white p-0.5" role="tablist" aria-label="Status">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={cn("rounded-md px-3 py-1.5 text-sm", filter === f.key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50")}>
              {f.label}
              {f.key !== "all" ? <span className={cn("ml-1 tabular-nums", filter === f.key ? "text-neutral-300" : "text-neutral-400")}>{count(f.key)}</span> : null}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Rechnungen durchsuchen</span>
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nummer oder Kunde" className={cn(input, "w-48 pl-8")} />
          </label>
          <button type="button" onClick={() => setSingle(single ? null : { client: "", title: "" })} className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 hover:bg-neutral-50">
            Einzelrechnung
          </button>
          <button type="button" onClick={() => setGen(gen ? null : { period: nextPeriod(), issue: new Date().toISOString().slice(0, 10) })} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700">
            <FilePlus2 className="h-4 w-4" aria-hidden /> Monatsrechnungen erstellen
          </button>
        </div>
      </div>

      {gen ? (
        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-200 bg-brand-50/30 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createMonthlyInvoicesAction(gen.period, gen.issue), () => {
              setGen(null);
              setFilter("draft");
            });
          }}
        >
          <p className="w-full text-sm text-neutral-700">Erstellt pro aktivem Vertrag einen Entwurf mit den wiederkehrenden Positionen. Bereits verrechnete Verträge werden übersprungen. Es wird nichts versendet.</p>
          <label className="text-xs text-neutral-600">
            Periode
            <input type="month" value={gen.period} onChange={(e) => setGen({ ...gen, period: e.target.value })} className={cn(input, "block")} required />
          </label>
          <label className="text-xs text-neutral-600">
            Rechnungsdatum
            <input type="date" value={gen.issue} onChange={(e) => setGen({ ...gen, issue: e.target.value })} className={cn(input, "block")} required />
          </label>
          <button type="submit" disabled={pending} className="h-9 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50">
            {pending ? "Erstellt…" : "Entwürfe erstellen"}
          </button>
          <button type="button" onClick={() => setGen(null)} className="h-9 rounded-lg px-3 text-sm text-neutral-600 hover:bg-neutral-100">
            Abbrechen
          </button>
        </form>
      ) : null}

      {single ? (
        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createSingleInvoiceAction(single.client, single.title);
              if (r.ok) router.push(`/finance/invoices/${r.id}`);
              else setMsg(r.error);
            });
          }}
        >
          <label className="text-xs text-neutral-600">
            Kunde
            <select required value={single.client} onChange={(e) => setSingle({ ...single, client: e.target.value })} className={cn(input, "block w-60")}>
              <option value="">Kunde wählen…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="min-w-[14rem] flex-1 text-xs text-neutral-600">
            Bezeichnung
            <input required placeholder="z. B. Content Day Oktober" value={single.title} onChange={(e) => setSingle({ ...single, title: e.target.value })} className={cn(input, "block w-full")} />
          </label>
          <button type="submit" disabled={pending} className="h-9 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50">
            Entwurf anlegen
          </button>
          <button type="button" onClick={() => setSingle(null)} className="h-9 rounded-lg px-3 text-sm text-neutral-600 hover:bg-neutral-100">
            Abbrechen
          </button>
        </form>
      ) : null}

      {msg ? <p className="text-sm text-neutral-700" role="status">{msg}</p> : null}

      {sel.size ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
          <span className="font-medium text-emerald-900">{sel.size} Entwürfe ausgewählt</span>
          <button type="button" disabled={pending} onClick={() => run(() => releaseInvoicesAction([...sel]), () => setSel(new Set()))} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            Freigeben
          </button>
          <button type="button" onClick={() => setSel(new Set())} className="text-xs text-emerald-900 hover:underline">
            Auswahl aufheben
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" aria-label="Alle Entwürfe auswählen" checked={allDrafts} disabled={!drafts.length} onChange={() => setSel(allDrafts ? new Set() : new Set(drafts.map((d) => d.id)))} />
              </th>
              <th className="px-3 py-2.5">Nummer</th>
              <th className="px-3 py-2.5">Kunde</th>
              <th className="px-3 py-2.5">Periode</th>
              <th className="px-3 py-2.5">Datum</th>
              <th className="px-3 py-2.5">Fällig</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5 text-right">Offen</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {list.map((i) => {
              const open = i.status === "cancelled" || i.status === "draft" ? null : i.total - i.paid;
              return (
                <tr key={i.id} className="hover:bg-neutral-50/70">
                  <td className="px-4 py-2.5">
                    {i.status === "draft" ? (
                      <input
                        type="checkbox"
                        aria-label={`${i.invoice_number ?? "Entwurf"} auswählen`}
                        checked={sel.has(i.id)}
                        onChange={() =>
                          setSel((s) => {
                            const n = new Set(s);
                            if (n.has(i.id)) n.delete(i.id);
                            else n.add(i.id);
                            return n;
                          })
                        }
                      />
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/finance/invoices/${i.id}`} className="font-medium tabular-nums text-neutral-900 hover:text-brand-700">
                      {i.invoice_number ?? "Entwurf"}
                    </Link>
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 text-neutral-700">{i.client?.name ?? "–"}</td>
                  <td className="px-3 py-2.5 text-neutral-600">{periodLabel(i.period_from)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-neutral-600">{chDate(i.issue_date)}</td>
                  <td className={cn("px-3 py-2.5 tabular-nums", i.effective === "overdue" ? "font-medium text-rose-700" : "text-neutral-600")}>{chDate(i.due_date)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-900">{formatCHFExact(i.total)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">{open == null ? "–" : open > 0 ? formatCHFExact(open) : "–"}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge label={statusLabel("invoice", i.effective)} color={INVOICE_STATUSES.find((s) => s.key === i.effective)?.color} />
                    {i.reminder_stage ? <span className="ml-1.5 text-[11px] text-amber-700">M{i.reminder_stage}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-500">Keine Rechnungen in dieser Ansicht.</p> : null}
      </div>
    </div>
  );
}
