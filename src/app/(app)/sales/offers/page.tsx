import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { offersService, salesDashboardService } from "@/server/services";
import type { SalesDashboardData } from "@/server/services";
import type { Offer } from "@/types/entities";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { OfferQuickCreate } from "@/components/sales/offer-quick-create";
import { OFFER_TYPE_LABELS, statusLabel, OFFER_STATUSES } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Sales - Angebote" };

function offerStatusColor(status: string): string | undefined {
  return OFFER_STATUSES.find((s) => s.key === status)?.color;
}

export default async function SalesOffersPage() {
  const d: SalesDashboardData | null = await salesDashboardService
    .summary()
    .catch(() => null);
  const offers: Offer[] = await offersService.list().catch(() => []);

  const stats = [
    { label: "Offene Angebote", value: String(d?.openOffers ?? 0) },
    { label: "Angenommen", value: String(d?.acceptedOffers ?? 0) },
    { label: "Verloren", value: String(d?.rejectedOffers ?? 0) },
    { label: "Gesamtvolumen", value: formatCHF(d?.offerVolume ?? 0) },
    { label: "Abschlussquote", value: `${d?.offerWinRate ?? 0}%` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Angebote"
        description="Wo liegt Geld? Wer wartet auf ein Angebot?"
        actions={<OfferQuickCreate />}
      />

      {/* Angebots-Dashboard-Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-2xl font-semibold text-neutral-900">
                {s.value}
              </p>
              <p className="mt-0.5 text-sm text-neutral-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabelle */}
      <Card>
        {offers.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              icon={FileText}
              title="Noch keine Angebote"
              description="Erstelle ein Angebot fuer einen Kunden oder Lead."
              action={<OfferQuickCreate />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-5 py-3">Titel</th>
                  <th className="px-5 py-3">Typ</th>
                  <th className="px-5 py-3">Betrag</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Gueltig bis</th>
                  <th className="px-5 py-3">Gesendet</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/60"
                  >
                    <td className="px-5 py-3 font-medium text-neutral-900">
                      {o.title}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {o.offer_type
                        ? OFFER_TYPE_LABELS[o.offer_type] ?? o.offer_type
                        : "-"}
                    </td>
                    <td className="px-5 py-3 font-medium text-neutral-900">
                      {formatCHF(o.amount, o.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        label={statusLabel("offer", o.status)}
                        color={offerStatusColor(o.status)}
                      />
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {o.valid_until ? formatDate(o.valid_until) : "-"}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {o.sent_date ? formatDate(o.sent_date) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
