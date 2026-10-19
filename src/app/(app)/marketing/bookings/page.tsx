import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Kpi, KpiGrid, Note, Panel, SchemaMissing, SetupRequired } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { channelLabel } from "@/lib/marketing/channels";
import { fmtInt, fmtMicros, ratio } from "@/lib/marketing/format";
import { rangeQuery } from "@/lib/marketing/range";
import { countableBookings, getSourceStatuses, listBookings, listChannelMetrics, schemaReady, spendSummary } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Calendly-Buchungen" };

const STATUS: Record<string, { label: string; color: string }> = {
  active: { label: "Bestätigt", color: "green" },
  canceled: { label: "Abgesagt", color: "red" },
  rescheduled: { label: "Verschoben", color: "amber" },
};
const ATTR: Record<string, string> = { attributed: "Attributed", partial: "Partially Attributed", unattributed: "Unattributed" };

export default async function BookingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const [rows, prevRows, metrics] = await Promise.all([
    listBookings(range),
    range.compare ? listBookings(range.compare) : Promise.resolve(null),
    listChannelMetrics(range),
  ]);
  const all = rows ?? [];
  const counted = countableBookings(all);
  const prevCounted = prevRows ? countableBookings(prevRows) : null;
  const spend = metrics && metrics.length ? spendSummary(metrics).total : null;
  const bySource = new Map<string, number>();
  for (const b of counted) bySource.set(b.channel ?? "unknown", (bySource.get(b.channel ?? "unknown") ?? 0) + 1);

  const table = all.map((b) => ({
    id: b.id,
    href: b.lead_id ? `/marketing/leads/${b.lead_id}` : null,
    name: b.invitee_name,
    email: b.invitee_email,
    type: b.event_name,
    booked: b.booked_at,
    start: b.start_time,
    source: b.utm_source,
    medium: b.utm_medium,
    campaign: b.utm_campaign,
    channel: channelLabel(b.channel),
    landing: b.landing_page,
    status: STATUS[b.status]?.label ?? b.status,
    status_color: STATUS[b.status]?.color ?? "gray",
    attribution: ATTR[b.attribution_status] ?? b.attribution_status,
    lead: b.lead_id ? "Lead öffnen" : null,
  }));

  return (
    <>
      <PageHead
        title="Calendly-Buchungen"
        subtitle="Buchungen, Absagen und Verschiebungen (Webhook + Website-Widget, ohne Dubletten)"
        range={range}
        sources={[src.calendly, src.website]}
        actions={
          <a href={`/api/marketing/export?type=bookings&${rangeQuery(range)}`} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
            CSV exportieren
          </a>
        }
      />
      <div className="space-y-5">
        {src.calendly.state === "setup_required" ? (
          <SetupRequired detail="Ohne Calendly-Token und Webhook erscheinen nur Buchungen über das eingebettete Widget der Website. Direktbuchungen, Absagen und Verschiebungen fehlen." />
        ) : null}
        <KpiGrid>
          <Kpi label="Buchungen total" value={fmtInt(counted.length)} cur={counted.length} prev={prevCounted?.length} hint="neue Buchungen" />
          <Kpi label="Bestätigt" value={fmtInt(counted.filter((b) => b.status === "active").length)} compare={false} />
          <Kpi label="Abgesagt" value={fmtInt(counted.filter((b) => b.status === "canceled").length)} compare={false} />
          <Kpi label="Verschoben" value={fmtInt(all.filter((b) => b.status === "rescheduled").length)} compare={false} />
          <Kpi label="Kosten pro Buchung" value={fmtMicros(ratio(spend, counted.length))} compare={false} missing={spend == null ? "Werbekosten: Integration erforderlich" : null} />
          <Kpi label="Unattributed" value={fmtInt(counted.filter((b) => b.attribution_status === "unattributed").length)} compare={false} />
        </KpiGrid>
        <Panel title="Buchungen nach Quelle">
          <DataTable
            columns={[
              { key: "channel", label: "Kanal" },
              { key: "count", label: "Buchungen", format: "int" },
            ]}
            rows={[...bySource.entries()].map(([k, v]) => ({ id: k, channel: channelLabel(k), count: v }))}
            defaultSort={{ key: "count", dir: "desc" }}
            empty="Keine Buchungen im Zeitraum"
          />
        </Panel>
        <Panel title="Alle Buchungen">
          <DataTable
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "E-Mail", hideSm: true },
              { key: "type", label: "Event-Typ", hideSm: true },
              { key: "booked", label: "Gebucht am", format: "datetime" },
              { key: "start", label: "Termin", format: "datetime" },
              { key: "source", label: "Quelle", hideSm: true },
              { key: "medium", label: "Medium", hideSm: true },
              { key: "campaign", label: "Kampagne", hideSm: true },
              { key: "landing", label: "Landingpage", hideSm: true },
              { key: "status", label: "Status", format: "badge" },
              { key: "attribution", label: "Attribution", hideSm: true },
              { key: "lead", label: "Lead", hrefKey: "href" },
            ]}
            rows={table}
            searchKeys={["name", "email", "type", "campaign", "source", "landing"]}
            defaultSort={{ key: "booked", dir: "desc" }}
            empty="Keine Buchungen im Zeitraum"
          />
        </Panel>
        <Note>
          Attributed = Website kennt Einstieg, Referrer und Klick-IDs · Partially Attributed = nur UTM aus Calendly · Unattributed = keine Herkunft bekannt.
          Eine Verschiebung zählt nicht als neue Buchung.
        </Note>
      </div>
    </>
  );
}
