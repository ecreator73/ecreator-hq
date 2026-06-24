import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CalendarRange, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusSelect } from "@/components/production/status-select";
import { invoicesService } from "@/server/services";
import { setInvoiceStatusAction } from "@/app/(app)/finance/actions";
import type { InvoiceWithClient } from "@/types/entities";
import { INVOICE_STATUSES } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import { today, weekRange } from "@/lib/dates";
import { isInvoiceOverdue } from "@/lib/finance";

export const metadata: Metadata = { title: "Finance - Offene Rechnungen" };

function InvoiceRow({ inv }: { inv: InvoiceWithClient }) {
  return (
    <tr className="align-top hover:bg-neutral-50">
      <td className="px-4 py-2.5 tabular-nums text-neutral-600">
        {inv.invoice_number ?? "-"}
      </td>
      <td className="px-4 py-2.5">
        <Link
          href={`/finance/invoices/${inv.id}`}
          className="font-medium text-neutral-900 hover:text-brand-700"
        >
          {inv.title ?? "(ohne Titel)"}
        </Link>
      </td>
      <td className="px-4 py-2.5 text-neutral-700">
        {inv.client?.name ?? "-"}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-900">
        {formatCHF(inv.amount ?? 0)}
      </td>
      <td className="px-4 py-2.5 text-neutral-600">
        {inv.due_date ? formatDate(inv.due_date) : "-"}
      </td>
      <td className="px-4 py-2.5">
        <StatusSelect
          id={inv.id}
          value={inv.status}
          statuses={INVOICE_STATUSES}
          action={setInvoiceStatusAction}
        />
      </td>
    </tr>
  );
}

function Section({
  title,
  description,
  icon: Icon,
  tone,
  invoices,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "danger" | "amber" | "brand" | "neutral";
  invoices: InvoiceWithClient[];
}) {
  const total = invoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
  const toneClass = {
    danger: "text-red-600",
    amber: "text-amber-600",
    brand: "text-brand-600",
    neutral: "text-neutral-500",
  }[tone];

  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${toneClass}`} />
            {title} ({invoices.length})
          </CardTitle>
          {invoices.length > 0 ? (
            <span className="text-sm font-medium tabular-nums text-neutral-700">
              {formatCHF(total)}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-neutral-500">{description}</p>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <EmptyState
            title="Nichts in diesem Bereich"
            description="Aktuell gibt es hier keine Rechnungen."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Nr</th>
                  <th className="px-4 py-2.5 font-medium">Titel</th>
                  <th className="px-4 py-2.5 font-medium">Kunde</th>
                  <th className="px-4 py-2.5 text-right font-medium">Betrag</th>
                  <th className="px-4 py-2.5 font-medium">Faellig</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {invoices.map((inv) => (
                  <InvoiceRow key={inv.id} inv={inv} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function FinanceOpenPage() {
  const invoices = await invoicesService
    .list({ statusIn: ["open", "overdue"] })
    .catch((): InvoiceWithClient[] => []);

  const todayKey = today();
  const week = weekRange();

  const overdue: InvoiceWithClient[] = [];
  const dueToday: InvoiceWithClient[] = [];
  const dueThisWeek: InvoiceWithClient[] = [];
  const later: InvoiceWithClient[] = [];

  for (const inv of invoices) {
    if (isInvoiceOverdue(inv, todayKey)) {
      overdue.push(inv);
    } else if (inv.due_date === todayKey) {
      dueToday.push(inv);
    } else if (
      inv.due_date &&
      inv.due_date >= week.from &&
      inv.due_date <= week.to
    ) {
      dueThisWeek.push(inv);
    } else {
      later.push(inv);
    }
  }

  const totalOpen = invoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Offene Rechnungen</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Keine offenen Rechnungen"
            description="Alle Rechnungen sind bezahlt oder es wurden noch keine offenen Rechnungen erfasst."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            Offen insgesamt
          </p>
          <p className="text-lg font-semibold tabular-nums text-neutral-900">
            {formatCHF(totalOpen)}
          </p>
        </div>
        <p className="text-sm text-neutral-500">
          {invoices.length} offene{invoices.length === 1 ? " Rechnung" : " Rechnungen"}
          {overdue.length > 0 ? (
            <span className="ml-1 font-medium text-red-600">
              ({overdue.length} ueberfaellig)
            </span>
          ) : null}
        </p>
      </div>

      <Section
        title="Ueberfaellig"
        description="Faelligkeit ist verstrichen - dringend nachfassen."
        icon={AlertTriangle}
        tone="danger"
        invoices={overdue}
      />
      <Section
        title="Heute faellig"
        description="Diese Rechnungen sind heute faellig."
        icon={CalendarClock}
        tone="amber"
        invoices={dueToday}
      />
      <Section
        title="Diese Woche faellig"
        description="Faelligkeit innerhalb der laufenden Woche."
        icon={CalendarRange}
        tone="brand"
        invoices={dueThisWeek}
      />
      <Section
        title="Offen (spaeter)"
        description="Offene Rechnungen mit spaeterer oder fehlender Faelligkeit."
        icon={Clock}
        tone="neutral"
        invoices={later}
      />
    </div>
  );
}
