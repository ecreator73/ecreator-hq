import { PageHead } from "./page-head";
import { Kpi, KpiGrid, Note, Panel, SchemaMissing, SetupRequired } from "./ui";
import { DataTable } from "./data-table";
import { fmtInt, fmtMicros, fmtPct, ratio } from "@/lib/marketing/format";
import { rangeQuery, type ResolvedRange } from "@/lib/marketing/range";
import {
  countableBookings,
  getSourceStatuses,
  listAdMetrics,
  listBookings,
  listChannelMetrics,
  listConversions,
  listKeywordMetrics,
  schemaReady,
} from "@/server/marketing/dashboard.service";
import { aggregateBy, aggregateCampaigns, campaignMatcher, sumCampaigns } from "@/server/marketing/aggregate";

const MATCH: Record<string, string> = { EXACT: "Genau", PHRASE: "Wortgruppe", BROAD: "Weitgehend" };

/** Bericht fuer Google Ads bzw. Meta Ads (gleiche Struktur, plattformspezifische Spalten). */
export async function PlatformReport({ platform, range }: { platform: "google_ads" | "meta_ads"; range: ResolvedRange }) {
  const isGoogle = platform === "google_ads";
  const title = isGoogle ? "Google Ads" : "Meta Ads";
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const status = src[platform];
  const head = (
    <PageHead
      title={title}
      subtitle={isGoogle ? "Offizielle Google Ads API: Kampagnen, Anzeigen, Keywords" : "Meta Marketing API: Kampagnen, Anzeigengruppen, Anzeigen"}
      range={range}
      sources={[status, src.website, src.calendly]}
      actions={
        status.state !== "setup_required" ? (
          <a href={`/api/marketing/export?type=${isGoogle ? "keywords" : "campaigns"}&${rangeQuery(range)}`} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
            CSV exportieren
          </a>
        ) : undefined
      }
    />
  );
  if (status.state === "setup_required") {
    return (
      <>
        {head}
        <SetupRequired detail={status.detail} />
      </>
    );
  }

  const [metrics, prevMetrics, conv, bookings, ads, keywords] = await Promise.all([
    listChannelMetrics(range, platform),
    range.compare ? listChannelMetrics(range.compare, platform) : Promise.resolve(null),
    listConversions(range),
    listBookings(range),
    listAdMetrics(range, platform),
    isGoogle ? listKeywordMetrics(range) : Promise.resolve(null),
  ]);
  const match = campaignMatcher(conv, bookings);
  const camps = aggregateCampaigns(metrics ?? [], match);
  const prevCamps = aggregateCampaigns(prevMetrics ?? []);
  const t = sumCampaigns(camps);
  const pt = prevMetrics ? sumCampaigns(prevCamps) : null;
  const channelKeys = isGoogle ? ["google_ads"] : ["meta_ads", "meta_unclear"];
  const siteLeads = (conv ?? []).filter((c) => c.kind === "form" && channelKeys.includes(c.channel)).length;
  const siteBookings = countableBookings(bookings ?? []).filter((b) => channelKeys.includes(b.channel ?? "")).length;
  const reachNote = !isGoogle;

  if (!metrics || metrics.length === 0) {
    return (
      <>
        {head}
        <Panel>
          <p className="py-6 text-center text-sm text-neutral-500">{status.state === "pending" ? "Daten werden synchronisiert" : "Keine Daten verfügbar"} – im Zeitraum keine Kampagnenwerte.</p>
        </Panel>
      </>
    );
  }

  const campRows = camps.map((c) => ({
    ...c,
    status_label: c.status,
    status_color: /ENABLED|ACTIVE/.test(c.status ?? "") ? "green" : /PAUSED/.test(c.status ?? "") ? "amber" : "gray",
  }));

  const adRows = aggregateBy(
    ads ?? [],
    (r) => r.ad_id,
    (r) => ({ ad: r.ad_name ?? r.ad_id, group: r.ad_group_name ?? r.ad_group_id, type: r.ad_type, campaign: camps.find((c) => c.campaign_id === r.campaign_id)?.name ?? r.campaign_id }),
  );
  const groupRows = aggregateBy(
    ads ?? [],
    (r) => r.ad_group_id,
    (r) => ({ group: r.ad_group_name ?? r.ad_group_id, campaign: camps.find((c) => c.campaign_id === r.campaign_id)?.name ?? r.campaign_id }),
  );
  const kwRows = keywords
    ? aggregateBy(
        keywords,
        (r) => `${r.ad_group_id}|${r.criterion_id}`,
        (r) => ({ keyword: r.keyword_text, match: MATCH[r.match_type] ?? r.match_type, campaign: r.campaign_name, group: r.ad_group_name }),
      )
    : [];

  return (
    <>
      {head}
      <div className="space-y-5">
        <KpiGrid>
          <Kpi label="Kosten" value={fmtMicros(t.cost, 0)} cur={t.cost} prev={pt?.cost} inverse />
          <Kpi label="Impressionen" value={fmtInt(t.impressions)} cur={t.impressions} prev={pt?.impressions} />
          <Kpi label="Klicks" value={fmtInt(t.clicks)} cur={t.clicks} prev={pt?.clicks} />
          <Kpi label="CTR" value={fmtPct(t.ctr)} cur={t.ctr} prev={pt?.ctr} />
          <Kpi label="Ø CPC" value={fmtMicros(t.cpc)} cur={t.cpc} prev={pt?.cpc} inverse />
          <Kpi label={isGoogle ? "Plattform-Conversions" : "Gemeldete Leads"} value={fmtInt(t.conv)} cur={t.conv} prev={pt?.conv} hint="laut Plattform" />
          <Kpi label="Kosten / Plattform-Conv." value={fmtMicros(t.costPerConv)} cur={t.costPerConv} prev={pt?.costPerConv} inverse />
          <Kpi label="Website-Leads" value={fmtInt(siteLeads)} compare={false} hint="bestätigt, erste Partei" />
          <Kpi label="Buchungen" value={fmtInt(siteBookings)} compare={false} hint="Calendly" />
          <Kpi label="Kosten pro Website-Lead" value={fmtMicros(ratio(t.cost, siteLeads))} compare={false} />
          <Kpi label="Kosten pro Termin" value={fmtMicros(ratio(t.cost, siteBookings))} compare={false} />
          <Kpi label="ROAS" value="nicht verfügbar" compare={false} hint="keine Umsatzdaten" />
        </KpiGrid>
        <Note>
          {title}-Conversions (Plattform-Attribution) sind klar getrennt von bestätigten Website-Leads. Website-Leads je Kampagne: Zuordnung über utm_campaign = Kampagnenname oder -ID
          {isGoogle ? "; Auto-Tagging (nur gclid) ordnet Leads dem Kanal Google Ads zu, aber keiner Kampagne." : "."}
          {reachNote ? " Reichweite und Frequenz sind nicht über Tage summierbar und darum nicht als Summe ausgewiesen." : ""}
        </Note>
        <Panel title="Kampagnen">
          <DataTable
            columns={[
              { key: "name", label: "Kampagne" },
              { key: "status_label", label: "Status", format: "badge" },
              { key: "type", label: isGoogle ? "Typ" : "Ziel", hideSm: true },
              { key: "budget", label: "Tagesbudget", format: "chf", hideSm: true },
              { key: "cost", label: "Spend", format: "chf" },
              { key: "impressions", label: "Impr.", format: "int" },
              { key: "clicks", label: isGoogle ? "Klicks" : "Klicks (alle)", format: "int" },
              ...(isGoogle ? [] : [{ key: "link_clicks", label: "Link-Klicks", format: "int" as const, hideSm: true }]),
              { key: "ctr", label: "CTR", format: "pct" },
              { key: "cpc", label: "CPC", format: "chf", hideSm: true },
              ...(isGoogle ? [] : [{ key: "cpm", label: "CPM", format: "chf" as const, hideSm: true }]),
              { key: "platform_conversions", label: "Plattf.-Conv.", format: "dec" },
              { key: "cost_per_conv", label: "Kosten/Conv.", format: "chf", hideSm: true },
              { key: "leads", label: "Leads", format: "int" },
              { key: "bookings", label: "Termine", format: "int" },
              { key: "cpl", label: "CPL", format: "chf" },
            ]}
            rows={campRows}
            searchKeys={["name", "type", "status_label"]}
            defaultSort={{ key: "cost", dir: "desc" }}
          />
        </Panel>
        {isGoogle ? (
          <Panel title="Keywords" description="Google wendet Datenschutz-Schwellen an; Suchbegriffe mit wenig Volumen werden nicht ausgewiesen.">
            <DataTable
              columns={[
                { key: "keyword", label: "Keyword" },
                { key: "match", label: "Match Type" },
                { key: "campaign", label: "Kampagne", hideSm: true },
                { key: "group", label: "Anzeigengruppe", hideSm: true },
                { key: "impressions", label: "Impr.", format: "int" },
                { key: "clicks", label: "Klicks", format: "int" },
                { key: "ctr", label: "CTR", format: "pct" },
                { key: "cost", label: "Kosten", format: "chf" },
                { key: "conv", label: "Plattf.-Conv.", format: "dec" },
                { key: "cost_per_conv", label: "Kosten/Conv.", format: "chf", hideSm: true },
              ]}
              rows={kwRows}
              searchKeys={["keyword", "campaign", "group"]}
              defaultSort={{ key: "cost", dir: "desc" }}
              empty="Keine Keyword-Daten (z. B. nur Performance-Max-Kampagnen)"
            />
          </Panel>
        ) : null}
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title={isGoogle ? "Anzeigengruppen" : "Anzeigengruppen (Ad Sets)"}>
            <DataTable
              columns={[
                { key: "group", label: "Gruppe" },
                { key: "campaign", label: "Kampagne", hideSm: true },
                { key: "cost", label: "Kosten", format: "chf" },
                { key: "clicks", label: "Klicks", format: "int" },
                { key: "conv", label: "Plattf.-Conv.", format: "dec" },
              ]}
              rows={groupRows}
              searchKeys={["group", "campaign"]}
              defaultSort={{ key: "cost", dir: "desc" }}
            />
          </Panel>
          <Panel title={isGoogle ? "Anzeigen" : "Anzeigen / Creatives"}>
            <DataTable
              columns={[
                { key: "ad", label: "Anzeige" },
                { key: "group", label: "Gruppe", hideSm: true },
                { key: "cost", label: "Kosten", format: "chf" },
                { key: "ctr", label: "CTR", format: "pct" },
                { key: "conv", label: "Plattf.-Conv.", format: "dec" },
                { key: "cost_per_conv", label: "Kosten/Conv.", format: "chf", hideSm: true },
              ]}
              rows={adRows}
              searchKeys={["ad", "group", "campaign"]}
              defaultSort={{ key: "cost", dir: "desc" }}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
