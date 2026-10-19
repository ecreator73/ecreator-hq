import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Kpi, KpiGrid, Note, Panel, SchemaMissing } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { channelLabel } from "@/lib/marketing/channels";
import { FORM_TYPES, formLabel } from "@/lib/marketing/forms";
import { fmtInt } from "@/lib/marketing/format";
import { getSourceStatuses, listConversions, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Kontaktformulare" };

export default async function FormsPage({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const [all, prev, src] = await Promise.all([
    listConversions(range, { includeDuplicates: true }),
    range.compare ? listConversions(range.compare) : Promise.resolve(null),
    getSourceStatuses(),
  ]);
  const forms = (all ?? []).filter((c) => c.kind === "form" || c.form_type === "strategie-call");
  const counted = forms.filter((c) => !c.is_duplicate);
  const dups = forms.length - counted.length;
  const prevForms = (prev ?? []).filter((c) => c.kind === "form" || c.form_type === "strategie-call");

  const byType = FORM_TYPES.filter((f) => f.value !== "calendly").map((f) => {
    const cur = counted.filter((c) => c.form_type === f.value).length;
    const was = prevForms.filter((c) => c.form_type === f.value).length;
    return { id: f.value, form: f.label, count: cur, prev: prev ? was : null, duplicates: forms.filter((c) => c.form_type === f.value && c.is_duplicate).length };
  });
  const rows = forms.map((c) => ({
    id: c.id,
    href: c.lead_id ? `/marketing/leads/${c.lead_id}` : null,
    at: c.occurred_at,
    form: c.form_name ?? formLabel(c.form_type),
    channel: channelLabel(c.channel),
    campaign: c.utm_campaign,
    landing: c.landing_page,
    page: c.page_url,
    service: c.service,
    duplicate: c.is_duplicate ? "Dublette" : null,
    lead: c.lead_id ? "Lead öffnen" : null,
  }));

  return (
    <>
      <PageHead title="Kontaktformulare" subtitle="Bestätigte Absendungen der vier Website-Formulare (erst nach erfolgreichem Versand gezählt)" range={range} sources={[src.website]} />
      <div className="space-y-5">
        <KpiGrid>
          <Kpi label="Absendungen" value={fmtInt(counted.length)} cur={counted.length} prev={prev ? prevForms.length : null} hint="ohne Dubletten" />
          {byType.map((t) => (
            <Kpi key={t.id} label={t.form} value={fmtInt(t.count)} cur={t.count} prev={t.prev} />
          ))}
          <Kpi label="Erkannte Dubletten" value={fmtInt(dups)} compare={false} hint="Doppelklick / gleicher Inhalt" />
        </KpiGrid>
        <Panel title="Absendungen">
          <DataTable
            columns={[
              { key: "at", label: "Zeit", format: "datetime" },
              { key: "form", label: "Formular" },
              { key: "service", label: "Leistung", hideSm: true },
              { key: "channel", label: "Kanal" },
              { key: "campaign", label: "Kampagne", hideSm: true },
              { key: "landing", label: "Landingpage", hideSm: true },
              { key: "page", label: "Conversion-Seite", hideSm: true },
              { key: "duplicate", label: "Hinweis" },
              { key: "lead", label: "Lead", hrefKey: "href" },
            ]}
            rows={rows}
            searchKeys={["form", "channel", "campaign", "landing", "page", "service"]}
            defaultSort={{ key: "at", dir: "desc" }}
            empty="Keine Formular-Absendungen im Zeitraum"
          />
        </Panel>
        <Note>
          Der Strategie-Call über das eingebettete Calendly zählt hier als Website-Formular und gleichzeitig unter Calendly-Buchungen als dieselbe Buchung
          (kein doppelter Lead). Validierung, Honeypot und Erfolgsanzeige laufen unverändert auf der Website.
        </Note>
      </div>
    </>
  );
}
