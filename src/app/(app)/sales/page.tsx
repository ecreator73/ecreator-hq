import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { leadsService, salesDashboardService } from "@/server/services";
import type { SalesDashboardData } from "@/server/services";
import type { LeadWithRelations } from "@/types/entities";
import { formatCHF, formatDate, cn } from "@/lib/utils";
import { today } from "@/lib/dates";

export const metadata: Metadata = { title: "Sales - Dashboard" };

const EMPTY_SUMMARY: SalesDashboardData = {
  newLeads: 0,
  hotLeads: 0,
  followupsToday: 0,
  followupsOverdue: 0,
  meetingsToday: 0,
  pipelineValue: 0,
  revenuePotential: 0,
  winRate: 0,
  openOffers: 0,
  acceptedOffers: 0,
  rejectedOffers: 0,
  offerVolume: 0,
  offerWinRate: 0,
  contractsExpiring: 0,
};

type WidgetTone = "neutral" | "brand" | "amber" | "green" | "red";

const TONE_STYLES: Record<WidgetTone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-700",
  amber: "text-amber-600",
  green: "text-green-600",
  red: "text-red-600",
};

function Widget({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: WidgetTone;
}) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", TONE_STYLES[tone])}>
        {value}
      </p>
    </>
  );
  const base =
    "block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm";
  if (href) {
    return (
      <Link
        href={href}
        className={cn(base, "transition-colors hover:border-brand-300 hover:bg-brand-50/40")}
      >
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

export default async function SalesDashboardPage() {
  const d = await salesDashboardService.summary().catch(() => EMPTY_SUMMARY);

  let heuteLeads: LeadWithRelations[] = [];
  try {
    heuteLeads = await leadsService
      .list(
        { dueTo: today(), excludeStatus: ["abgeschlossen", "absage", "fehleintrag", "andere"] },
        { pageSize: 8, sort: { column: "next_action_date", ascending: true } },
      )
      .then((r) => r.rows);
  } catch {
    heuteLeads = [];
  }

  return (
    <div className="space-y-6">
      {/* Widget-Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Widget label="Neue Leads" value={d.newLeads} href="/sales/leads" tone="brand" />
        <Widget label="Heisse Leads" value={d.hotLeads} href="/sales/leads" tone="amber" />
        <Widget
          label="Follow-ups heute"
          value={d.followupsToday}
          href="/sales/followups"
          tone={d.followupsToday > 0 ? "amber" : "neutral"}
        />
        <Widget label="Termine heute" value={d.meetingsToday} href="/sales/meetings" />
        <Widget label="Offene Angebote" value={d.openOffers} href="/sales/offers" />
        <Widget
          label="Pipeline-Volumen"
          value={formatCHF(d.pipelineValue)}
          href="/sales/pipeline"
          tone="brand"
        />
        <Widget label="Abschlussquote" value={`${d.winRate} %`} tone="green" />
        <Widget
          label="Umsatzpotenzial"
          value={formatCHF(d.revenuePotential)}
          href="/sales/pipeline"
          tone="green"
        />
      </div>

      {/* Wen rufe ich heute an? */}
      <Card>
        <CardHeader>
          <CardTitle>Wen rufe ich heute an?</CardTitle>
        </CardHeader>
        <CardContent>
          {heuteLeads.length === 0 ? (
            <EmptyState
              title="Keine faelligen Leads"
              description="Heute steht kein Follow-up an. Zeit fuer neue Akquise."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Firma</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Wert</th>
                    <th className="px-4 py-2.5 font-medium">Naechste Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {heuteLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/sales/leads/${lead.id}`}
                          className="font-medium text-neutral-900 hover:text-brand-700"
                        >
                          {lead.company_name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          label={lead.status?.label}
                          color={lead.status?.color}
                        />
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-neutral-700">
                        {formatCHF(lead.estimated_value, lead.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {lead.next_action_date
                          ? formatDate(lead.next_action_date)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
