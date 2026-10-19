import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { clientsOpsService } from "@/server/services";
import { clientLeadsService, type ClientLeadRow } from "@/server/services/client-leads.service";
import { CLIENT_LEAD_GROUPS } from "@/lib/client-lead-status";
import { PrintButton } from "@/components/audits/print-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Monatsbericht" };

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function shift(month: string, by: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
const label = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
const startOf = (month: string) => `${month}-01T00:00:00+00:00`;

type Counts = { total: number; byGroup: Record<string, number>; hot: number; warm: number; cold: number };
function count(rows: ClientLeadRow[]): Counts {
  const byGroup: Record<string, number> = {};
  let hot = 0, warm = 0, cold = 0;
  for (const r of rows) {
    byGroup[r.status] = (byGroup[r.status] ?? 0) + 1;
    const t = CLIENT_LEAD_GROUPS.find((g) => g.key === r.status)?.temp;
    if (t === "hot") hot++;
    else if (t === "cold") cold++;
    else warm++;
  }
  return { total: rows.length, byGroup, hot, warm, cold };
}

function Delta({ now, before }: { now: number; before: number }) {
  if (!before && !now) return null;
  if (!before) return <span className="text-xs text-neutral-400">neu</span>;
  const p = Math.round(((now - before) / before) * 100);
  return <span className={cn("text-xs tabular-nums", p > 0 ? "text-emerald-700" : p < 0 ? "text-rose-700" : "text-neutral-400")}>{p > 0 ? "+" : ""}{p} % zum Vormonat</span>;
}

export default async function ClientReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ monat?: string }> }) {
  await requireUser();
  const { id } = await params;
  const { monat } = await searchParams;
  const client = await clientsOpsService.getWithStats(id).catch(() => null);
  if (!client) notFound();

  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = monat && /^\d{4}-\d{2}$/.test(monat) ? monat : current;
  const prev = shift(month, -1);
  const [rows, prevRows, history] = await Promise.all([
    clientLeadsService.listByClient(id, { from: startOf(month), to: startOf(shift(month, 1)) }).catch(() => []),
    clientLeadsService.listByClient(id, { from: startOf(prev), to: startOf(month) }).catch(() => []),
    clientLeadsService.listByClient(id, { from: startOf(shift(month, -5)), to: startOf(shift(month, 1)) }).catch(() => []),
  ]);
  const c = count(rows);
  const p = count(prevRows);
  const g = (k: string) => c.byGroup[k] ?? 0;
  const inWork = g("neu") + g("unreachable") + g("mail");

  const campaigns = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const k = r.campaign_name?.trim() || "Ohne Kampagne";
    const m = campaigns.get(k) ?? {};
    m[r.status] = (m[r.status] ?? 0) + 1;
    m.total = (m.total ?? 0) + 1;
    campaigns.set(k, m);
  }
  const campaignRows = [...campaigns.entries()].sort((a, b) => (b[1].total ?? 0) - (a[1].total ?? 0));

  const trend = Array.from({ length: 6 }, (_, i) => shift(month, i - 5)).map((m) => {
    const rs = history.filter((r) => r.created_at.slice(0, 7) === m);
    return { month: m, total: rs.length, won: rs.filter((r) => r.status === "won").length, hot: rs.filter((r) => r.status === "hot").length };
  });
  const maxTrend = Math.max(1, ...trend.map((t) => t.total));

  const kpis = [
    { label: "Leads gesamt", value: c.total, before: p.total },
    { label: "Termine", value: g("hot"), before: p.byGroup.hot ?? 0 },
    { label: "Kunde gewonnen", value: g("won"), before: p.byGroup.won ?? 0 },
    { label: "In Bearbeitung", value: inWork, before: (p.byGroup.neu ?? 0) + (p.byGroup.unreachable ?? 0) + (p.byGroup.mail ?? 0) },
    { label: "Kein Interesse", value: g("no_interest"), before: p.byGroup.no_interest ?? 0 },
    { label: "Ungültig", value: g("wrong"), before: p.byGroup.wrong ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/clients/${id}?tab=leads`} className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Zurück zum Kunden
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`?monat=${prev}`} aria-label="Vormonat" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
          <span className="min-w-[9rem] text-center text-sm font-medium text-neutral-800">{label(month)}</span>
          <Link href={`?monat=${shift(month, 1)}`} aria-label="Nächster Monat" aria-disabled={month >= current} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50", month >= current && "pointer-events-none opacity-40")}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
          <PrintButton />
        </div>
      </div>

      <article className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-100 pb-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Monatsbericht Kampagnen-Leads</p>
            <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{client.name}</h1>
          </div>
          <p className="text-lg font-medium text-neutral-700">{label(month)}</p>
        </header>

        {c.total === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">In diesem Monat sind keine Leads eingegangen.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-500">{k.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{k.value}</p>
                  <Delta now={k.value} before={k.before} />
                </div>
              ))}
            </div>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-neutral-900">Lead-Qualität</h2>
              <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
                {[{ k: "Hot", v: c.hot, t: "bg-brand-500" }, { k: "Warm", v: c.warm, t: "bg-amber-400" }, { k: "Cold", v: c.cold, t: "bg-neutral-400" }].map((x) => (x.v ? <span key={x.k} className={x.t} style={{ flexGrow: x.v, flexBasis: 0 }} /> : null))}
              </div>
              <p className="mt-2 text-xs text-neutral-600">
                Hot (Termin oder gewonnen) {c.hot} · Warm (offen, nicht erreicht, Mail) {c.warm} · Cold (Absage, ungültig) {c.cold}
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-neutral-900">Kampagnen und Status</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
                    <tr className="border-b border-neutral-200">
                      <th className="py-2">Kampagne</th>
                      <th className="py-2 text-right">Leads</th>
                      {CLIENT_LEAD_GROUPS.map((x) => (
                        <th key={x.key} className="py-2 text-right">{x.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 tabular-nums">
                    {campaignRows.map(([name, m]) => (
                      <tr key={name}>
                        <td className="max-w-[220px] truncate py-2 text-neutral-800" title={name}>{name}</td>
                        <td className="py-2 text-right font-medium">{m.total}</td>
                        {CLIENT_LEAD_GROUPS.map((x) => (
                          <td key={x.key} className="py-2 text-right text-neutral-600">{m[x.key] ?? 0}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Verlauf der letzten 6 Monate</h2>
          <div className="flex h-36 items-end gap-3">
            {trend.map((t) => (
              <div key={t.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[11px] tabular-nums text-neutral-600">{t.total}</span>
                <div className={cn("w-full max-w-[56px] rounded-t", t.month === month ? "bg-brand-500" : "bg-neutral-300")} style={{ height: `${(t.total / maxTrend) * 96}px` }} title={`${label(t.month)}: ${t.total} Leads, ${t.hot} Termine, ${t.won} gewonnen`} />
                <span className="text-[11px] text-neutral-500">{MONTHS[Number(t.month.slice(5, 7)) - 1]!.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-neutral-100 pt-4 text-xs text-neutral-400">
          Grundlage: Kampagnen-Leads mit Eingang im {label(month)}. Status gemäss Zuordnung im Kunden-CRM. Erstellt von eCreator.
        </footer>
      </article>
    </div>
  );
}
