import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Kpi, KpiGrid, Note, Panel, SchemaMissing, SetupRequired } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { fmtInt, fmtMicros } from "@/lib/marketing/format";
import { weekStart } from "@/lib/marketing/range";
import { getSourceStatuses, listBookings, listChannelMetrics, listConversions, schemaReady } from "@/server/marketing/dashboard.service";
import { aggregateCampaigns, campaignMatcher, sumCampaigns } from "@/server/marketing/aggregate";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Kampagnen-Performance" };

const PLATFORM: Record<string, string> = { google_ads: "Google Ads", meta_ads: "Meta Ads" };

export default async function CampaignsPage({ searchParams }: { searchParams: SearchParams }) {
  const { range, sp } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const head = <PageHead title="Kampagnen-Performance" subtitle="Google Ads und Meta Ads im selben Zeitraum, Kosten in CHF, Unterschiede beschriftet" range={range} showCompare={false} sources={[src.google_ads, src.meta_ads]} />;
  if (src.google_ads.state === "setup_required" && src.meta_ads.state === "setup_required") {
    return (
      <>
        {head}
        <SetupRequired detail="Google Ads und Meta Ads sind noch nicht verbunden." />
      </>
    );
  }
  const [metrics, conv, bookings] = await Promise.all([listChannelMetrics(range), listConversions(range), listBookings(range)]);
  const camps = aggregateCampaigns(metrics ?? [], campaignMatcher(conv, bookings));
  const t = sumCampaigns(camps);
  const rows = camps.map((c) => ({ ...c, platform_label: PLATFORM[c.platform] ?? c.platform, site_cr: c.clicks ? c.leads / c.clicks : null }));

  // Kosten nach Periode und Plattform
  const gran = sp.gran === "week" || sp.gran === "month" ? sp.gran : "day";
  const cost = new Map<string, { google: number; meta: number }>();
  for (const m of metrics ?? []) {
    if (m.currency !== "CHF") continue;
    const k = gran === "day" ? m.date : gran === "week" ? weekStart(m.date) : m.date.slice(0, 7);
    const e = cost.get(k) ?? { google: 0, meta: 0 };
    if (m.platform === "google_ads") e.google += m.cost_micros;
    else e.meta += m.cost_micros;
    cost.set(k, e);
  }
  const costRows = [...cost.entries()].map(([k, v]) => ({ id: k, period: gran === "month" ? `${k.slice(5, 7)}.${k.slice(0, 4)}` : k, google: v.google, meta: v.meta, total: v.google + v.meta }));
  const otherCur = [...new Set((metrics ?? []).filter((m) => m.currency !== "CHF").map((m) => m.currency))];

  return (
    <>
      {head}
      <div className="space-y-5">
        <KpiGrid>
          <Kpi label="Spend total" value={fmtMicros(t.cost, 0)} compare={false} />
          <Kpi label="Klicks" value={fmtInt(t.clicks)} compare={false} />
          <Kpi label="Plattform-Conversions" value={fmtInt(t.conv)} compare={false} hint="Summe beider Plattformen" />
          <Kpi label="Website-Leads (Kampagnen)" value={fmtInt(t.leads)} compare={false} hint="per utm_campaign zugeordnet" />
          <Kpi label="Buchungen (Kampagnen)" value={fmtInt(t.bookings)} compare={false} />
          <Kpi label="CPL (Kampagnen)" value={fmtMicros(t.cpl)} compare={false} />
        </KpiGrid>
        {otherCur.length ? <Note tone="warning">Konten in {otherCur.join(", ")}: Kosten nicht umgerechnet und in Summen nicht enthalten.</Note> : null}
        <Panel title="Alle Kampagnen">
          <DataTable
            columns={[
              { key: "platform_label", label: "Plattform" },
              { key: "name", label: "Kampagne" },
              { key: "cost", label: "Spend", format: "chf" },
              { key: "impressions", label: "Impr.", format: "int", hideSm: true },
              { key: "clicks", label: "Klicks", format: "int" },
              { key: "ctr", label: "CTR", format: "pct", hideSm: true },
              { key: "cpc", label: "CPC", format: "chf", hideSm: true },
              { key: "platform_conversions", label: "Plattf.-Conv.", format: "dec" },
              { key: "leads", label: "Website-Leads", format: "int" },
              { key: "bookings", label: "Buchungen", format: "int" },
              { key: "cpl", label: "CPL", format: "chf" },
              { key: "cpb", label: "Kosten/Buchung", format: "chf", hideSm: true },
              { key: "site_cr", label: "Lead-Rate/Klick", format: "pct", hideSm: true },
            ]}
            rows={rows}
            searchKeys={["name", "platform_label"]}
            defaultSort={{ key: "cost", dir: "desc" }}
            totals={{ platform_label: "Total", cost: t.cost, clicks: t.clicks, platform_conversions: t.conv, leads: t.leads, bookings: t.bookings, cpl: t.cpl, cpb: t.cpb }}
          />
        </Panel>
        <Panel
          title="Kosten"
          description="Nach Periode und Plattform (keine Gewinn- oder ROAS-Werte ohne Umsatzdaten)"
          actions={
            <div className="flex gap-1 text-xs">
              {(["day", "week", "month"] as const).map((g) => (
                <a key={g} href={`?${new URLSearchParams({ ...(sp as Record<string, string>), gran: g }).toString()}`} className={`rounded px-2 py-0.5 ${gran === g ? "bg-neutral-900 text-white" : "text-neutral-600 ring-1 ring-neutral-200"}`}>
                  {g === "day" ? "Tag" : g === "week" ? "Woche" : "Monat"}
                </a>
              ))}
            </div>
          }
        >
          <DataTable
            columns={[
              { key: "period", label: gran === "week" ? "Woche ab" : "Periode", format: gran === "month" ? "text" : "date" },
              { key: "google", label: "Google Ads", format: "chf" },
              { key: "meta", label: "Meta Ads", format: "chf" },
              { key: "total", label: "Total", format: "chf" },
            ]}
            rows={costRows}
            defaultSort={{ key: "period", dir: "desc" }}
          />
        </Panel>
        <Note>
          Unterschiede: Google zählt Conversions nach Klickdatum und eigener Attribution, Meta nach eigenem Zeitfenster (Standard 7 Tage Klick / 1 Tag View). Website-Leads und Buchungen sind
          First-Party-Ereignisse nach Zürcher Datum. Plattform-Tage folgen der Kontozeitzone.
        </Note>
      </div>
    </>
  );
}
