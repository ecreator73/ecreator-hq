"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { bookBankEntriesAction } from "@/app/(app)/finance/billing-actions";
import { formatCHFExact, cn } from "@/lib/utils";

/**
 * Kontoauszug abgleichen: camt.053 / camt.054 (XML aus dem E-Banking) wird im
 * Browser gelesen. Gutschriften mit QR-Referenz werden den Rechnungen zugeordnet.
 * Die Datei verlaesst den Browser nicht; uebermittelt werden nur Referenz,
 * Betrag, Datum und Buchungs-ID der passenden Gutschriften.
 */

type Entry = { id: string; reference: string; amount: number; date: string };
type Known = { ref: string; number: string; open: number };

const byName = (el: Element | Document, name: string) => Array.from(el.getElementsByTagNameNS("*", name));
const first = (el: Element, path: string[]): Element | null => {
  let cur: Element | null = el;
  for (const p of path) {
    cur = cur ? (Array.from(cur.children).find((c) => c.localName === p) ?? null) : null;
  }
  return cur;
};
const text = (el: Element | null) => el?.textContent?.trim() ?? "";

export function parseCamt(xml: string): { entries: Entry[]; credits: number; withoutRef: number } {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Datei ist kein gültiges XML");
  const entries: Entry[] = [];
  let credits = 0;
  let withoutRef = 0;
  for (const ntry of byName(doc, "Ntry")) {
    if (text(first(ntry, ["CdtDbtInd"])) !== "CRDT") continue;
    if (text(first(ntry, ["RvslInd"])) === "true") continue;
    const date = (text(first(ntry, ["BookgDt", "Dt"])) || text(first(ntry, ["BookgDt", "DtTm"])) || text(first(ntry, ["ValDt", "Dt"]))).slice(0, 10);
    const ntryRef = text(first(ntry, ["AcctSvcrRef"])) || `${date}-${text(first(ntry, ["Amt"]))}`;
    const txs = byName(ntry, "TxDtls");
    const list = txs.length ? txs : [ntry];
    list.forEach((tx, idx) => {
      credits++;
      const ref = byName(tx, "CdtrRefInf").map((c) => text(first(c, ["Ref"]))).find(Boolean)?.replace(/\s/g, "") ?? "";
      const amt = text(first(tx, ["Amt"])) || text(first(tx, ["AmtDtls", "TxAmt", "Amt"])) || text(first(ntry, ["Amt"]));
      if (!/^\d{27}$/.test(ref)) {
        withoutRef++;
        return;
      }
      const txRef = text(first(tx, ["Refs", "AcctSvcrRef"]));
      entries.push({ id: txRef || `${ntryRef}#${idx}`, reference: ref, amount: Math.round(Number(amt) * 100), date });
    });
  }
  return { entries, credits, withoutRef };
}

export function BankImport({ known }: { known: Known[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [parsed, setParsed] = useState<{ name: string; entries: Entry[]; credits: number; withoutRef: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const byRef = new Map(known.map((k) => [k.ref, k]));
  const matched = parsed?.entries.filter((e) => byRef.has(e.reference)) ?? [];

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Zahlungseingänge aus dem Kontoauszug</h2>
          <p className="mt-0.5 max-w-xl text-xs text-neutral-500">
            camt.053- oder camt.054-Datei aus dem E-Banking (Valiant) wählen. Gutschriften mit QR-Referenz werden der passenden Rechnung zugeordnet, bereits verbuchte nicht doppelt. Die Datei bleibt auf deinem Gerät.
          </p>
        </div>
        <label className={cn("inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-sm text-neutral-700 hover:bg-neutral-50", pending && "pointer-events-none opacity-50")}>
          <Upload className="h-4 w-4" aria-hidden /> Datei wählen
          <input
            type="file"
            accept=".xml,application/xml,text/xml"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setMsg(null);
              try {
                const r = parseCamt(await f.text());
                setParsed({ name: f.name, ...r });
              } catch (err) {
                setParsed(null);
                setMsg(err instanceof Error ? err.message : "Datei konnte nicht gelesen werden");
              }
            }}
          />
        </label>
      </div>
      {msg ? <p className="mt-3 text-sm text-neutral-700" role="status">{msg}</p> : null}
      {parsed ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-neutral-700">
            <strong>{parsed.name}</strong>: {parsed.credits} Gutschriften, davon {parsed.entries.length} mit QR-Referenz, <strong>{matched.length}</strong> passend zu Rechnungen
            {parsed.withoutRef ? `, ${parsed.withoutRef} ohne QR-Referenz (bitte manuell erfassen)` : ""}.
          </p>
          {matched.length ? (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 text-sm">
              {matched.map((e) => {
                const k = byRef.get(e.reference)!;
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <span className="w-24 tabular-nums text-neutral-600">{e.date.split("-").reverse().join(".")}</span>
                    <span className="font-medium tabular-nums">{k.number}</span>
                    <span className="ml-auto tabular-nums">{formatCHFExact(e.amount)}</span>
                    {e.amount !== k.open ? <span className="text-xs text-amber-700">offen waren {formatCHFExact(k.open)}</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !matched.length}
              onClick={() =>
                start(async () => {
                  const r = await bookBankEntriesAction(matched);
                  setMsg(r.ok ? r.message ?? "Verbucht" : r.error);
                  if (r.ok) {
                    setParsed(null);
                    router.refresh();
                  }
                })
              }
              className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {matched.length} Zahlungen verbuchen
            </button>
            <button type="button" onClick={() => setParsed(null)} className="h-9 rounded-lg px-3 text-sm text-neutral-600 hover:bg-neutral-100">
              Verwerfen
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
