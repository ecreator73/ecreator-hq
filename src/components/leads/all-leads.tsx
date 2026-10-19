"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Search } from "lucide-react";
import type { WorkLead } from "@/server/services/lead-work.service";
import { OwnerSelect, StatusSelect } from "./inline-selects";
import { bulkUpdateLeadsAction } from "@/app/(app)/leads/actions";
import { LEAD_SOURCE_LABELS, LEAD_STATUSES } from "@/config/catalog";
import { cn } from "@/lib/utils";

const sourceLabel = (s: string | null) => (s ? (LEAD_SOURCE_LABELS as Record<string, string>)[s] ?? s : "–");
const df = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric" });

function csv(rows: WorkLead[]): string {
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["Name", "Firma", "E-Mail", "Telefon", "Quelle", "Kampagne", "Leistung", "Status", "Zuständig", "Nächster Schritt", "Datum", "Erstellt"];
  const body = rows.map((l) => [l.name, l.company, l.email, l.phone, sourceLabel(l.source), l.campaign, l.dienstleistung, l.status?.label, l.owner, l.nextAction, l.nextActionDate, l.createdAt.slice(0, 10)]);
  return "﻿" + [head, ...body].map((r) => r.map(cell).join(";")).join("\r\n");
}

export function AllLeads({ leads, members }: { leads: WorkLead[]; members: Array<{ id: string; full_name: string | null }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const [owner, setOwner] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkOwner, setBulkOwner] = useState("__keep");
  const [msg, setMsg] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);

  const campaigns = useMemo(() => [...new Set(leads.map((l) => l.campaign).filter(Boolean) as string[])].sort(), [leads]);
  const sources = useMemo(() => [...new Set(leads.map((l) => l.source).filter(Boolean) as string[])].sort(), [leads]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (status && l.status?.key !== status) return false;
      if (source && l.source !== source) return false;
      if (campaign && (l.campaign ?? "") !== campaign) return false;
      if (owner === "none" ? l.ownerId : owner && l.ownerId !== owner) return false;
      if (s && ![l.name, l.company, l.email, l.phone, l.campaign, l.dienstleistung].some((v) => v?.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [leads, q, status, source, campaign, owner]);

  const visible = rows.slice(0, limit);
  const allPicked = visible.length > 0 && visible.every((l) => picked.has(l.id));
  const toggle = (id: string) => setPicked((p) => (p.has(id) ? new Set([...p].filter((x) => x !== id)) : new Set([...p, id])));

  const applyBulk = () =>
    start(async () => {
      const r = await bulkUpdateLeadsAction({
        ids: [...picked],
        statusKey: bulkStatus || undefined,
        ownerId: bulkOwner === "__keep" ? undefined : bulkOwner || null,
      });
      setMsg(r.ok ? r.message ?? "Gespeichert" : r.error);
      if (r.ok) {
        setPicked(new Set());
        setBulkStatus("");
        setBulkOwner("__keep");
        router.refresh();
      }
    });

  const download = () => {
    const url = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sel = "h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-700";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Suchen</span>
          <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-neutral-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen…" className="h-8 w-56 rounded-lg border border-neutral-200 bg-white pl-8 pr-2 text-xs" />
        </label>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
          <option value="">Status: alle</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select aria-label="Quelle" value={source} onChange={(e) => setSource(e.target.value)} className={sel}>
          <option value="">Quelle: alle</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {sourceLabel(s)}
            </option>
          ))}
        </select>
        <select aria-label="Kampagne" value={campaign} onChange={(e) => setCampaign(e.target.value)} className={cn(sel, "max-w-[14rem]")}>
          <option value="">Kampagne: alle</option>
          {campaigns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select aria-label="Zuständig" value={owner} onChange={(e) => setOwner(e.target.value)} className={sel}>
          <option value="">Zuständig: alle</option>
          <option value="none">Nicht zugewiesen</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        <span className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
          {rows.length} Leads
          <button type="button" onClick={download} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 font-medium text-neutral-700 hover:bg-neutral-50">
            <Download className="h-3.5 w-3.5" aria-hidden /> CSV
          </button>
        </span>
      </div>

      {picked.size > 0 ? (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
          <span className="font-medium text-brand-900">{picked.size} ausgewählt</span>
          <select aria-label="Status für Auswahl" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className={sel}>
            <option value="">Status unverändert</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <select aria-label="Zuständig für Auswahl" value={bulkOwner} onChange={(e) => setBulkOwner(e.target.value)} className={sel}>
            <option value="__keep">Zuständig unverändert</option>
            <option value="">Niemand</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
          <button type="button" disabled={pending || (!bulkStatus && bulkOwner === "__keep")} onClick={applyBulk} className="h-8 rounded-lg bg-brand-600 px-3 text-xs font-medium text-white disabled:opacity-40">
            Anwenden
          </button>
          <button type="button" onClick={() => setPicked(new Set())} className="text-xs text-brand-800 hover:underline">
            Auswahl aufheben
          </button>
        </div>
      ) : null}
      {msg ? <p className="text-xs text-neutral-600" role="status">{msg}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b border-neutral-100 text-left text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Alle sichtbaren auswählen"
                  checked={allPicked}
                  onChange={() => setPicked(allPicked ? new Set() : new Set(visible.map((l) => l.id)))}
                />
              </th>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Kontakt</th>
              <th className="px-3 py-2.5">Quelle / Kampagne</th>
              <th className="px-3 py-2.5">Leistung</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Zuständig</th>
              <th className="px-3 py-2.5">Erstellt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-neutral-500">
                  Keine Leads für diese Filter.
                </td>
              </tr>
            ) : (
              visible.map((l) => (
                <tr key={l.id} className={cn("hover:bg-neutral-50/60", picked.has(l.id) && "bg-brand-50/40")}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" aria-label={`${l.name} auswählen`} checked={picked.has(l.id)} onChange={() => toggle(l.id)} />
                  </td>
                  <td className="max-w-[220px] px-3 py-2.5">
                    <Link href={`/sales/leads/${l.id}`} className="block truncate font-medium text-neutral-900 hover:text-brand-700 hover:underline">
                      {l.name}
                    </Link>
                    {l.company ? <span className="block truncate text-xs text-neutral-500">{l.company}</span> : null}
                  </td>
                  <td className="max-w-[220px] px-3 py-2.5 text-xs">
                    {l.email ? (
                      <a href={`mailto:${l.email}`} className="block truncate text-neutral-700 hover:underline">
                        {l.email}
                      </a>
                    ) : null}
                    {l.phone ? (
                      <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="block truncate text-neutral-500 hover:underline">
                        {l.phone}
                      </a>
                    ) : null}
                    {!l.email && !l.phone ? <span className="text-neutral-400">–</span> : null}
                  </td>
                  <td className="max-w-[200px] px-3 py-2.5 text-xs">
                    <span className="block text-neutral-700">{sourceLabel(l.source)}</span>
                    {l.campaign ? <span className="block truncate text-neutral-500">{l.campaign}</span> : null}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-xs text-neutral-600" title={l.dienstleistung ?? undefined}>
                    {l.dienstleistung ?? "–"}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusSelect leadId={l.id} value={l.status?.key ?? null} color={l.status?.color} />
                  </td>
                  <td className="px-3 py-2.5">
                    <OwnerSelect leadId={l.id} value={l.ownerId} members={members} fallbackName={l.owner} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-neutral-500">{df.format(new Date(l.createdAt))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > limit ? (
        <button type="button" onClick={() => setLimit((n) => n + 100)} className="text-xs font-medium text-brand-700 hover:underline">
          Weitere {Math.min(100, rows.length - limit)} anzeigen ({rows.length - limit} übrig)
        </button>
      ) : null}
    </div>
  );
}
