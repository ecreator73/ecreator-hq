import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Kpi, KpiGrid, Note, Panel, SchemaMissing } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { channelLabel } from "@/lib/marketing/channels";
import { fmtInt } from "@/lib/marketing/format";
import { getSourceStatuses, listConversions, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Visitor Journeys" };

const pathOf = (u: string | null) => {
  if (!u) return null;
  try {
    return new URL(u, "https://www.ecreator.ch").pathname;
  } catch {
    return u;
  }
};

const BUCKETS: Array<[number, string]> = [
  [5, "unter 5 Min."],
  [30, "5–30 Min."],
  [120, "30 Min.–2 Std."],
  [1440, "2–24 Std."],
  [Infinity, "über 24 Std."],
];

export default async function JourneysPage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const [conv, src] = await Promise.all([listConversions(range), getSourceStatuses()]);
  const ev = conv ?? [];

  const paths = new Map<string, { channel: string; landing: string; page: string; count: number }>();
  for (const e of ev) {
    const landing = e.landing_page ?? "(unbekannt)";
    const page = pathOf(e.page_url) ?? (e.kind === "booking" ? "(Calendly)" : "(unbekannt)");
    const k = `${e.channel}|${landing}|${page}`;
    const x = paths.get(k) ?? { channel: e.channel, landing, page, count: 0 };
    x.count++;
    paths.set(k, x);
  }

  const durations = ev
    .filter((e) => e.external_id && e.landing_page)
    .map((e) => (e.first_seen_at ? (new Date(e.occurred_at).getTime() - new Date(e.first_seen_at).getTime()) / 60_000 : null))
    .filter((d): d is number => d != null && d >= 0);
  const dist = BUCKETS.map(([max, label], i) => ({
    id: label,
    label,
    count: durations.filter((d) => d < max && d >= (i ? BUCKETS[i - 1]![0] : 0)).length,
  }));
  const sameAsLanding = ev.filter((e) => e.landing_page && pathOf(e.page_url) === e.landing_page).length;

  return (
    <>
      <PageHead title="Visitor Journeys" subtitle="Bekannte Wege aus First-Party-Ereignissen: Einstieg → Absendung. Unbekannte Zwischenschritte werden nicht erfunden." range={range} showCompare={false} sources={[src.website]} />
      <div className="space-y-5">
        <KpiGrid>
          <Kpi label="Wege mit Anfrage" value={fmtInt(ev.length)} compare={false} />
          <Kpi label="Anfrage auf Einstiegsseite" value={fmtInt(sameAsLanding)} compare={false} hint="ohne Seitenwechsel" />
          <Kpi label="Mit Zeitangabe" value={fmtInt(durations.length)} compare={false} hint="Einstieg bis Anfrage" />
        </KpiGrid>
        <Panel title="Wege (aggregiert)" description="Kanal → Einstiegsseite → … (unvollständig) → Seite der Anfrage">
          <DataTable
            columns={[
              { key: "channel_label", label: "Kanal" },
              { key: "landing", label: "Einstieg" },
              { key: "gap", label: "Zwischenschritte" },
              { key: "page", label: "Anfrage auf" },
              { key: "count", label: "Anzahl", format: "int" },
            ]}
            rows={[...paths.values()].map((p, i) => ({ id: `${i}`, channel_label: channelLabel(p.channel), landing: p.landing, gap: p.landing === p.page ? "keine" : "unvollständig", page: p.page, count: p.count }))}
            searchKeys={["channel_label", "landing", "page"]}
            defaultSort={{ key: "count", dir: "desc" }}
            empty="Keine Anfragen im Zeitraum"
          />
        </Panel>
        <Panel title="Zeit vom Einstieg bis zur Anfrage" description="Innerhalb derselben Browser-Sitzung">
          <DataTable columns={[{ key: "label", label: "Dauer" }, { key: "count", label: "Anfragen", format: "int" }]} rows={dist} />
        </Panel>
        <Note>
          Individuelle Wege gibt es bewusst nur bis zur Ebene «Einstieg → Anfrage» je Lead (im Lead-Detail). Für vollständige Seitenpfade wären First-Party-Seitenereignisse mit
          Einwilligung nötig; das würde zusätzliches JavaScript auf der Website bedeuten und ist wegen Performance- und Design-Freeze nicht umgesetzt. Aggregierte Seitenpfade liefert GA4.
        </Note>
      </div>
    </>
  );
}
