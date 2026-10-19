import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Kpi, KpiGrid, Note, Panel, SchemaMissing } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { CONFIDENCE_LABELS, channelLabel } from "@/lib/marketing/channels";
import { fmtInt, fmtPct, ratio } from "@/lib/marketing/format";
import { getSourceStatuses, listChannelMetrics, listConversions, listMarketingLeads, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Attribution" };

const PLATFORM_OF: Record<string, "google_ads" | "meta_ads"> = { google_ads: "google_ads", meta_ads: "meta_ads" };

export default async function AttributionPage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const [conv, leads, metrics, src] = await Promise.all([listConversions(range), listMarketingLeads(range), listChannelMetrics(range), getSourceStatuses()]);
  const events = conv ?? [];
  const L = leads ?? [];

  // Pro Kanal: Plattform-Conversions | Website-Leads | Buchungen | CRM-Ergebnis | Spend
  const ch = new Map<string, { leads: number; bookings: number; won: number; meetings: number; platformConv: number | null; spend: number | null }>();
  const get = (k: string) => {
    let e = ch.get(k);
    if (!e) ch.set(k, (e = { leads: 0, bookings: 0, won: 0, meetings: 0, platformConv: null, spend: null }));
    return e;
  };
  for (const e of events) {
    const x = get(e.channel);
    if (e.kind === "booking") x.bookings++;
    else x.leads++;
  }
  for (const l of L) {
    const x = get(l.ft_channel ?? "unknown");
    if (l.status?.key === "abgeschlossen") x.won++;
    if (l.status?.key === "termin_gebucht") x.meetings++;
  }
  for (const m of metrics ?? []) {
    const k = Object.keys(PLATFORM_OF).find((c) => PLATFORM_OF[c] === m.platform);
    if (!k) continue;
    const x = get(k);
    x.platformConv = (x.platformConv ?? 0) + m.platform_conversions;
    if (m.currency === "CHF") x.spend = (x.spend ?? 0) + m.cost_micros;
  }
  const channelRows = [...ch.entries()].map(([k, v]) => ({
    id: k,
    channel: channelLabel(k),
    platform: v.platformConv,
    leads: v.leads,
    bookings: v.bookings,
    meetings: v.meetings,
    won: v.won,
    spend: v.spend,
    cpl: ratio(v.spend, v.leads + v.bookings),
    cpb: ratio(v.spend, v.bookings),
  }));

  const group = (key: (e: (typeof events)[number]) => string | null) => {
    const m = new Map<string, { leads: number; bookings: number }>();
    for (const e of events) {
      const k = key(e) || "(nicht gesetzt)";
      const x = m.get(k) ?? { leads: 0, bookings: 0 };
      if (e.kind === "booking") x.bookings++;
      else x.leads++;
      m.set(k, x);
    }
    return [...m.entries()].map(([k, v]) => ({ id: k, name: k, leads: v.leads, bookings: v.bookings, total: v.leads + v.bookings }));
  };

  const ftlt = new Map<string, { ft: number; lt: number }>();
  for (const l of L) {
    const a = ftlt.get(l.ft_channel ?? "unknown") ?? { ft: 0, lt: 0 };
    a.ft++;
    ftlt.set(l.ft_channel ?? "unknown", a);
    const b = ftlt.get(l.lt_channel ?? "unknown") ?? { ft: 0, lt: 0 };
    b.lt++;
    ftlt.set(l.lt_channel ?? "unknown", b);
  }
  const unattributed = events.filter((e) => e.channel === "unknown").length;
  const conf = new Map<string, number>();
  for (const e of events) conf.set(e.attribution_confidence, (conf.get(e.attribution_confidence) ?? 0) + 1);

  return (
    <>
      <PageHead title="Attribution" subtitle="Leads und Buchungen nach Kanal, Kampagne und Landingpage – Plattform, First-Party und CRM getrennt" range={range} showCompare={false} sources={[src.website, src.calendly, src.google_ads, src.meta_ads]} />
      <div className="space-y-5">
        <KpiGrid>
          <Kpi label="Anfragen" value={fmtInt(events.length)} compare={false} hint="Formulare + Buchungen" />
          <Kpi label="Unknown / Unattributed" value={fmtInt(unattributed)} compare={false} hint={fmtPct(ratio(unattributed, events.length))} />
          {[...conf.entries()].map(([k, v]) => (
            <Kpi key={k} label={CONFIDENCE_LABELS[k] ?? k} value={fmtInt(v)} compare={false} hint={fmtPct(ratio(v, events.length))} />
          ))}
        </KpiGrid>

        <Panel title="Nach Kanal" description="Plattform-Conv. = Angabe von Google/Meta (deren Attribution) · Website-Leads/Buchungen = erste Partei · Termin/Gewonnen = CRM-Status (First Touch)">
          <DataTable
            columns={[
              { key: "channel", label: "Kanal" },
              { key: "platform", label: "Plattform-Conv.", format: "dec" },
              { key: "leads", label: "Website-Leads", format: "int" },
              { key: "bookings", label: "Buchungen", format: "int" },
              { key: "meetings", label: "CRM: Termin", format: "int", hideSm: true },
              { key: "won", label: "CRM: Gewonnen", format: "int", hideSm: true },
              { key: "spend", label: "Spend", format: "chf" },
              { key: "cpl", label: "CPL", format: "chf" },
              { key: "cpb", label: "Kosten/Buchung", format: "chf", hideSm: true },
            ]}
            rows={channelRows}
            defaultSort={{ key: "leads", dir: "desc" }}
            empty="Keine Anfragen im Zeitraum"
          />
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Nach Kampagne (utm_campaign)">
            <DataTable
              columns={[
                { key: "name", label: "Kampagne" },
                { key: "leads", label: "Leads", format: "int" },
                { key: "bookings", label: "Buchungen", format: "int" },
              ]}
              rows={group((e) => e.utm_campaign)}
              defaultSort={{ key: "total", dir: "desc" }}
            />
          </Panel>
          <Panel title="Nach Landingpage (Einstieg)">
            <DataTable
              columns={[
                { key: "name", label: "Landingpage" },
                { key: "leads", label: "Leads", format: "int" },
                { key: "bookings", label: "Buchungen", format: "int" },
              ]}
              rows={group((e) => e.landing_page)}
              defaultSort={{ key: "total", dir: "desc" }}
            />
          </Panel>
        </div>

        <Panel title="First Touch vs. Last Touch" description="Leads mit Anfrage im Zeitraum. Unterschiede entstehen bei Wiederholungsanfragen über andere Kanäle.">
          <DataTable
            columns={[
              { key: "channel", label: "Kanal" },
              { key: "ft", label: "First Touch", format: "int" },
              { key: "lt", label: "Last Touch", format: "int" },
            ]}
            rows={[...ftlt.entries()].map(([k, v]) => ({ id: k, channel: channelLabel(k), ...v }))}
            defaultSort={{ key: "ft", dir: "desc" }}
          />
        </Panel>

        <Note>
          Grenzen: Attribution gilt pro Browser-Tab-Sitzung (sessionStorage, kein Cookie, kein Cross-Device). Kommt jemand später direkt zurück, zählt die Anfrage als
          «Direct». Klick-IDs werden nur gespeichert, wenn die Website sie in der URL erhielt. Kosten werden nur Google Ads und Meta Ads zugeordnet.
        </Note>
      </div>
    </>
  );
}
