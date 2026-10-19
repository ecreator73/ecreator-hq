import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { clientsService } from "@/server/services";
import { clientLeadsService } from "@/server/services/client-leads.service";
import { CLIENT_LEAD_GROUPS } from "@/lib/client-lead-status";
import { cn } from "@/lib/utils";
import { LinkLeadsSelect } from "@/components/clients/link-leads-select";

export const metadata: Metadata = { title: "Kunden-Leads" };

const DAY = 86_400_000;
const MONTH = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "–");

type Agg = { key: string; name: string; clientId: string | null; ext: string | null; total: number; d30: number; prev30: number; byGroup: Record<string, number>; last: string | null };

export default async function ClientLeadsOverviewPage({ searchParams }: { searchParams: Promise<{ zeitraum?: string }> }) {
  await requireRole(["super_admin", "ceo", "cso", "project_manager"]);
  const { zeitraum } = await searchParams;
  const days = zeitraum === "90" ? 90 : zeitraum === "365" ? 365 : zeitraum === "alle" ? null : 30;
  const [rows, clients] = await Promise.all([clientLeadsService.overview().catch(() => []), clientsService.list().catch(() => [])]);
  const names = new Map(clients.map((c) => [c.id, c.name]));
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const now = Date.now();
  const since = days ? now - days * DAY : 0;
  const scoped = rows.filter((r) => Date.parse(r.created_at) >= since);

  const agg = new Map<string, Agg>();
  for (const r of rows) {
    const key = r.client_id ?? `x:${r.external_client_name ?? "Ohne Kunde"}`;
    const a = agg.get(key) ?? { key, clientId: r.client_id, ext: r.client_id ? null : r.external_client_name, name: r.client_id ? names.get(r.client_id) ?? "Kunde" : r.external_client_name ?? "Ohne Kunde", total: 0, d30: 0, prev30: 0, byGroup: {}, last: null };
    const t = Date.parse(r.created_at);
    if (t >= now - 30 * DAY) a.d30++;
    else if (t >= now - 60 * DAY) a.prev30++;
    if (!a.last || r.created_at > a.last) a.last = r.created_at;
    if (t >= since) {
      a.total++;
      a.byGroup[r.status] = (a.byGroup[r.status] ?? 0) + 1;
    }
    agg.set(key, a);
  }
  const list = [...agg.values()].filter((a) => a.total > 0 || a.d30 > 0).sort((a, b) => b.total - a.total);
  const linked = list.filter((a) => a.clientId);
  const unlinked = list.filter((a) => !a.clientId);

  const total = scoped.length;
  const byGroup: Record<string, number> = {};
  for (const r of scoped) byGroup[r.status] = (byGroup[r.status] ?? 0) + 1;

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 11 + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const perMonth = months.map((m) => {
    const rs = rows.filter((r) => r.created_at.slice(0, 7) === m);
    const g: Record<string, number> = {};
    for (const r of rs) g[r.status] = (g[r.status] ?? 0) + 1;
    return { m, total: rs.length, g };
  });
  const maxMonth = Math.max(1, ...perMonth.map((x) => x.total));
  const periods = [
    { k: "30", l: "30 Tage" },
    { k: "90", l: "90 Tage" },
    { k: "365", l: "12 Monate" },
    { k: "alle", l: "Alle" },
  ];
  const activeK = days == null ? "alle" : String(days);

  const Table = ({ items }: { items: Agg[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-2">Kunde</th>
            <th className="px-3 py-2 text-right">Leads</th>
            <th className="px-3 py-2 text-right" title="Letzte 30 Tage im Vergleich zu den 30 Tagen davor">30 T.</th>
            <th className="px-3 py-2">Verteilung</th>
            <th className="px-3 py-2 text-right">Termine</th>
            <th className="px-3 py-2 text-right">Gewonnen</th>
            <th className="px-3 py-2 text-right">Offen</th>
            <th className="px-3 py-2 text-right">Ungültig</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 tabular-nums">
          {items.map((a) => {
            const hot = (a.byGroup.hot ?? 0) + (a.byGroup.won ?? 0);
            const trend = a.d30 - a.prev30;
            return (
              <tr key={a.key} className="hover:bg-neutral-50/60">
                <td className="px-4 py-2">
                  {a.clientId ? (
                    <Link href={`/clients/${a.clientId}?tab=leads`} className="font-medium text-neutral-900 hover:text-brand-700">
                      {a.name}
                    </Link>
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-neutral-700">{a.name}</span>
                      {a.ext ? <LinkLeadsSelect externalName={a.ext} clients={clientOptions} /> : null}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-medium">{a.total.toLocaleString("de-CH")}</td>
                <td className="px-3 py-2 text-right">
                  {a.d30}
                  {trend !== 0 ? <span className={cn("ml-1 text-xs", trend > 0 ? "text-emerald-700" : "text-rose-700")}>{trend > 0 ? `+${trend}` : trend}</span> : null}
                </td>
                <td className="px-3 py-2">
                  <div className="flex h-2 w-32 gap-px overflow-hidden rounded-full bg-neutral-100">
                    {CLIENT_LEAD_GROUPS.map((x) => (a.byGroup[x.key] ? <span key={x.key} className={x.tone} style={{ flexGrow: a.byGroup[x.key], flexBasis: 0 }} /> : null))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  {a.byGroup.hot ?? 0} <span className="text-xs text-neutral-400">{pct(hot, a.total)}</span>
                </td>
                <td className="px-3 py-2 text-right text-emerald-700">{a.byGroup.won ?? 0}</td>
                <td className={cn("px-3 py-2 text-right", (a.byGroup.neu ?? 0) > 0 && "text-amber-700")}>{a.byGroup.neu ?? 0}</td>
                <td className="px-3 py-2 text-right text-neutral-500">{a.byGroup.wrong ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">Leads aus den Kampagnen für unsere Kunden, über alle Kunden hinweg.</p>
        <nav className="flex rounded-lg border border-neutral-200 bg-white p-0.5 text-xs" aria-label="Zeitraum">
          {periods.map((p) => (
            <Link key={p.k} href={`?zeitraum=${p.k}`} aria-current={activeK === p.k ? "page" : undefined} className={cn("rounded-md px-2.5 py-1", activeK === p.k ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50")}>
              {p.l}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { l: "Leads", v: total.toLocaleString("de-CH"), s: `${linked.length} Kunden mit Leads` },
          { l: "Termine", v: byGroup.hot ?? 0, s: `Quote ${pct((byGroup.hot ?? 0) + (byGroup.won ?? 0), total)}` },
          { l: "Gewonnen", v: byGroup.won ?? 0, s: `Quote ${pct(byGroup.won ?? 0, total)}`, t: "text-emerald-700" },
          { l: "Offen", v: byGroup.neu ?? 0, s: "noch ohne Ergebnis", t: (byGroup.neu ?? 0) ? "text-amber-700" : undefined },
          { l: "Ungültig", v: byGroup.wrong ?? 0, s: `Anteil ${pct(byGroup.wrong ?? 0, total)}` },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">{k.l}</p>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums", k.t ?? "text-neutral-900")}>{k.v}</p>
            <p className="text-xs text-neutral-400">{k.s}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">Leads pro Monat</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
            {CLIENT_LEAD_GROUPS.map((x) => (
              <li key={x.key} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-sm", x.tone)} aria-hidden /> {x.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex h-44 items-end gap-2">
          {perMonth.map((x) => (
            <div key={x.m} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-neutral-500">{x.total || ""}</span>
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-t" style={{ height: `${(x.total / maxMonth) * 136}px` }} title={`${x.m}: ${x.total} Leads`}>
                {CLIENT_LEAD_GROUPS.map((g) => (x.g[g.key] ? <span key={g.key} className={g.tone} style={{ height: `${(x.g[g.key]! / x.total) * 100}%` }} /> : null))}
              </div>
              <span className="text-[10px] text-neutral-500">{MONTH[Number(x.m.slice(5, 7)) - 1]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white">
        <h2 className="border-b border-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-900">Nach Kunde</h2>
        {linked.length ? <Table items={linked} /> : <p className="px-4 py-8 text-center text-sm text-neutral-500">Im gewählten Zeitraum keine Leads.</p>}
      </section>

      {unlinked.length ? (
        <section className="rounded-xl border border-amber-200 bg-white">
          <div className="border-b border-amber-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">Ohne Kundenzuordnung</h2>
            <p className="text-xs text-neutral-500">Diese Leads tragen nur den Kundennamen aus dem alten CRM. Sie zählen in die Summen oben, aber zu keinem Kunden. Weise sie einem Kunden zu, dann erscheinen sie in dessen Auswertung und Monatsbericht.</p>
          </div>
          <Table items={unlinked} />
        </section>
      ) : null}
    </div>
  );
}
