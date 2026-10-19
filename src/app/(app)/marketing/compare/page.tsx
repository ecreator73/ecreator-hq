import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Note, Panel, SchemaMissing } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { channelLabel } from "@/lib/marketing/channels";
import { formatDay } from "@/lib/marketing/range";
import { ratio, trend } from "@/lib/marketing/format";
import { getSourceStatuses, listConversions, periodKpis, schemaReady, type PeriodKpis } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Vergleiche" };

const METRICS: Array<{ key: string; label: string; format: "int" | "chf" | "pct"; get: (k: PeriodKpis) => number | null }> = [
  { key: "users", label: "Besucher (GA4)", format: "int", get: (k) => k.users },
  { key: "sessions", label: "Sitzungen (GA4)", format: "int", get: (k) => k.sessions },
  { key: "formLeads", label: "Formular-Leads", format: "int", get: (k) => k.formLeads },
  { key: "bookings", label: "Calendly-Buchungen", format: "int", get: (k) => k.bookings },
  { key: "uniqueLeads", label: "Leads total (Personen)", format: "int", get: (k) => k.uniqueLeads },
  { key: "cr", label: "Conversion-Rate", format: "pct", get: (k) => ratio(k.conversions, k.sessions) },
  { key: "spendGoogle", label: "Google Ads Spend", format: "chf", get: (k) => k.spendGoogle },
  { key: "spendMeta", label: "Meta Ads Spend", format: "chf", get: (k) => k.spendMeta },
  { key: "spendTotal", label: "Spend total", format: "chf", get: (k) => k.spendTotal },
  { key: "cpl", label: "Kosten pro Lead", format: "chf", get: (k) => ratio(k.spendTotal, k.conversions) },
  { key: "cpb", label: "Kosten pro Termin", format: "chf", get: (k) => ratio(k.spendTotal, k.bookings) },
  { key: "paid", label: "Leads Paid", format: "int", get: (k) => k.paidLeads },
  { key: "organic", label: "Leads Organic", format: "int", get: (k) => k.organicLeads },
  { key: "direct", label: "Leads Direct", format: "int", get: (k) => k.directLeads },
  { key: "social", label: "Leads Social", format: "int", get: (k) => k.socialLeads },
];

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const flags = { ga4: src.ga4.state !== "setup_required", ads: src.google_ads.state !== "setup_required" || src.meta_ads.state !== "setup_required" };
  const cmp = range.compare;
  const [a, b, ca, cb] = await Promise.all([
    periodKpis(range, flags),
    cmp ? periodKpis(cmp, flags) : Promise.resolve(null),
    listConversions(range),
    cmp ? listConversions(cmp) : Promise.resolve(null),
  ]);

  const rows = METRICS.map((m) => {
    const av = m.get(a.kpis);
    const bv = b ? m.get(b.kpis) : null;
    return { id: m.key, metric: m.label, a: av, b: bv, delta: trend(av, bv), _f: m.format };
  });
  const fmtRows = (f: "int" | "chf" | "pct") => rows.filter((r) => r._f === f);

  const chans = new Map<string, { a: number; b: number }>();
  for (const c of ca ?? []) chans.set(c.channel, { a: (chans.get(c.channel)?.a ?? 0) + 1, b: chans.get(c.channel)?.b ?? 0 });
  for (const c of cb ?? []) chans.set(c.channel, { a: chans.get(c.channel)?.a ?? 0, b: (chans.get(c.channel)?.b ?? 0) + 1 });

  const labelA = `${formatDay(range.from)} – ${formatDay(range.to)}`;
  const labelB = cmp ? `${formatDay(cmp.from)} – ${formatDay(cmp.to)}` : "–";

  return (
    <>
      <PageHead title="Vergleiche" subtitle="Zeitraum gegen Vorperiode oder Vorjahr (Auswahl oben bei «Vergleich»)" range={range} sources={Object.values(src)} />
      {!cmp ? (
        <Note>Bitte oben einen Vergleich wählen (Vorperiode oder Vorjahr).</Note>
      ) : (
        <div className="space-y-5">
          {(["int", "pct", "chf"] as const).map((f) => (
            <Panel key={f} title={f === "int" ? "Volumen" : f === "pct" ? "Quoten" : "Kosten (CHF)"}>
              <DataTable
                columns={[
                  { key: "metric", label: "Kennzahl" },
                  { key: "a", label: labelA, format: f },
                  { key: "b", label: labelB, format: f },
                  { key: "delta", label: "Veränderung", format: "pct" },
                ]}
                rows={fmtRows(f).map(({ _f: _unused, ...r }) => r)}
              />
            </Panel>
          ))}
          <Panel title="Anfragen nach Kanal">
            <DataTable
              columns={[
                { key: "channel", label: "Kanal" },
                { key: "a", label: labelA, format: "int" },
                { key: "b", label: labelB, format: "int" },
                { key: "delta", label: "Veränderung", format: "pct" },
              ]}
              rows={[...chans.entries()].map(([k, v]) => ({ id: k, channel: channelLabel(k), a: v.a, b: v.b, delta: trend(v.a, v.b) }))}
              defaultSort={{ key: "a", dir: "desc" }}
            />
          </Panel>
          <Note>«–» = Quelle im Zeitraum nicht verbunden oder keine Daten; dann wird keine Veränderung berechnet.</Note>
        </div>
      )}
    </>
  );
}
