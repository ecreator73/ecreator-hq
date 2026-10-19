import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHead } from "@/components/marketing/page-head";
import { Kpi, KpiGrid, Panel, SchemaMissing } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { FilterSelect } from "@/components/marketing/filter-select";
import { CHANNELS, CONFIDENCE_LABELS, channelLabel } from "@/lib/marketing/channels";
import { LEAD_STATUSES } from "@/config/catalog";
import { rangeQuery } from "@/lib/marketing/range";
import { fmtInt } from "@/lib/marketing/format";
import { FORM_TYPES } from "@/lib/marketing/forms";
import { getSourceStatuses, listMarketingLeads, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Leads" };


export default async function MarketingLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const { range, sp } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const [leads, src] = await Promise.all([
    listMarketingLeads(range, { channel: sp.channel, status: sp.status, form: sp.form }),
    getSourceStatuses(),
  ]);
  const rows = (leads ?? []).map((l) => ({
    id: l.id,
    href: `/marketing/leads/${l.id}`,
    name: l.contact_name ?? l.company_name,
    company: l.company_name !== l.contact_name ? l.company_name : null,
    email: l.email,
    phone: l.phone,
    service: l.dienstleistung,
    channel: channelLabel(l.ft_channel),
    campaign: l.ft_campaign,
    landing: l.ft_landing_page,
    form: l.form_name,
    converted_at: l.converted_at,
    status: l.status?.label ?? null,
    status_color: l.status?.color ?? "gray",
    owner: l.owner?.full_name ?? null,
    next: l.next_action_date,
    confidence: CONFIDENCE_LABELS[l.attribution_confidence ?? "unknown"] ?? null,
  }));
  const open = (leads ?? []).filter((l) => !["abgeschlossen", "absage", "fehleintrag"].includes(l.status?.key ?? "")).length;
  const unassigned = (leads ?? []).filter((l) => !l.owner).length;
  const unattributed = (leads ?? []).filter((l) => !l.ft_channel || l.ft_channel === "unknown").length;
  const exportHref = `/api/marketing/export?type=leads&${rangeQuery(range, { channel: sp.channel, status: sp.status, form: sp.form })}`;

  return (
    <>
      <PageHead
        title="Leads"
        subtitle="Alle Anfragen der Website und von Calendly im zentralen Lead-System (eCreator OS)"
        range={range}
        showCompare={false}
        sources={[src.website, src.calendly]}
        actions={
          <a href={exportHref} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
            CSV exportieren
          </a>
        }
      />
      <div className="space-y-5">
        <KpiGrid>
          <Kpi label="Leads im Zeitraum" value={fmtInt(leads?.length ?? null)} compare={false} hint="nach letzter Anfrage" />
          <Kpi label="Offen" value={fmtInt(open)} compare={false} />
          <Kpi label="Ohne Zuständigkeit" value={fmtInt(unassigned)} compare={false} />
          <Kpi label="Unknown / Unattributed" value={fmtInt(unattributed)} compare={false} />
        </KpiGrid>
        <Panel
          title="Lead-Liste"
          actions={
            <Suspense fallback={null}>
              <div className="flex flex-wrap gap-2">
                <FilterSelect name="channel" label="Kanal" options={CHANNELS.map((c) => ({ value: c.key, label: c.label }))} />
                <FilterSelect name="form" label="Formular" options={[...FORM_TYPES]} />
                <FilterSelect name="status" label="Status" options={LEAD_STATUSES.map((s) => ({ value: s.key, label: s.label }))} />
              </div>
            </Suspense>
          }
        >
          <DataTable
            columns={[
              { key: "name", label: "Name", hrefKey: "href" },
              { key: "company", label: "Firma", hideSm: true },
              { key: "email", label: "E-Mail", hideSm: true },
              { key: "phone", label: "Telefon", hideSm: true },
              { key: "service", label: "Leistung", hideSm: true },
              { key: "channel", label: "Quelle" },
              { key: "campaign", label: "Kampagne", hideSm: true },
              { key: "landing", label: "Landingpage", hideSm: true },
              { key: "converted_at", label: "Datum", format: "datetime" },
              { key: "status", label: "Status", format: "badge" },
              { key: "owner", label: "Zuständig", hideSm: true },
              { key: "next", label: "Nächster Schritt", format: "date", hideSm: true },
            ]}
            rows={rows}
            searchKeys={["name", "company", "email", "phone", "campaign", "service", "landing"]}
            defaultSort={{ key: "converted_at", dir: "desc" }}
            empty="Keine Leads im Zeitraum"
          />
        </Panel>
      </div>
    </>
  );
}
