import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Note, Panel, SchemaMissing, SetupRequired } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { ratio } from "@/lib/marketing/format";
import { channelLabel, classifyGa4 } from "@/lib/marketing/channels";
import { countableBookings, ga4Report, getSourceStatuses, listBookings, listChannelMetrics, listConversions, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Traffic-Quellen" };

const ORDER = ["google_organic", "google_ads", "meta_ads", "meta_organic", "meta_unclear", "tiktok", "linkedin", "direct", "referral", "email", "microsoft_ads", "other_paid", "other_search", "other", "unknown"];

export default async function SourcesPage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const ga4On = src.ga4.state !== "setup_required";
  const [ga4, conv, bookings, metrics] = await Promise.all([
    ga4On ? ga4Report(range, ["sessionSource", "sessionMedium"], ["totalUsers", "sessions", "engagedSessions", "keyEvents"], 1000) : Promise.resolve(null),
    listConversions(range),
    listBookings(range),
    listChannelMetrics(range),
  ]);

  type Agg = { users: number | null; sessions: number | null; engaged: number | null; key: number | null; leads: number; bookings: number; spend: number | null };
  const m = new Map<string, Agg>();
  const get = (k: string) => {
    let a = m.get(k);
    if (!a) m.set(k, (a = { users: ga4 ? 0 : null, sessions: ga4 ? 0 : null, engaged: ga4 ? 0 : null, key: ga4 ? 0 : null, leads: 0, bookings: 0, spend: null }));
    return a;
  };
  for (const r of ga4 ?? []) {
    const a = get(classifyGa4(r.dims[0] ?? "", r.dims[1] ?? ""));
    a.users = (a.users ?? 0) + (r.values[0] ?? 0);
    a.sessions = (a.sessions ?? 0) + (r.values[1] ?? 0);
    a.engaged = (a.engaged ?? 0) + (r.values[2] ?? 0);
    a.key = (a.key ?? 0) + (r.values[3] ?? 0);
  }
  for (const c of conv ?? []) if (c.kind === "form") get(c.channel).leads++;
  for (const b of countableBookings(bookings ?? [])) get(b.channel ?? "unknown").bookings++;
  for (const x of metrics ?? []) {
    if (x.currency !== "CHF") continue;
    const a = get(x.platform);
    a.spend = (a.spend ?? 0) + x.cost_micros;
  }
  const rows = [...m.entries()]
    .sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]))
    .map(([k, a]) => ({
      id: k,
      channel: channelLabel(k),
      users: a.users,
      sessions: a.sessions,
      engaged: a.engaged,
      rate: ratio(a.engaged, a.sessions),
      key: a.key,
      leads: a.leads,
      bookings: a.bookings,
      cr: a.sessions ? (a.leads + a.bookings) / a.sessions : null,
      spend: a.spend,
      cpl: ratio(a.spend, a.leads + a.bookings),
      cpb: ratio(a.spend, a.bookings),
    }));

  return (
    <>
      <PageHead title="Traffic-Quellen" subtitle="Einheitliche Kanalklassifizierung für GA4-Traffic und Website-Leads (bezahlt nie als organisch)" range={range} showCompare={false} sources={[src.ga4, src.website, src.google_ads, src.meta_ads]} />
      <div className="space-y-5">
        {!ga4On ? <SetupRequired detail="Ohne GA4 fehlen Nutzer, Sitzungen und Engagement. Leads und Buchungen je Kanal sind unten trotzdem vollständig." /> : null}
        <Panel title="Kanäle">
          <DataTable
            columns={[
              { key: "channel", label: "Kanal" },
              { key: "users", label: "Nutzer*", format: "int", title: "Summe je Quelle/Medium, nicht eindeutig über Quellen" },
              { key: "sessions", label: "Sitzungen", format: "int" },
              { key: "engaged", label: "Engagiert", format: "int", hideSm: true },
              { key: "rate", label: "Engagement-Rate", format: "pct", hideSm: true },
              { key: "key", label: "Key Events", format: "dec", hideSm: true },
              { key: "leads", label: "Leads", format: "int" },
              { key: "bookings", label: "Buchungen", format: "int" },
              { key: "cr", label: "CR", format: "pct" },
              { key: "spend", label: "Spend", format: "chf" },
              { key: "cpl", label: "CPL", format: "chf" },
              { key: "cpb", label: "Kosten/Buchung", format: "chf", hideSm: true },
            ]}
            rows={rows}
            empty="Keine Daten verfügbar"
          />
        </Panel>
        <Note>
          Sitzungen kommen aus GA4 (nur mit Einwilligung, Consent Mode), Leads aus der ersten Partei (immer). Darum kann die CR je Kanal über 100 % liegen, wenn wenige Besucher eingewilligt haben.
          Key Events = GA4-Zählung, nicht identisch mit bestätigten Website-Leads.
        </Note>
      </div>
    </>
  );
}
