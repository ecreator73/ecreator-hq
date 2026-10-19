import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Note, Panel, SchemaMissing, SetupRequired } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { ratio } from "@/lib/marketing/format";
import { channelGroup, classifyGa4 } from "@/lib/marketing/channels";
import { countableBookings, ga4Report, getSourceStatuses, listBookings, listConversions, listGa4Traffic, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Landingpages" };

export default async function LandingpagesPage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const ga4On = src.ga4.state !== "setup_required";
  const [traffic, users, conv, bookings] = await Promise.all([
    ga4On ? listGa4Traffic(range) : Promise.resolve(null),
    ga4On ? ga4Report(range, ["landingPage", "pageTitle"], ["totalUsers"], 500) : Promise.resolve(null),
    listConversions(range),
    listBookings(range),
  ]);

  type Agg = { title: string | null; sessions: number | null; users: number | null; google: number | null; meta: number | null; organic: number | null; forms: number; bookings: number };
  const m = new Map<string, Agg>();
  const get = (k: string) => {
    let a = m.get(k);
    if (!a) m.set(k, (a = { title: null, sessions: traffic ? 0 : null, users: users ? 0 : null, google: traffic ? 0 : null, meta: traffic ? 0 : null, organic: traffic ? 0 : null, forms: 0, bookings: 0 }));
    return a;
  };
  for (const r of traffic ?? []) {
    const a = get(r.landing_page || "(nicht gesetzt)");
    a.sessions = (a.sessions ?? 0) + r.sessions;
    const ch = classifyGa4(r.source, r.medium);
    if (ch === "google_ads") a.google = (a.google ?? 0) + r.sessions;
    if (ch === "meta_ads") a.meta = (a.meta ?? 0) + r.sessions;
    if (channelGroup(ch) === "organic") a.organic = (a.organic ?? 0) + r.sessions;
  }
  for (const u of users ?? []) {
    const a = get(u.dims[0] || "(nicht gesetzt)");
    a.users = (a.users ?? 0) + (u.values[0] ?? 0);
    a.title ??= u.dims[1] ?? null;
  }
  for (const c of conv ?? []) if (c.kind === "form") get(c.landing_page || "(unbekannt)").forms++;
  for (const b of countableBookings(bookings ?? [])) get(b.landing_page || "(unbekannt)").bookings++;

  const totalSessions = [...m.values()].reduce((s, a) => s + (a.sessions ?? 0), 0);
  const totalConv = [...m.values()].reduce((s, a) => s + a.forms + a.bookings, 0);
  const siteCr = ratio(totalConv, totalSessions);

  const rows = [...m.entries()].map(([path, a]) => {
    const cr = a.sessions ? (a.forms + a.bookings) / a.sessions : null;
    let hint: string | null = null;
    if (a.sessions != null && a.sessions < 30) hint = "zu wenig Daten";
    else if (a.sessions != null && siteCr != null && cr != null) {
      if (a.sessions >= 100 && cr < siteCr * 0.5) hint = "viel Traffic, wenig Conversion";
      else if (a.sessions >= 50 && cr > siteCr * 1.5) hint = "überdurchschnittliche Conversion";
    }
    return { id: path, path, title: a.title, sessions: a.sessions, users: a.users, google: a.google, meta: a.meta, organic: a.organic, forms: a.forms, bookings: a.bookings, cr, spend: null, hint };
  });

  return (
    <>
      <PageHead title="Landingpages" subtitle="Einstiegsseiten: Traffic nach Herkunft, Formulare, Buchungen und Conversion-Rate" range={range} showCompare={false} sources={[src.ga4, src.website]} />
      <div className="space-y-5">
        {!ga4On ? <SetupRequired detail="Ohne GA4 fehlen Sitzungen und Nutzer je Landingpage. Formulare und Buchungen sind vollständig." /> : null}
        <Panel title="Landingpages">
          <DataTable
            columns={[
              { key: "path", label: "URL" },
              { key: "title", label: "Titel", hideSm: true },
              { key: "sessions", label: "Sitzungen", format: "int" },
              { key: "users", label: "Nutzer*", format: "int", hideSm: true, title: "Summe je Titel" },
              { key: "google", label: "Google Ads", format: "int", hideSm: true },
              { key: "meta", label: "Meta Ads", format: "int", hideSm: true },
              { key: "organic", label: "Organic", format: "int", hideSm: true },
              { key: "forms", label: "Formulare", format: "int" },
              { key: "bookings", label: "Buchungen", format: "int" },
              { key: "cr", label: "CR", format: "pct" },
              { key: "spend", label: "Spend", format: "chf", hideSm: true, title: "nur mit Landingpage-Bericht der Plattform zurechenbar" },
              { key: "hint", label: "Hinweis" },
            ]}
            rows={rows}
            searchKeys={["path", "title"]}
            defaultSort={{ key: "sessions", dir: "desc" }}
          />
        </Panel>
        <Note>
          Hinweise nur ab genügend Daten (≥ 100 Sitzungen für «wenig Conversion», ≥ 50 für «überdurchschnittlich», Vergleich zur Website-CR). Spend je Landingpage ist ohne den
          Landingpage-Bericht der Werbeplattform nicht zurechenbar und wird darum nicht geschätzt.
        </Note>
      </div>
    </>
  );
}
