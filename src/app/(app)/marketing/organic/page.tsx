import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Kpi, KpiGrid, Note, Panel, SchemaMissing } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { fmtInt, fmtPct, ratio } from "@/lib/marketing/format";
import { channelGroup, classifyGa4 } from "@/lib/marketing/channels";
import { countableBookings, getSourceStatuses, listBookings, listConversions, listGa4Traffic, listGscTotals, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Organische Performance" };

export default async function OrganicPage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const [traffic, gsc, conv, bookings, prevConv] = await Promise.all([
    src.ga4.state !== "setup_required" ? listGa4Traffic(range) : Promise.resolve(null),
    src.gsc.state !== "setup_required" ? listGscTotals(range) : Promise.resolve(null),
    listConversions(range),
    listBookings(range),
    range.compare ? listConversions(range.compare) : Promise.resolve(null),
  ]);
  const organicEv = (conv ?? []).filter((c) => channelGroup(c.channel) === "organic");
  const prevOrganic = prevConv ? prevConv.filter((c) => channelGroup(c.channel) === "organic").length : null;
  const orgBookings = countableBookings(bookings ?? []).filter((b) => channelGroup(b.channel) === "organic").length;
  const orgTraffic = (traffic ?? []).filter((r) => channelGroup(classifyGa4(r.source, r.medium)) === "organic");
  const sessions = traffic ? orgTraffic.reduce((s, r) => s + r.sessions, 0) : null;
  const clicks = gsc ? gsc.reduce((s: number, r: { clicks: number }) => s + r.clicks, 0) : null;

  const land = new Map<string, { sessions: number; leads: number }>();
  for (const r of orgTraffic) {
    const e = land.get(r.landing_page) ?? { sessions: 0, leads: 0 };
    e.sessions += r.sessions;
    land.set(r.landing_page, e);
  }
  for (const c of organicEv) {
    const k = c.landing_page ?? "(unbekannt)";
    const e = land.get(k) ?? { sessions: 0, leads: 0 };
    e.leads++;
    land.set(k, e);
  }

  return (
    <>
      <PageHead title="Organische Performance" subtitle="Organische Suche: Klicks (GSC), Sitzungen (GA4) und daraus entstandene Anfragen (erste Partei)" range={range} sources={[src.gsc, src.ga4, src.website]} />
      <div className="space-y-5">
        <KpiGrid>
          <Kpi label="GSC-Klicks" value={fmtInt(clicks)} compare={false} missing={gsc ? null : "Search Console: Integration erforderlich"} />
          <Kpi label="Organische Sitzungen" value={fmtInt(sessions)} compare={false} missing={traffic ? null : "GA4: Integration erforderlich"} />
          <Kpi label="Organische Anfragen" value={fmtInt(organicEv.length)} cur={organicEv.length} prev={prevOrganic} />
          <Kpi label="Organische Buchungen" value={fmtInt(orgBookings)} compare={false} />
          <Kpi label="CR organisch" value={fmtPct(ratio(organicEv.length, sessions))} compare={false} missing={traffic ? null : "–"} />
        </KpiGrid>
        <Panel title="Organische Einstiegsseiten">
          <DataTable
            columns={[
              { key: "page", label: "Landingpage" },
              { key: "sessions", label: "Sitzungen (GA4)", format: "int" },
              { key: "leads", label: "Anfragen", format: "int" },
              { key: "cr", label: "CR", format: "pct" },
            ]}
            rows={[...land.entries()].map(([k, v]) => ({ id: k, page: k || "(nicht gesetzt)", sessions: traffic ? v.sessions : null, leads: v.leads, cr: traffic ? ratio(v.leads, v.sessions) : null }))}
            defaultSort={{ key: "leads", dir: "desc" }}
          />
        </Panel>
        <Note>Organisch = Google Organic und andere Suchmaschinen (per Referrer oder utm_medium=organic). Anfragen werden ohne Einwilligung gezählt, Sitzungen nur mit.</Note>
      </div>
    </>
  );
}
