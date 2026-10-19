import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHead } from "@/components/marketing/page-head";
import { Kpi, KpiGrid, Note, Panel, SchemaMissing, SetupRequired } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { FilterSelect } from "@/components/marketing/filter-select";
import { fmtDec, fmtInt, fmtPct, ratio } from "@/lib/marketing/format";
import { channelLabel } from "@/lib/marketing/channels";
import { ga4Report, ga4Summary, getSourceStatuses, listConversions, listGa4Pages, listGa4Traffic, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Website Analytics" };

const DEVICE: Record<string, string> = { desktop: "Desktop", mobile: "Mobil", tablet: "Tablet" };
const pathOf = (u: string | null) => {
  if (!u) return null;
  try {
    return new URL(u, "https://www.ecreator.ch").pathname;
  } catch {
    return u;
  }
};

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const { range, sp } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const head = <PageHead title="Website Analytics" subtitle="GA4 Data API: Besucher, Sitzungen, Seiten, Geräte, Herkunft und Conversions" range={range} sources={[src.ga4, src.website]} />;
  if (src.ga4.state === "setup_required") {
    return (
      <>
        {head}
        <SetupRequired detail={`${src.ga4.detail}. Für www.ecreator.ch existiert noch keine GA4-Property.`} />
      </>
    );
  }

  const [summary, prev, traffic, pages, conv, geo, devices] = await Promise.all([
    ga4Summary(range),
    range.compare ? ga4Summary(range.compare) : Promise.resolve(null),
    listGa4Traffic(range),
    listGa4Pages(range),
    listConversions(range),
    ga4Report(range, ["country", "city"], ["totalUsers", "sessions"], 50),
    ga4Report(range, ["deviceCategory"], ["totalUsers", "sessions", "engagedSessions"], 10),
  ]);

  // Filter auf die Traffic-Zeilen (Quelle, Kampagne, Geraet, Landingpage)
  const t = (traffic ?? []).filter(
    (r) => (!sp.source || r.source === sp.source) && (!sp.campaign || r.campaign === sp.campaign) && (!sp.device || r.device_category === sp.device) && (!sp.landing || r.landing_page === sp.landing),
  );
  const filtered = Boolean(sp.source || sp.campaign || sp.device || sp.landing);
  const sessions = t.reduce((s, r) => s + r.sessions, 0);
  const engaged = t.reduce((s, r) => s + r.engaged_sessions, 0);
  const keyEvents = t.reduce((s, r) => s + r.key_events, 0);

  const leadsByPage = new Map<string, number>();
  for (const c of conv ?? []) {
    const p = pathOf(c.page_url);
    if (p) leadsByPage.set(p, (leadsByPage.get(p) ?? 0) + 1);
  }
  const pageMap = new Map<string, { title: string | null; views: number; users: number; eng: number; key: number }>();
  for (const r of pages ?? []) {
    const e = pageMap.get(r.page_path) ?? { title: r.page_title, views: 0, users: 0, eng: 0, key: 0 };
    e.views += r.screen_page_views;
    e.users += r.total_users;
    e.eng += r.user_engagement_sec;
    e.key += r.key_events;
    pageMap.set(r.page_path, e);
  }
  const pageRows = [...pageMap.entries()].map(([path, v]) => ({
    id: path,
    path,
    title: v.title,
    views: v.views,
    users: v.users,
    eng: v.users ? v.eng / v.users : null,
    key: v.key,
    leads: leadsByPage.get(path) ?? 0,
    cr: ratio(leadsByPage.get(path) ?? 0, v.views),
  }));

  const landing = new Map<string, { sessions: number; engaged: number; key: number }>();
  for (const r of t) {
    const e = landing.get(r.landing_page) ?? { sessions: 0, engaged: 0, key: 0 };
    e.sessions += r.sessions;
    e.engaged += r.engaged_sessions;
    e.key += r.key_events;
    landing.set(r.landing_page, e);
  }
  const opts = (key: "source" | "campaign" | "device_category" | "landing_page") =>
    [...new Set((traffic ?? []).map((r) => r[key] as string).filter(Boolean))].slice(0, 200).map((v) => ({ value: v, label: key === "device_category" ? DEVICE[v] ?? v : v }));

  return (
    <>
      {head}
      <div className="space-y-5">
        <KpiGrid>
          <Kpi label="Nutzer" value={fmtInt(summary?.totalUsers)} cur={summary?.totalUsers} prev={prev?.totalUsers} missing={summary ? null : "Daten werden synchronisiert"} />
          <Kpi label="Neue Nutzer" value={fmtInt(summary?.newUsers)} cur={summary?.newUsers} prev={prev?.newUsers} missing={summary ? null : "–"} />
          <Kpi label="Sitzungen" value={fmtInt(summary?.sessions)} cur={summary?.sessions} prev={prev?.sessions} missing={summary ? null : "–"} />
          <Kpi label="Engagierte Sitzungen" value={fmtInt(summary?.engagedSessions)} cur={summary?.engagedSessions} prev={prev?.engagedSessions} missing={summary ? null : "–"} />
          <Kpi label="Engagement-Rate" value={fmtPct(ratio(summary?.engagedSessions, summary?.sessions))} compare={false} missing={summary ? null : "–"} />
          <Kpi label="Seitenaufrufe" value={fmtInt(summary?.views)} cur={summary?.views} prev={prev?.views} missing={summary ? null : "–"} />
          <Kpi label="Key Events (GA4)" value={fmtInt(summary?.keyEvents)} cur={summary?.keyEvents} prev={prev?.keyEvents} missing={summary ? null : "–"} hint="Plattform-Zählung" />
          <Kpi label="Website-Leads" value={fmtInt(conv?.length ?? null)} compare={false} hint="erste Partei" />
        </KpiGrid>

        <Panel
          title="Filter"
          description={filtered ? `Gefiltert: ${fmtInt(sessions)} Sitzungen, ${fmtInt(engaged)} engagiert (${fmtPct(ratio(engaged, sessions))}), ${fmtDec(keyEvents)} Key Events` : "Filter wirken auf Landingpages (Sitzungs-Ebene)"}
        >
          <Suspense fallback={null}>
            <div className="flex flex-wrap gap-2">
              <FilterSelect name="source" label="Quelle" options={opts("source")} />
              <FilterSelect name="campaign" label="Kampagne" options={opts("campaign")} />
              <FilterSelect name="device" label="Gerät" options={opts("device_category")} />
              <FilterSelect name="landing" label="Landingpage" options={opts("landing_page")} />
            </div>
          </Suspense>
        </Panel>

        <Panel title="Top-Seiten" description="Conversions = Website-Anfragen, die auf dieser Seite abgeschickt wurden">
          <DataTable
            columns={[
              { key: "path", label: "Pfad" },
              { key: "title", label: "Titel", hideSm: true },
              { key: "views", label: "Aufrufe", format: "int" },
              { key: "users", label: "Nutzer*", format: "int", title: "Summe der Tageswerte, nicht eindeutig" },
              { key: "eng", label: "Ø Engagement s", format: "dec", hideSm: true },
              { key: "key", label: "Key Events", format: "dec", hideSm: true },
              { key: "leads", label: "Conversions", format: "int" },
              { key: "cr", label: "CR", format: "pct" },
            ]}
            rows={pageRows}
            searchKeys={["path", "title"]}
            defaultSort={{ key: "views", dir: "desc" }}
          />
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Landingpages (Sitzungen)">
            <DataTable
              columns={[
                { key: "page", label: "Landingpage" },
                { key: "sessions", label: "Sitzungen", format: "int" },
                { key: "rate", label: "Engagement", format: "pct" },
                { key: "key", label: "Key Events", format: "dec" },
              ]}
              rows={[...landing.entries()].map(([k, v]) => ({ id: k, page: k || "(nicht gesetzt)", sessions: v.sessions, rate: ratio(v.engaged, v.sessions), key: v.key }))}
              defaultSort={{ key: "sessions", dir: "desc" }}
              pageSize={15}
            />
          </Panel>
          <Panel title="Geräte">
            <DataTable
              columns={[
                { key: "device", label: "Gerät" },
                { key: "users", label: "Nutzer", format: "int" },
                { key: "sessions", label: "Sitzungen", format: "int" },
                { key: "rate", label: "Engagement", format: "pct" },
              ]}
              rows={(devices ?? []).map((d) => ({ id: d.dims[0], device: DEVICE[d.dims[0] ?? ""] ?? d.dims[0], users: d.values[0], sessions: d.values[1], rate: ratio(d.values[2] ?? 0, d.values[1] ?? 0) }))}
              defaultSort={{ key: "sessions", dir: "desc" }}
            />
          </Panel>
          <Panel title="Länder und Städte">
            <DataTable
              columns={[
                { key: "country", label: "Land" },
                { key: "city", label: "Stadt" },
                { key: "users", label: "Nutzer", format: "int" },
                { key: "sessions", label: "Sitzungen", format: "int" },
              ]}
              rows={(geo ?? []).map((g, i) => ({ id: `${i}`, country: g.dims[0], city: g.dims[1], users: g.values[0], sessions: g.values[1] }))}
              defaultSort={{ key: "users", dir: "desc" }}
              pageSize={15}
            />
          </Panel>
          <Panel title="Herkunft (GA4 Kanal)">
            <DataTable
              columns={[
                { key: "group", label: "Kanalgruppe (GA4)" },
                { key: "sessions", label: "Sitzungen", format: "int" },
                { key: "key", label: "Key Events", format: "dec" },
              ]}
              rows={Object.entries(
                t.reduce<Record<string, { s: number; k: number }>>((acc, r) => {
                  const e = (acc[r.channel_group || "(nicht gesetzt)"] ??= { s: 0, k: 0 });
                  e.s += r.sessions;
                  e.k += r.key_events;
                  return acc;
                }, {}),
              ).map(([k, v]) => ({ id: k, group: k, sessions: v.s, key: v.k }))}
              defaultSort={{ key: "sessions", dir: "desc" }}
            />
          </Panel>
        </div>
        <Note>
          Nutzer sind nicht über Tage oder Seiten summierbar: Die Kennzahl «Nutzer» oben ist eine eigene GA4-Abfrage für den Zeitraum; mit * markierte Spalten sind Summen von Tageswerten.
          Kanalzuordnung im Bericht «Traffic-Quellen» ({channelLabel("google_organic")}, …) folgt derselben Regel wie bei den Leads.
        </Note>
      </div>
    </>
  );
}
