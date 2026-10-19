import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/marketing/page-head";
import { Panel, SchemaMissing } from "@/components/marketing/ui";
import { PrintButton } from "@/components/audits/print-button";
import { fmtInt, fmtMicros, fmtPct, ratio, trend } from "@/lib/marketing/format";
import { formatDay, rangeQuery } from "@/lib/marketing/range";
import { getSourceStatuses, periodKpis, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Berichte" };

const REPORTS = [
  { label: "Executive", href: "/marketing", text: "Gesamtbild: Besucher, Leads, Termine, Kosten" },
  { label: "Website", href: "/marketing/analytics", text: "GA4: Seiten, Geräte, Länder, Engagement" },
  { label: "Leadgenerierung", href: "/marketing/leads", text: "Alle Leads mit Quelle und Status" },
  { label: "Google Ads", href: "/marketing/google-ads", text: "Kampagnen, Anzeigen, Keywords" },
  { label: "Meta Ads", href: "/marketing/meta-ads", text: "Kampagnen, Ad Sets, Creatives" },
  { label: "SEO", href: "/marketing/search-console", text: "Klicks, Suchanfragen, Seiten, Position" },
  { label: "Calendly", href: "/marketing/bookings", text: "Buchungen, Absagen, Verschiebungen" },
  { label: "Landingpages", href: "/marketing/landingpages", text: "Einstiegsseiten und Conversion" },
  { label: "Attribution", href: "/marketing/attribution", text: "Kanal, Kampagne, First/Last Touch" },
];

const EXPORTS = [
  { type: "leads", label: "Leads (CSV)" },
  { type: "conversions", label: "Conversion-Ereignisse (CSV)" },
  { type: "bookings", label: "Calendly-Buchungen (CSV)" },
  { type: "campaigns", label: "Kampagnen je Tag (CSV)" },
  { type: "keywords", label: "Google-Ads-Keywords je Tag (CSV)" },
];

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const flags = { ga4: src.ga4.state !== "setup_required", ads: src.google_ads.state !== "setup_required" || src.meta_ads.state !== "setup_required" };
  const [cur, prev] = await Promise.all([periodKpis(range, flags), range.compare ? periodKpis(range.compare, flags) : Promise.resolve(null)]);
  const k = cur.kpis;
  const p = prev?.kpis;
  const lines: Array<[string, string, number | null | undefined, number | null | undefined]> = [
    ["Besucher (GA4)", flags.ga4 ? fmtInt(k.users) : "Integration erforderlich", k.users, p?.users],
    ["Website-Anfragen", fmtInt(k.conversions), k.conversions, p?.conversions],
    ["davon Formulare", fmtInt(k.formLeads), k.formLeads, p?.formLeads],
    ["Calendly-Buchungen", fmtInt(k.bookings), k.bookings, p?.bookings],
    ["Leads (Personen)", fmtInt(k.uniqueLeads), k.uniqueLeads, p?.uniqueLeads],
    ["Werbekosten", flags.ads ? fmtMicros(k.spendTotal, 0) : "Integration erforderlich", k.spendTotal, p?.spendTotal],
    ["Kosten pro Lead", flags.ads ? fmtMicros(ratio(k.spendTotal, k.conversions)) : "Integration erforderlich", ratio(k.spendTotal, k.conversions), p ? ratio(p.spendTotal, p.conversions) : null],
    ["Kosten pro Termin", flags.ads ? fmtMicros(ratio(k.spendTotal, k.bookings)) : "Integration erforderlich", ratio(k.spendTotal, k.bookings), p ? ratio(p.spendTotal, p.bookings) : null],
  ];
  const q = rangeQuery(range);

  return (
    <>
      <PageHead title="Berichte" subtitle="Executive Summary zum Drucken/als PDF, Detailberichte und CSV-Exporte" range={range} actions={<PrintButton />} />
      <div className="space-y-5">
        <Panel title={`Executive Summary · ${formatDay(range.from)} – ${formatDay(range.to)}`} description={range.compare ? `Vergleich: ${formatDay(range.compare.from)} – ${formatDay(range.compare.to)}` : undefined}>
          <table className="w-full text-sm">
            <tbody>
              {lines.map(([label, value, c, pv]) => {
                const t = trend(c ?? null, pv ?? null);
                return (
                  <tr key={label} className="border-t border-neutral-100 first:border-0">
                    <td className="py-2 text-neutral-600">{label}</td>
                    <td className="py-2 text-right font-medium tabular-nums text-neutral-900">{value}</td>
                    <td className="w-28 py-2 text-right text-xs tabular-nums text-neutral-500">{t == null ? "–" : `${t > 0 ? "+" : ""}${fmtPct(t)}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
        <div className="grid gap-5 lg:grid-cols-2 print:hidden">
          <Panel title="Detailberichte">
            <ul className="divide-y divide-neutral-100">
              {REPORTS.map((r) => (
                <li key={r.href} className="py-2">
                  <Link href={`${r.href}?${q}`} className="text-sm font-medium text-neutral-900 hover:text-brand-700 hover:underline">
                    {r.label}
                  </Link>
                  <p className="text-xs text-neutral-500">{r.text}</p>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Exporte" description="Serverseitig erzeugt, jeder Export wird protokolliert (enthält Personendaten)">
            <ul className="space-y-2">
              {EXPORTS.map((e) => (
                <li key={e.type}>
                  <a href={`/api/marketing/export?type=${e.type}&${q}`} className="text-sm font-medium text-brand-700 hover:underline">
                    {e.label}
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
