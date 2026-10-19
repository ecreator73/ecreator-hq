"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileBarChart } from "lucide-react";
import type { ClientLeadSummary } from "@/server/services/client-leads.service";
import { CLIENT_LEAD_GROUPS, GROUP_LABEL } from "@/lib/client-lead-status";
import { saveStatusMapAction } from "@/app/(app)/clients/crm-actions";
import { cn } from "@/lib/utils";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "–");
const MONTH = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const df = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "2-digit" });

function hours(h: number | null) {
  if (h == null) return "–";
  if (h < 1) return `${Math.round(h * 60)} Min.`;
  if (h < 48) return `${h.toFixed(1)} Std.`;
  return `${(h / 24).toFixed(1)} Tage`;
}

export function ClientLeadsTab({ clientId, summary, statusMap }: { clientId: string; summary: ClientLeadSummary; statusMap: Record<string, string> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [map, setMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const r of summary.rawStatuses) m[r.raw] = statusMap[r.raw] ?? r.group;
    return m;
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const s = summary;
  const g = s.byGroup;
  const maxMonth = Math.max(1, ...s.months.map((m) => m.total));
  const recent = useMemo(() => (filter ? s.recent.filter((r) => r.status === filter) : s.recent), [s.recent, filter]);

  if (s.total === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-10 text-center text-sm text-neutral-500">
        Für diesen Kunden sind keine Kampagnen-Leads verknüpft.
      </p>
    );
  }

  const Tile = ({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: string }) => (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone ?? "text-neutral-900")}>{value}</p>
      {sub ? <p className="text-xs text-neutral-400">{sub}</p> : null}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">Leads aus den Kampagnen für diesen Kunden (aus dem Kunden-CRM übernommen).</p>
        <Link href={`/clients/${clientId}/bericht`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800">
          <FileBarChart className="h-4 w-4" aria-hidden /> Monatsbericht
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Leads gesamt" value={s.total.toLocaleString("de-CH")} sub={`7 T.: ${s.last7} · 30 T.: ${s.last30} · 90 T.: ${s.last90}`} />
        <Tile label="Termine" value={g.hot ?? 0} sub={`Termin-Quote ${pct((g.hot ?? 0) + (g.won ?? 0), s.total)}`} />
        <Tile label="Gewonnen" value={g.won ?? 0} sub={`Abschluss-Quote ${pct(g.won ?? 0, s.total)}`} tone="text-emerald-700" />
        <Tile label="Offen" value={g.neu ?? 0} sub="noch ohne Ergebnis" tone={(g.neu ?? 0) > 0 ? "text-amber-700" : undefined} />
        <Tile label="Bearbeitung (Median)" value={hours(s.medianHoursToWork)} sub={s.within24h != null ? `${Math.round(s.within24h * 100)} % innert 24 Std.` : undefined} />
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Verteilung</h3>
        <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={CLIENT_LEAD_GROUPS.map((x) => `${x.label} ${g[x.key] ?? 0}`).join(", ")}>
          {CLIENT_LEAD_GROUPS.map((x) => (g[x.key] ? <span key={x.key} className={x.tone} style={{ flexGrow: g[x.key], flexBasis: 0 }} title={`${x.label}: ${g[x.key]}`} /> : null))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-neutral-600">
          {CLIENT_LEAD_GROUPS.map((x) => (
            <li key={x.key}>
              <button type="button" onClick={() => setFilter(filter === x.key ? "" : x.key)} className={cn("inline-flex items-center gap-1.5 hover:text-neutral-900", filter === x.key && "font-semibold text-neutral-900")}>
                <span className={cn("h-2.5 w-2.5 rounded-sm", x.tone)} aria-hidden />
                {x.label} <span className="tabular-nums text-neutral-400">{g[x.key] ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Leads pro Monat</h3>
          <div className="flex h-40 items-end gap-2">
            {s.months.map((m) => (
              <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-neutral-500">{m.total}</span>
                <div className="flex w-full flex-col-reverse overflow-hidden rounded-t" style={{ height: `${(m.total / maxMonth) * 120}px` }} title={`${m.month}: ${m.total}`}>
                  {CLIENT_LEAD_GROUPS.map((x) => (m.byGroup[x.key] ? <span key={x.key} className={x.tone} style={{ height: `${(m.byGroup[x.key]! / m.total) * 100}%` }} /> : null))}
                </div>
                <span className="text-[10px] text-neutral-500">{MONTH[Number(m.month.slice(5, 7)) - 1]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Kampagnen</h3>
          <div className="max-h-56 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-[11px] uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="py-1.5">Kampagne</th>
                  <th className="py-1.5 text-right">Leads</th>
                  <th className="py-1.5 text-right">Termin</th>
                  <th className="py-1.5 text-right">Gewonnen</th>
                  <th className="py-1.5 text-right">Falsch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 tabular-nums">
                {s.campaigns.map((c) => (
                  <tr key={c.campaign}>
                    <td className="max-w-[200px] truncate py-1.5 text-neutral-800" title={c.campaign}>
                      {c.campaign}
                    </td>
                    <td className="py-1.5 text-right">{c.total}</td>
                    <td className="py-1.5 text-right">{c.hot}</td>
                    <td className="py-1.5 text-right">{c.won}</td>
                    <td className="py-1.5 text-right">{c.wrong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Status-Zuordnung</h3>
            <p className="text-xs text-neutral-500">Jeder Status aus dem Kunden-CRM zählt in eine Gruppe. Die Zuordnung gilt für diesen Kunden und den Monatsbericht.</p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveStatusMapAction(clientId, map);
                setMsg(r.ok ? r.message ?? "Gespeichert" : r.error);
                if (r.ok) router.refresh();
              })
            }
            className="h-8 rounded-lg bg-brand-600 px-3 text-xs font-medium text-white disabled:opacity-50"
          >
            {pending ? "Speichert…" : "Zuordnung speichern"}
          </button>
        </div>
        {msg ? <p className="mb-2 text-xs text-neutral-600" role="status">{msg}</p> : null}
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {s.rawStatuses.map((r) => (
            <label key={r.raw} className="flex items-center justify-between gap-3 border-b border-neutral-50 py-1 text-sm">
              <span className="min-w-0 truncate text-neutral-700" title={r.raw}>
                {r.raw} <span className="text-xs tabular-nums text-neutral-400">({r.count})</span>
              </span>
              <select value={map[r.raw] ?? r.group} onChange={(e) => setMap((m) => ({ ...m, [r.raw]: e.target.value }))} className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-xs">
                {CLIENT_LEAD_GROUPS.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-neutral-900">Neueste Leads {filter ? `· ${GROUP_LABEL[filter]}` : ""}</h3>
          {filter ? (
            <button type="button" onClick={() => setFilter("")} className="text-xs text-brand-700 hover:underline">
              Alle zeigen
            </button>
          ) : null}
        </div>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-y border-neutral-100 text-left text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-3 py-2">Kontakt</th>
              <th className="px-3 py-2">Kampagne</th>
              <th className="px-3 py-2">Status (Kunden-CRM)</th>
              <th className="px-3 py-2">Gruppe</th>
              <th className="px-3 py-2">Eingang</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {recent.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-neutral-900">{r.name ?? "–"}</td>
                <td className="px-3 py-2 text-xs text-neutral-600">{[r.email, r.phone].filter(Boolean).join(" · ") || "–"}</td>
                <td className="max-w-[180px] truncate px-3 py-2 text-xs text-neutral-600">{r.campaign_name ?? "–"}</td>
                <td className="px-3 py-2 text-xs text-neutral-600">{r.status_raw ?? "–"}</td>
                <td className="px-3 py-2 text-xs">{GROUP_LABEL[r.status]}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-500">{df.format(new Date(r.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {s.total > 100 ? <p className="px-4 py-2 text-xs text-neutral-500">Die neuesten 100 von {s.total.toLocaleString("de-CH")} Leads. Der Monatsbericht wertet alle aus.</p> : null}
      </section>
    </div>
  );
}
