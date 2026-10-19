"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CalendarDays, CircleDashed, Phone, Search } from "lucide-react";
import type { WorkLead } from "@/server/services/lead-work.service";
import { CallDialog, type CallTarget } from "./call-dialog";
import { OwnerSelect, StatusSelect } from "./inline-selects";
import { outcomeLabel } from "@/lib/lead-workflow";
import { LEAD_SOURCE_LABELS, LEAD_STATUSES } from "@/config/catalog";
import { cn } from "@/lib/utils";

type Bucket = "overdue" | "today" | "planned" | "none";

const BUCKETS: Array<{ key: Bucket; label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = [
  { key: "overdue", label: "Überfällig", icon: AlertTriangle, tone: "text-rose-600" },
  { key: "today", label: "Heute", icon: CalendarClock, tone: "text-brand-600" },
  { key: "planned", label: "Geplant", icon: CalendarDays, tone: "text-neutral-500" },
  { key: "none", label: "Ohne nächsten Schritt", icon: CircleDashed, tone: "text-amber-600" },
];

const dtf = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const df = (iso: string) => iso.split("-").reverse().join(".");
const sourceLabel = (s: string | null) => (s ? (LEAD_SOURCE_LABELS as Record<string, string>)[s] ?? s : null);

export function WorkList({
  leads,
  members,
  today,
  archive = false,
  initialOwner = "",
}: {
  leads: WorkLead[];
  members: Array<{ id: string; full_name: string | null }>;
  today: string;
  archive?: boolean;
  initialOwner?: string;
}) {
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<Bucket | "">("");
  const [owner, setOwner] = useState(initialOwner);
  const [caller, setCaller] = useState("");
  const [status, setStatus] = useState("");
  const [campaign, setCampaign] = useState("");
  const [source, setSource] = useState("");
  const [limit, setLimit] = useState(100);
  const [calling, setCalling] = useState<CallTarget | null>(null);

  const campaigns = useMemo(() => [...new Set(leads.map((l) => l.campaign).filter(Boolean) as string[])].sort(), [leads]);
  const sources = useMemo(() => [...new Set(leads.map((l) => l.source).filter(Boolean) as string[])].sort(), [leads]);
  const callers = useMemo(() => [...new Set(leads.map((l) => l.lastCaller).filter(Boolean) as string[])].sort(), [leads]);

  const base = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (owner === "none" ? l.ownerId : owner && l.ownerId !== owner) return false;
      if (caller && l.lastCaller !== caller) return false;
      if (status && l.status?.key !== status) return false;
      if (campaign && (l.campaign ?? "") !== campaign) return false;
      if (source && l.source !== source) return false;
      if (s && ![l.name, l.company, l.email, l.phone, l.campaign].some((v) => v?.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [leads, q, owner, caller, status, campaign, source]);

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { overdue: 0, today: 0, planned: 0, none: 0 };
    for (const l of base) if (l.bucket !== "archive") c[l.bucket]++;
    return c;
  }, [base]);

  const rows = useMemo(() => {
    const list = bucket ? base.filter((l) => l.bucket === bucket) : base;
    const rank: Record<string, number> = { overdue: 0, today: 1, planned: 2, none: 3, archive: 4 };
    return [...list].sort(
      (a, b) =>
        rank[a.bucket]! - rank[b.bucket]! ||
        (a.nextActionDate ?? "9999").localeCompare(b.nextActionDate ?? "9999") ||
        b.createdAt.localeCompare(a.createdAt),
    );
  }, [base, bucket]);

  const filtered = Boolean(q || owner || caller || status || campaign || source || bucket);
  const sel = "h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-700";

  return (
    <div className="space-y-4">
      {!archive ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {BUCKETS.map((b) => {
            const active = bucket === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setBucket(active ? "" : b.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border bg-white p-4 text-left transition-colors",
                  active ? "border-brand-600 ring-1 ring-brand-600" : "border-neutral-200 hover:border-neutral-300",
                )}
              >
                <span className={cn("flex items-center gap-1.5 text-xs font-medium", b.tone)}>
                  <b.icon className="h-3.5 w-3.5" aria-hidden />
                  {b.label}
                </span>
                <span className="mt-1 block text-2xl font-semibold tabular-nums text-neutral-900">{counts[b.key]}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Suchen</span>
          <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-neutral-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, Firma, Telefon…" className="h-8 w-56 rounded-lg border border-neutral-200 bg-white pl-8 pr-2 text-xs" />
        </label>
        <select aria-label="Zuständig" value={owner} onChange={(e) => setOwner(e.target.value)} className={sel}>
          <option value="">Zuständig: alle</option>
          <option value="none">Nicht zugewiesen</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        <select aria-label="Angerufen von" value={caller} onChange={(e) => setCaller(e.target.value)} className={sel}>
          <option value="">Angerufen von: alle</option>
          {callers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
          <option value="">Status: alle</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
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
        <select aria-label="Quelle" value={source} onChange={(e) => setSource(e.target.value)} className={sel}>
          <option value="">Quelle: alle</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {sourceLabel(s)}
            </option>
          ))}
        </select>
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setOwner("");
              setCaller("");
              setStatus("");
              setCampaign("");
              setSource("");
              setBucket("");
            }}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Zurücksetzen
          </button>
        ) : null}
        <span className="ml-auto text-xs text-neutral-500">{rows.length} Leads</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-neutral-100 text-left text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2.5">Lead</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Zuständig</th>
              <th className="px-3 py-2.5">Letzter Kontakt</th>
              <th className="px-3 py-2.5">Ergebnis</th>
              <th className="px-3 py-2.5 text-right">Versuche</th>
              <th className="px-3 py-2.5">Nächster Schritt</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-neutral-500">
                  {filtered ? "Keine Leads für diese Filter." : archive ? "Noch keine abgeschlossenen Leads." : "Keine offenen Leads."}
                </td>
              </tr>
            ) : (
              rows.slice(0, limit).map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50/60">
                  <td className="max-w-[260px] px-4 py-2.5">
                    <Link href={`/sales/leads/${l.id}`} className="block truncate font-medium text-neutral-900 hover:text-brand-700 hover:underline">
                      {l.name}
                    </Link>
                    <span className="block truncate text-xs text-neutral-500">{[l.company, l.campaign ?? sourceLabel(l.source)].filter(Boolean).join(" · ") || "–"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusSelect leadId={l.id} value={l.status?.key ?? null} color={l.status?.color} />
                  </td>
                  <td className="px-3 py-2.5">
                    <OwnerSelect leadId={l.id} value={l.ownerId} members={members} fallbackName={l.owner} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-neutral-600">
                    {l.lastCallAt ? (
                      <>
                        {dtf.format(new Date(l.lastCallAt))}
                        {l.lastCaller ? <span className="block text-neutral-400">{l.lastCaller}</span> : null}
                      </>
                    ) : (
                      <span className="text-neutral-400">Nie</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-600">{outcomeLabel(l.lastOutcome)}</td>
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums text-neutral-600">{l.attempts}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                    {l.nextActionDate || l.nextAction ? (
                      <>
                        <span className="block text-neutral-800">{l.nextAction ?? "Nächster Schritt"}</span>
                        {l.nextActionDate ? (
                          <span className={cn(l.nextActionDate < today ? "font-medium text-rose-600" : l.nextActionDate === today ? "font-medium text-brand-700" : "text-neutral-500")}>
                            {l.nextActionDate === today ? "heute" : df(l.nextActionDate)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-amber-700">Keiner</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setCalling({ id: l.id, name: l.name, phone: l.phone, noAnswers: l.noAnswers })}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 text-xs font-medium text-neutral-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden /> Anruf
                    </button>
                  </td>
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
      <CallDialog lead={calling} onClose={() => setCalling(null)} />
    </div>
  );
}
