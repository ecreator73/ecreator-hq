import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { teamService } from "@/server/services";
import { callStats, loadLeadWork, periods, teamRows } from "@/server/services/lead-work.service";
import { WorkList } from "@/components/leads/work-list";
import { CALL_OUTCOMES } from "@/lib/lead-workflow";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads · Arbeitsliste" };

const pct = (v: number | null) => (v == null ? "–" : `${Math.round(v * 100)} %`);

function Tabs({ tab, open, archive }: { tab: string; open: number; archive: number }) {
  const items = [
    { key: "", label: `Arbeitsliste (${open})` },
    { key: "statistik", label: "Statistik" },
    { key: "archiv", label: `Archiv (${archive})` },
  ];
  return (
    <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 text-sm">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.key ? `/leads?tab=${i.key}` : "/leads"}
          aria-current={tab === i.key ? "page" : undefined}
          className={cn("rounded-md px-3 py-1.5 font-medium", tab === i.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800")}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export default async function LeadsWorkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "";
  const [{ leads, calls, today }, members] = await Promise.all([loadLeadWork(), teamService.listMembers().catch(() => [])]);
  const open = leads.filter((l) => l.bucket !== "archive");
  const archived = leads.filter((l) => l.bucket === "archive");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Welche Leads sind jetzt dran?</h2>
          <p className="text-sm text-neutral-500">Offene Leads nach nächstem Schritt. Abgeschlossene, abgesagte und Fehleinträge stehen im Archiv.</p>
        </div>
        <Tabs tab={tab} open={open.length} archive={archived.length} />
      </div>

      {tab === "statistik" ? (
        <Stats calls={calls} leads={leads} members={members} today={today} />
      ) : tab === "archiv" ? (
        <WorkList leads={archived} members={members} today={today} archive />
      ) : (
        <WorkList leads={open} members={members} today={today} />
      )}
    </div>
  );
}

function Stats({ calls, leads, members, today }: { calls: Awaited<ReturnType<typeof loadLeadWork>>["calls"]; leads: Awaited<ReturnType<typeof loadLeadWork>>["leads"]; members: Array<{ id: string; full_name: string | null }>; today: string }) {
  const p = periods(today);
  const sToday = callStats(calls, p.today.from, p.today.to);
  const sWeek = callStats(calls, p.week.from, p.week.to);
  const sMonth = callStats(calls, p.month.from, p.month.to);
  const won = leads.filter((l) => l.status?.key === "abgeschlossen").length;
  const lost = leads.filter((l) => l.status?.key === "absage").length;
  const team = teamRows(leads, calls, members, today).filter((t) => t.id !== "none");
  const d30 = callStats(calls, p.d30.from, p.d30.to);
  const outcome30 = CALL_OUTCOMES.map((o) => ({ ...o, n: calls.filter((c) => c.at.slice(0, 10) >= p.d30.from && c.outcome === o.key).length })).filter((o) => o.n > 0);
  const maxO = Math.max(1, ...outcome30.map((o) => o.n));

  const Tile = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
      {sub ? <p className="text-xs text-neutral-400">{sub}</p> : null}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Anrufe heute" value={sToday.calls} sub={`${sToday.reached} erreicht`} />
        <Tile label="Anrufe diese Woche" value={sWeek.calls} sub={`Erreicht-Quote ${pct(sWeek.reachRate)}`} />
        <Tile label="Gewonnen (gesamt)" value={won} />
        <Tile label="Abgesagt (gesamt)" value={lost} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-neutral-100 text-left text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2.5">Zeitraum</th>
              <th className="px-3 py-2.5 text-right">Anrufe</th>
              <th className="px-3 py-2.5 text-right">Leads kontaktiert</th>
              <th className="px-3 py-2.5 text-right">Erreicht-Quote</th>
              <th className="px-3 py-2.5 text-right">Termine</th>
              <th className="px-3 py-2.5 text-right">Abschluss-Quote</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 tabular-nums">
            {[
              [p.week.label, sWeek],
              [p.month.label, sMonth],
              ["Letzte 30 Tage", d30],
            ].map(([l, s]) => {
              const st = s as typeof sWeek;
              return (
                <tr key={l as string}>
                  <td className="px-4 py-2.5 font-medium text-neutral-800">{l as string}</td>
                  <td className="px-3 py-2.5 text-right">{st.calls}</td>
                  <td className="px-3 py-2.5 text-right">{st.leadsContacted}</td>
                  <td className="px-3 py-2.5 text-right">{pct(st.reachRate)}</td>
                  <td className="px-3 py-2.5 text-right">{st.appointments}</td>
                  <td className="px-3 py-2.5 text-right">{pct(st.closeRate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Anruf-Ergebnisse · 30 Tage</h3>
          {outcome30.length ? (
            <ul className="space-y-2">
              {outcome30.map((o) => (
                <li key={o.key} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-xs">
                  <span className="text-neutral-600">{o.label}</span>
                  <span className="h-2 rounded-full bg-neutral-100">
                    <span className={cn("block h-2 rounded-full", o.reached ? "bg-brand-500" : "bg-neutral-400")} style={{ width: `${(o.n / maxO) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-neutral-800">{o.n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-neutral-500">Noch keine Anrufe in den letzten 30 Tagen erfasst.</p>
          )}
        </section>
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Nach Mitarbeiter · 30 Tage</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-1.5">Name</th>
                <th className="py-1.5 text-right">Anrufe</th>
                <th className="py-1.5 text-right">Erreicht</th>
                <th className="py-1.5 text-right">Termine</th>
                <th className="py-1.5 text-right">Gewonnen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 tabular-nums">
              {team.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 text-neutral-800">{t.name}</td>
                  <td className="py-2 text-right">{t.calls30}</td>
                  <td className="py-2 text-right">{pct(t.reachRate30)}</td>
                  <td className="py-2 text-right">{t.appointments30}</td>
                  <td className="py-2 text-right">{t.won30}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
