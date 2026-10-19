import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Kpi, KpiGrid, Note, Panel, SchemaMissing, SetupRequired } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { fmtDec, fmtInt, fmtPct, ratio } from "@/lib/marketing/format";
import { getSourceStatuses, gscReport, listGscDetail, listGscTotals, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Search Console" };

/* eslint-disable @typescript-eslint/no-explicit-any */
function totals(rows: any[] | null) {
  if (!rows || rows.length === 0) return null;
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  // Position gewichtet nach Impressionen (wie in der Search Console)
  const position = impressions ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / impressions : null;
  return { clicks, impressions, ctr: ratio(clicks, impressions), position };
}

function group(rows: any[], key: "query" | "page") {
  const m = new Map<string, { clicks: number; impressions: number; posw: number }>();
  for (const r of rows) {
    const e = m.get(r[key]) ?? { clicks: 0, impressions: 0, posw: 0 };
    e.clicks += r.clicks;
    e.impressions += r.impressions;
    e.posw += r.position * r.impressions;
    m.set(r[key], e);
  }
  return [...m.entries()].map(([k, v]) => ({ id: k, name: k, clicks: v.clicks, impressions: v.impressions, ctr: ratio(v.clicks, v.impressions), position: v.impressions ? v.posw / v.impressions : null }));
}

const DEVICE: Record<string, string> = { DESKTOP: "Desktop", MOBILE: "Mobil", TABLET: "Tablet" };

export default async function SearchConsolePage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const head = <PageHead title="Search Console" subtitle="Klicks, Impressionen, CTR und Position aus der Google Search Console (2–3 Tage Verzug)" range={range} sources={[src.gsc]} />;
  if (src.gsc.state === "setup_required")
    return (
      <>
        {head}
        <SetupRequired detail={src.gsc.detail} />
      </>
    );
  const [cur, prev, detail, countries, devices] = await Promise.all([
    listGscTotals(range),
    range.compare ? listGscTotals(range.compare) : Promise.resolve(null),
    listGscDetail(range),
    gscReport(range, "country"),
    gscReport(range, "device"),
  ]);
  const t = totals(cur);
  const p = totals(prev);
  const anonymized = t && detail ? t.clicks - detail.reduce((s, r) => s + r.clicks, 0) : null;

  return (
    <>
      {head}
      <div className="space-y-5">
        <KpiGrid>
          <Kpi label="Klicks" value={fmtInt(t?.clicks)} cur={t?.clicks} prev={p?.clicks} missing={t ? null : "Daten werden synchronisiert"} />
          <Kpi label="Impressionen" value={fmtInt(t?.impressions)} cur={t?.impressions} prev={p?.impressions} missing={t ? null : "–"} />
          <Kpi label="CTR" value={fmtPct(t?.ctr)} cur={t?.ctr} prev={p?.ctr} missing={t ? null : "–"} />
          <Kpi label="Ø Position" value={fmtDec(t?.position)} cur={t?.position} prev={p?.position} inverse missing={t ? null : "–"} />
          <Kpi label="Anonymisierte Klicks" value={fmtInt(anonymized != null && anonymized > 0 ? anonymized : 0)} compare={false} hint="ohne Suchanfrage (Datenschutz)" />
        </KpiGrid>
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Top-Suchanfragen">
            <DataTable
              columns={[
                { key: "name", label: "Suchanfrage" },
                { key: "clicks", label: "Klicks", format: "int" },
                { key: "impressions", label: "Impr.", format: "int" },
                { key: "ctr", label: "CTR", format: "pct" },
                { key: "position", label: "Pos.", format: "dec" },
              ]}
              rows={group(detail ?? [], "query")}
              searchKeys={["name"]}
              defaultSort={{ key: "clicks", dir: "desc" }}
              pageSize={25}
            />
          </Panel>
          <Panel title="Top-Seiten">
            <DataTable
              columns={[
                { key: "name", label: "Seite" },
                { key: "clicks", label: "Klicks", format: "int" },
                { key: "impressions", label: "Impr.", format: "int" },
                { key: "ctr", label: "CTR", format: "pct" },
                { key: "position", label: "Pos.", format: "dec" },
              ]}
              rows={group(detail ?? [], "page")}
              searchKeys={["name"]}
              defaultSort={{ key: "clicks", dir: "desc" }}
              pageSize={25}
            />
          </Panel>
          <Panel title="Länder">
            <DataTable
              columns={[
                { key: "name", label: "Land (ISO)" },
                { key: "clicks", label: "Klicks", format: "int" },
                { key: "impressions", label: "Impr.", format: "int" },
                { key: "position", label: "Pos.", format: "dec" },
              ]}
              rows={(countries ?? []).map((c) => ({ id: c.key, name: c.key.toUpperCase(), clicks: c.clicks, impressions: c.impressions, position: c.position }))}
              defaultSort={{ key: "clicks", dir: "desc" }}
              pageSize={10}
            />
          </Panel>
          <Panel title="Geräte">
            <DataTable
              columns={[
                { key: "name", label: "Gerät" },
                { key: "clicks", label: "Klicks", format: "int" },
                { key: "impressions", label: "Impr.", format: "int" },
                { key: "ctr", label: "CTR", format: "pct" },
              ]}
              rows={(devices ?? []).map((d) => ({ id: d.key, name: DEVICE[d.key] ?? d.key, clicks: d.clicks, impressions: d.impressions, ctr: d.ctr }))}
              defaultSort={{ key: "clicks", dir: "desc" }}
            />
          </Panel>
        </div>
        <Note>GSC-Klicks sind nicht dasselbe wie GA4-Sitzungen (andere Zählung, kein Consent nötig, Verzug). Seltene Suchanfragen anonymisiert Google; Summen kommen darum aus den Tages-Totals.</Note>
      </div>
    </>
  );
}
