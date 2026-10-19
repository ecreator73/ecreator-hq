import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { campaignRows, loadLeadWork } from "@/server/services/lead-work.service";
import { DataTable } from "@/components/marketing/data-table";
import { LEAD_SOURCE_LABELS } from "@/config/catalog";

export const metadata: Metadata = { title: "Leads · Kampagnen" };

const short = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}`;

export default async function CampaignsPage() {
  await requireUser();
  const { leads } = await loadLeadWork();
  const rows = campaignRows(leads).map((r) => ({
    id: r.campaign,
    ...r,
    source: r.source ? (LEAD_SOURCE_LABELS as Record<string, string>)[r.source] ?? r.source : null,
    period: r.first ? `${short(r.first)} – ${short(r.last)}` : null,
  }));
  const total = rows.reduce((a, r) => ({ leads: a.leads + r.leads, appointments: a.appointments + r.appointments, won: a.won + r.won }), { leads: 0, appointments: 0, won: 0 });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Kampagnen-Performance</h2>
        <p className="text-sm text-neutral-500">
          Was jede Kampagne an Leads, Terminen und Abschlüssen bringt: {total.leads} Leads, {total.appointments} mit Termin oder weiter, {total.won} gewonnen.
        </p>
      </div>
      <DataTable
        columns={[
          { key: "campaign", label: "Kampagne" },
          { key: "source", label: "Quelle", hideSm: true },
          { key: "period", label: "Zeitraum", hideSm: true },
          { key: "leads", label: "Leads", format: "int" },
          { key: "open", label: "Offen", format: "int", hideSm: true },
          { key: "contactRate", label: "Kontaktiert", format: "pct" },
          { key: "appointments", label: "Termine", format: "int" },
          { key: "appointmentRate", label: "Termin-Quote", format: "pct" },
          { key: "won", label: "Gewonnen", format: "int" },
          { key: "winRate", label: "Abschluss-Quote", format: "pct" },
          { key: "lost", label: "Absage", format: "int", hideSm: true },
          { key: "invalid", label: "Fehleintrag", format: "int", hideSm: true },
        ]}
        rows={rows}
        searchKeys={["campaign", "source"]}
        defaultSort={{ key: "leads", dir: "desc" }}
        empty="Noch keine Leads mit Kampagne"
      />
      <p className="text-xs text-neutral-500">
        Termin-Quote zählt Leads im Status Termin gebucht, Vertrag/Mail oder Abgeschlossen. Werbekosten je Kampagne erscheinen unter Marketing → Kampagnen-Performance, sobald Meta oder Google
        verbunden ist.
      </p>
    </div>
  );
}
