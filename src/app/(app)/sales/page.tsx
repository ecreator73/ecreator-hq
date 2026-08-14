import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileSignature, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { OfferQuickCreate } from "@/components/sales/offer-quick-create";
import { MeetingQuickCreate } from "@/components/sales/meeting-quick-create";
import {
  contractsService,
  offersService,
  salesDashboardService,
  salesMeetingsService,
} from "@/server/services";
import type { SalesDashboardData } from "@/server/services";
import type { Contract, Offer, SalesMeetingRow } from "@/types/entities";
import { STATUS_REGISTRY, statusLabel } from "@/config/catalog";
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

/** Kleiner "Alle anzeigen"-Link in den Karten-Koepfen. */
function AllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-xs font-medium text-brand-700 hover:text-brand-800"
    >
      {label}
    </Link>
  );
}

function offerStatusColor(status: string): string | undefined {
  return STATUS_REGISTRY.offer[status as keyof typeof STATUS_REGISTRY.offer]
    ?.color;
}

function meetingStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return STATUS_REGISTRY.meeting[status as keyof typeof STATUS_REGISTRY.meeting]
    ?.color;
}

export default async function SalesDashboardPage() {
  // Unabhaengige Abrufe parallel; jede Promise faengt ihren Fehler selbst ab.
  const [d, allOffers, allMeetings, allContracts] = await Promise.all([
    salesDashboardService.summary().catch(() => EMPTY_SUMMARY),
    offersService.list().catch((): Offer[] => []),
    salesMeetingsService.list().catch((): SalesMeetingRow[] => []),
    contractsService.list().catch((): Contract[] => []),
  ]);

  const heute = today();

  // Offene Angebote = Entwurf oder gesendet; die mit der naechsten Frist zuerst.
  const openOffers = allOffers
    .filter((o) => o.status === "draft" || o.status === "sent")
    .sort((a, b) => (a.valid_until ?? "9999").localeCompare(b.valid_until ?? "9999"))
    .slice(0, 8);

  // Naechste Termine = kuenftig und weder abgesagt noch durchgefuehrt.
  const nextMeetings = allMeetings
    .filter(
      (m) =>
        m.meeting_date != null &&
        m.meeting_date.slice(0, 10) >= heute &&
        m.status !== "cancelled" &&
        m.status !== "completed",
    )
    .sort((a, b) => (a.meeting_date ?? "").localeCompare(b.meeting_date ?? ""))
    .slice(0, 8);

  const activeContracts = allContracts.filter((c) => c.status === "active");
  const contractsMonthly = activeContracts.reduce(
    (sum, c) => sum + (c.value_monthly ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Was hier haeufig gemacht wird */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <OfferQuickCreate />
        <MeetingQuickCreate />
      </div>

      {/* Die 5 Zahlen, die im Abschluss zaehlen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Widget
          label="Offene Angebote"
          value={d.openOffers}
          href="/sales/offers"
          tone="brand"
        />
        <Widget
          label="Angebotsvolumen"
          value={formatCHF(d.offerVolume)}
          href="/sales/offers"
          tone="brand"
        />
        <Widget
          label="Abschlussquote"
          value={`${d.offerWinRate} %`}
          href="/sales/offers"
          tone="green"
        />
        <Widget
          label="Termine heute"
          value={d.meetingsToday}
          href="/sales/meetings"
          tone={d.meetingsToday > 0 ? "amber" : "neutral"}
        />
        <Widget
          label="Vertraege laufen aus"
          value={d.contractsExpiring}
          href="/sales/contracts"
          tone={d.contractsExpiring > 0 ? "amber" : "neutral"}
        />
      </div>

      {/* Arbeitslisten - breite Bildschirme nutzen drei Spalten */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Offene Angebote */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Offene Angebote</CardTitle>
            <AllLink href="/sales/offers" label="Alle Angebote" />
          </CardHeader>
          <CardContent>
            {openOffers.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Keine offenen Angebote"
                description="Alle Angebote sind entschieden. Erstelle ein neues Angebot fuer einen Lead oder Kunden."
                action={<OfferQuickCreate />}
              />
            ) : (
              <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                {openOffers.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-900">
                        {o.title}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {formatCHF(o.amount, o.currency)}
                        {o.valid_until
                          ? ` - gueltig bis ${formatDate(o.valid_until)}`
                          : ""}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge
                        label={statusLabel("offer", o.status)}
                        color={offerStatusColor(o.status)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Naechste Termine */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Naechste Termine</CardTitle>
            <AllLink href="/sales/meetings" label="Alle Termine" />
          </CardHeader>
          <CardContent>
            {nextMeetings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Keine Termine geplant"
                description="Vereinbare ein Gespraech, um ein Angebot zum Abschluss zu bringen."
                action={<MeetingQuickCreate />}
              />
            ) : (
              <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                {nextMeetings.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-900">
                        {m.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {m.lead?.company_name || m.client?.name || "Ohne Zuordnung"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-neutral-600">
                        {m.meeting_date ? formatDate(m.meeting_date) : "-"}
                      </p>
                      <div className="mt-1">
                        <StatusBadge
                          label={statusLabel("meeting", m.status)}
                          color={meetingStatusColor(m.status)}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Vertraege */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vertraege</CardTitle>
            <AllLink href="/sales/contracts" label="Alle Vertraege" />
          </CardHeader>
          <CardContent>
            {activeContracts.length === 0 && d.contractsExpiring === 0 ? (
              <EmptyState
                icon={FileSignature}
                title="Keine laufenden Vertraege"
                description="Sobald aus Angeboten Vertraege werden, erscheinen sie hier."
              />
            ) : (
              <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-neutral-600">Aktive Vertraege</span>
                  <span className="font-semibold tabular-nums text-neutral-900">
                    {activeContracts.length}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-neutral-600">Wert pro Monat</span>
                  <span className="font-semibold tabular-nums text-brand-700">
                    {formatCHF(contractsMonthly)}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-neutral-600">
                    Laufen in 90 Tagen aus
                  </span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      d.contractsExpiring > 0
                        ? "text-amber-600"
                        : "text-neutral-900",
                    )}
                  >
                    {d.contractsExpiring}
                  </span>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
