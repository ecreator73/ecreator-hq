import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/marketing/page-head";
import { Kpi, KpiGrid, Note, Panel, SchemaMissing } from "@/components/marketing/ui";
import { TrendChart } from "@/components/marketing/trend-chart";
import { DataTable } from "@/components/marketing/data-table";
import { fmtInt, fmtMicros, fmtPct, ratio } from "@/lib/marketing/format";
import { CHANNEL_GROUP_LABELS, channelGroup, channelLabel } from "@/lib/marketing/channels";
import { formatAgo } from "@/lib/marketing/range";
import { getSourceStatuses, listActivity, listConversions, periodKpis, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "./_shared";

export const metadata: Metadata = { title: "Marketing Overview" };

export default async function MarketingOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) {
    return (
      <>
        <PageHead title="Marketing Overview" subtitle="Alle wichtigen Website-, Marketing- und Conversion-Daten auf einen Blick" />
        <SchemaMissing />
      </>
    );
  }
  const src = await getSourceStatuses();
  const ga4 = src.ga4.state === "connected" || src.ga4.state === "pending";
  const ads = ["connected", "pending"].includes(src.google_ads.state) || ["connected", "pending"].includes(src.meta_ads.state);
  const flags = { ga4, ads };

  const [cur, prev, conv, activity] = await Promise.all([
    periodKpis(range, flags),
    range.compare ? periodKpis(range.compare, flags) : Promise.resolve(null),
    listConversions(range),
    listActivity({ limit: 6 }),
  ]);
  const k = cur.kpis;
  const p = prev?.kpis ?? null;

  const ga4Missing = ga4 ? null : "GA4: Integration erforderlich";
  const adsMissing = ads ? null : "Google/Meta Ads: Integration erforderlich";
  const cr = ratio(k.conversions, k.sessions);
  const crPrev = p ? ratio(p.conversions, p.sessions) : null;
  const cpl = ratio(k.spendTotal, k.conversions);
  const cplPrev = p ? ratio(p.spendTotal, p.conversions) : null;
  const cpb = ratio(k.spendTotal, k.bookings);
  const cpbPrev = p ? ratio(p.spendTotal, p.bookings) : null;
  const compareLabel = range.compareKey === "yoy" ? "Vorjahr" : range.compareKey === "prev" ? "Vorperiode" : null;

  // Leads nach Kanal (First-Party)
  const byChannel = new Map<string, { leads: number; bookings: number }>();
  for (const c of conv ?? []) {
    const e = byChannel.get(c.channel) ?? { leads: 0, bookings: 0 };
    if (c.kind === "booking") e.bookings++;
    else e.leads++;
    byChannel.set(c.channel, e);
  }
  const channelRows = [...byChannel.entries()].map(([ch, v]) => ({
    id: ch,
    channel: channelLabel(ch),
    group: CHANNEL_GROUP_LABELS[channelGroup(ch)] ?? "",
    leads: v.leads,
    bookings: v.bookings,
    total: v.leads + v.bookings,
    share: conv && conv.length ? (v.leads + v.bookings) / conv.length : null,
  }));

  return (
    <>
      <PageHead
        title="Marketing Overview"
        subtitle="Alle wichtigen Website-, Marketing- und Conversion-Daten auf einen Blick"
        range={range}
        sources={Object.values(src)}
      />

      <div className="space-y-5">
        <KpiGrid>
          <Kpi label="Besucher" value={fmtInt(k.users)} cur={k.users} prev={p?.users} missing={ga4Missing} hint="eindeutige Nutzer (GA4)" />
          <Kpi label="Sitzungen" value={fmtInt(k.sessions)} cur={k.sessions} prev={p?.sessions} missing={ga4Missing} />
          <Kpi label="Seitenaufrufe" value={fmtInt(k.views)} cur={k.views} prev={p?.views} missing={ga4Missing} />
          <Kpi label="Neue Besucher" value={fmtInt(k.newUsers)} cur={k.newUsers} prev={p?.newUsers} missing={ga4Missing} />
          <Kpi label="Wiederkehrende" value={fmtInt(k.returningUsers)} cur={k.returningUsers} prev={p?.returningUsers} missing={ga4Missing} />
          <Kpi label="Conversion-Rate" value={fmtPct(cr)} cur={cr} prev={crPrev} missing={ga4Missing} hint="Anfragen pro Sitzung" />

          <Kpi label="Formular-Leads" value={fmtInt(k.formLeads)} cur={k.formLeads} prev={p?.formLeads} hint="Website, ohne Dubletten" />
          <Kpi label="Calendly-Buchungen" value={fmtInt(k.bookings)} cur={k.bookings} prev={p?.bookings} hint={k.bookingsActive != null ? `${fmtInt(k.bookingsActive)} aktiv` : undefined} />
          <Kpi label="Leads total" value={fmtInt(k.uniqueLeads)} cur={k.uniqueLeads} prev={p?.uniqueLeads} hint="eindeutige Personen" />
          <Kpi label="Organischer Traffic" value={fmtInt(k.organicSessions)} cur={k.organicSessions} prev={p?.organicSessions} missing={ga4Missing} hint="Sitzungen" />
          <Kpi label="Bezahlter Traffic" value={fmtInt(k.paidSessions)} cur={k.paidSessions} prev={p?.paidSessions} missing={ga4Missing} hint="Sitzungen" />
          <Kpi label="Leads Paid / Organic" value={`${fmtInt(k.paidLeads)} / ${fmtInt(k.organicLeads)}`} compare={false} hint={`Direct ${fmtInt(k.directLeads)} · Social ${fmtInt(k.socialLeads)}`} />

          <Kpi label="Google Ads Spend" value={fmtMicros(k.spendGoogle, 0)} cur={k.spendGoogle} prev={p?.spendGoogle} missing={src.google_ads.state === "setup_required" ? "Integration erforderlich" : null} inverse />
          <Kpi label="Meta Ads Spend" value={fmtMicros(k.spendMeta, 0)} cur={k.spendMeta} prev={p?.spendMeta} missing={src.meta_ads.state === "setup_required" ? "Integration erforderlich" : null} inverse />
          <Kpi label="Spend total" value={fmtMicros(k.spendTotal, 0)} cur={k.spendTotal} prev={p?.spendTotal} missing={adsMissing} inverse />
          <Kpi label="Kosten pro Lead" value={fmtMicros(cpl)} cur={cpl} prev={cplPrev} missing={adsMissing} inverse hint="Spend / Website-Anfragen" />
          <Kpi label="Kosten pro Termin" value={fmtMicros(cpb)} cur={cpb} prev={cpbPrev} missing={adsMissing} inverse hint="Spend / Buchungen" />
          <Kpi label="ROAS" value="nicht verfügbar" compare={false} hint="keine Umsatzdaten verknüpft" />
        </KpiGrid>

        {k.otherCurrencies.length ? (
          <Note tone="warning">
            Werbekosten in {k.otherCurrencies.join(", ")} sind nicht in CHF umgerechnet und in den Summen nicht enthalten.
          </Note>
        ) : null}

        <Panel title="Entwicklung" description="Website-Leads = bestätigte Anfragen der Website (erste Partei). Plattform-Conversions von Google/Meta sind hier nicht enthalten.">
          <TrendChart
            points={cur.daily}
            comparePoints={prev?.daily ?? null}
            compareLabel={compareLabel}
            missing={{
              users: ga4Missing ?? undefined,
              sessions: ga4Missing ?? undefined,
              cr: ga4Missing ?? undefined,
              spend: adsMissing ?? undefined,
              cpl: adsMissing ?? undefined,
              google_meta: adsMissing ?? undefined,
              organic_paid: ga4Missing ?? undefined,
            }}
          />
        </Panel>

        <div className="grid gap-5 lg:grid-cols-5">
          <Panel title="Anfragen nach Kanal" description="First-Party-Attribution (UTM, Klick-IDs, Referrer)" className="lg:col-span-3">
            <DataTable
              columns={[
                { key: "channel", label: "Kanal" },
                { key: "group", label: "Gruppe", hideSm: true },
                { key: "leads", label: "Formulare", format: "int" },
                { key: "bookings", label: "Buchungen", format: "int" },
                { key: "total", label: "Total", format: "int" },
                { key: "share", label: "Anteil", format: "pct" },
              ]}
              rows={channelRows}
              defaultSort={{ key: "total", dir: "desc" }}
              empty="Noch keine Website-Anfragen im Zeitraum"
            />
          </Panel>
          <Panel
            title="Live-Aktivität"
            description="Nur echte First-Party-Ereignisse"
            className="lg:col-span-2"
            actions={
              <Link href="/marketing/live" className="text-xs font-medium text-brand-700 hover:underline">
                Alle
              </Link>
            }
          >
            {activity && activity.length ? (
              <ul className="divide-y divide-neutral-100">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-neutral-800">
                        {a.lead_id ? (
                          <Link href={`/marketing/leads/${a.lead_id}`} className="hover:underline">
                            {a.title}
                          </Link>
                        ) : (
                          a.title
                        )}
                      </p>
                      {a.detail ? <p className="truncate text-[11px] text-neutral-500">{a.detail}</p> : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-neutral-400">{formatAgo(a.occurred_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-xs text-neutral-500">Noch keine Ereignisse</p>
            )}
          </Panel>
        </div>

        <Note>
          Zählweisen getrennt: <strong>Plattform-Conversions</strong> (Google/Meta, deren Attribution) · <strong>Website-Leads</strong> (bestätigte
          Anfragen, erste Partei) · <strong>CRM-Ergebnis</strong> (Status im Vertrieb). Nutzer ≠ Sitzungen. Kosten pro Lead/Termin beziehen den
          gesamten Werbe-Spend auf alle Website-Anfragen bzw. Buchungen.
        </Note>
      </div>
    </>
  );
}
