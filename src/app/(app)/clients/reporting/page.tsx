import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PageHeader } from "@/components/page-header";
import { ReportingMarkButtons } from "@/components/clients/reporting-mark-buttons";
import { ReportingCallQuickCreate } from "@/components/clients/reporting-call-quick-create";
import { reportingCallsService } from "@/server/services";
import type { ReportingCallWithRelations } from "@/types/entities";
import { REPORTING_CALL_STATUSES, statusLabel } from "@/config/catalog";
import { formatDate, cn } from "@/lib/utils";
import { today, weekRange, isoDay, addDays } from "@/lib/dates";

export const metadata: Metadata = { title: "Kunden - Reporting-Calls" };

/** Aktive Reporting-Call-Stati (alles ausser durchgefuehrt/abgesagt). */
const ACTIVE_STATUSES = ["open", "scheduled", "rescheduled"];

/** Reporting-Calls laden; im Demo-Modus -> Leerwert. */
async function rc(
  filters: Parameters<typeof reportingCallsService.list>[0],
): Promise<ReportingCallWithRelations[]> {
  return reportingCallsService.list(filters).catch(() => []);
}

/** Farbe (Catalog-Color) zu einem Reporting-Call-Status. */
function statusColor(key: string): string | undefined {
  return REPORTING_CALL_STATUSES.find((s) => s.key === key)?.color;
}

type SectionTone = "red" | "amber" | "brand" | "neutral";

const TONE_TITLE: Record<SectionTone, string> = {
  red: "text-red-600",
  amber: "text-amber-600",
  brand: "text-brand-700",
  neutral: "text-neutral-900",
};

const TONE_RING: Record<SectionTone, string> = {
  red: "border-red-200",
  amber: "border-amber-200",
  brand: "border-brand-200",
  neutral: "border-neutral-200",
};

function ReportingCallRow({ call }: { call: ReportingCallWithRelations }) {
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {call.client ? (
            <Link
              href={`/clients/${call.client_id}`}
              className="truncate font-medium text-neutral-900 hover:text-brand-700"
            >
              {call.client.name}
            </Link>
          ) : (
            <span className="truncate font-medium text-neutral-500">
              Unbekannter Kunde
            </span>
          )}
          <StatusBadge
            label={statusLabel("reporting_call", call.status)}
            color={statusColor(call.status)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-neutral-500">
          <span className="tabular-nums">
            {call.scheduled_date ? formatDate(call.scheduled_date) : "Kein Termin"}
          </span>
          {call.owner?.full_name ? (
            <span className="text-neutral-400">·</span>
          ) : null}
          {call.owner?.full_name ? (
            <span className="text-neutral-600">{call.owner.full_name}</span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">
        <ReportingMarkButtons callId={call.id} />
      </div>
    </li>
  );
}

function Section({
  title,
  description,
  tone,
  calls,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  tone: SectionTone;
  calls: ReportingCallWithRelations[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <Card className={cn(TONE_RING[tone])}>
      <CardHeader>
        <CardTitle className={cn("flex items-baseline gap-2", TONE_TITLE[tone])}>
          {title}
          <span className="text-sm font-normal tabular-nums text-neutral-400">
            ({calls.length})
          </span>
        </CardTitle>
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {calls.map((call) => (
              <ReportingCallRow key={call.id} call={call} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ReportingCallsPage() {
  const t = today();
  const week = weekRange(0);
  const in30Days = isoDay(addDays(new Date(), 30));

  const [overdue, heute, dieseWoche, diesenMonat] = await Promise.all([
    rc({ overdue: true, statusIn: ACTIVE_STATUSES }),
    rc({
      statusIn: ACTIVE_STATUSES,
      scheduledFrom: `${t}T00:00:00`,
      scheduledTo: `${t}T23:59:59`,
    }),
    rc({
      statusIn: ACTIVE_STATUSES,
      scheduledFrom: `${week.from}T00:00:00`,
      scheduledTo: `${week.to}T23:59:59`,
    }),
    rc({
      statusIn: ACTIVE_STATUSES,
      scheduledFrom: t,
      scheduledTo: in30Days,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer Success"
        title="Reporting-Calls"
        description="Welche Reporting-Calls stehen an? Markiere durchgefuehrte, verschobene oder abgesagte Calls und erstelle daraus Folge-Aufgaben."
        actions={<ReportingCallQuickCreate />}
      />

      <Section
        title="Ueberfaellig"
        description="Termin in der Vergangenheit, aber noch nicht abgeschlossen - bitte zeitnah klaeren."
        tone="red"
        calls={overdue}
        emptyTitle="Nichts ueberfaellig"
        emptyDescription="Sehr gut - kein offener Reporting-Call ist ueberfaellig."
      />

      <Section
        title="Heute"
        description="Reporting-Calls, die fuer heute geplant sind."
        tone="amber"
        calls={heute}
        emptyTitle="Heute keine Reporting-Calls"
        emptyDescription="Fuer heute steht kein Reporting-Call an."
      />

      <Section
        title="Diese Woche"
        description="Geplante Reporting-Calls von Montag bis Sonntag."
        tone="brand"
        calls={dieseWoche}
        emptyTitle="Diese Woche keine Reporting-Calls"
        emptyDescription="In dieser Woche ist kein Reporting-Call geplant."
      />

      <Section
        title="Diesen Monat"
        description="Reporting-Calls in den naechsten 30 Tagen."
        tone="neutral"
        calls={diesenMonat}
        emptyTitle="Keine Reporting-Calls im naechsten Monat"
        emptyDescription="In den naechsten 30 Tagen ist kein Reporting-Call geplant."
      />
    </div>
  );
}
