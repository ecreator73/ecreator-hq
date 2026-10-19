import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { leadsService } from "@/server/services";
import type { LeadWithRelations } from "@/types/entities";
import { FollowupRow, daysUntil } from "@/components/sales/followup-row";
import { formatCHF, cn } from "@/lib/utils";
import { today, tomorrow, weekRange, addDays, isoDay } from "@/lib/dates";

export const metadata: Metadata = { title: "Leads - Follow-ups" };

const OPEN_ONLY = ["abgeschlossen", "absage", "fehleintrag", "andere", "massenmail"];
type IconType = React.ComponentType<{ className?: string }>;

/** Kennzahl-Kachel, springt per Anker zum passenden Abschnitt. */
function Kpi({
  label,
  value,
  href,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  href: string;
  icon: IconType;
  tone?: "neutral" | "red" | "amber" | "green";
}) {
  const alert = tone === "red" && Number(value) > 0;
  return (
    <Link href={href} className="group block">
      <Card className="transition-colors hover:border-brand-300">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                alert
                  ? "text-red-600"
                  : tone === "amber" && Number(value) > 0
                    ? "text-amber-600"
                    : "text-neutral-900",
              )}
            >
              {value}
            </p>
            <p className="text-sm text-neutral-500">{label}</p>
          </div>
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              alert
                ? "bg-red-50 text-red-500"
                : "bg-neutral-100 text-neutral-500 group-hover:bg-brand-50 group-hover:text-brand-600",
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function Section({
  id,
  title,
  subtitle,
  icon: Icon,
  accent,
  leads,
  emptyTitle,
  emptyDescription,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon: IconType;
  accent?: "red" | "amber";
  leads: LeadWithRelations[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const value = leads.reduce((s, l) => s + (l.estimated_value ?? 0), 0);
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle
          className={cn(
            "flex items-center gap-2",
            accent === "red" ? "text-red-600" : accent === "amber" ? "text-amber-600" : "",
          )}
        >
          <Icon className="h-4 w-4" />
          {title}
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-600">
            {leads.length}
          </span>
        </CardTitle>
        <span className="text-xs text-neutral-500">
          {subtitle}
          {value > 0 ? ` · Wert ${formatCHF(value)}` : ""}
        </span>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <EmptyState icon={CheckCircle2} title={emptyTitle} description={emptyDescription} />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {leads.map((l) => (
              <FollowupRow key={l.id} lead={l} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function SalesFollowupsPage() {
  const t = today();
  const tm = tomorrow();
  const week = weekRange(0);
  // "Diese Woche" erst ab uebermorgen - sonst stuenden dieselben Leads mehrfach da.
  const restFrom = isoDay(addDays(new Date(), 2));

  const load = (filters: Parameters<typeof leadsService.list>[0]) =>
    leadsService
      .list(filters, { pageSize: 200 })
      .then((r) => r.rows)
      .catch(() => [] as LeadWithRelations[]);

  const [overdue, due, next, rest] = await Promise.all([
    load({ overdue: true, excludeStatus: OPEN_ONLY }),
    load({ dueFrom: t, dueTo: t, excludeStatus: OPEN_ONLY }),
    load({ dueFrom: tm, dueTo: tm, excludeStatus: OPEN_ONLY }),
    load({
      dueFrom: restFrom,
      dueTo: week.to >= restFrom ? week.to : restFrom,
      excludeStatus: OPEN_ONLY,
    }),
  ]);

  // Dringendstes zuerst.
  const byDue = (a: LeadWithRelations, b: LeadWithRelations) =>
    (a.next_action_date ?? "").localeCompare(b.next_action_date ?? "");
  overdue.sort(byDue);
  due.sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0));
  next.sort(byDue);
  rest.sort(byDue);

  const all = [...overdue, ...due, ...next, ...rest];
  const hot = all.filter((l) => (l.lead_score ?? 0) >= 70).length;
  const worstOverdue = overdue.length
    ? Math.abs(Math.min(...overdue.map((l) => daysUntil(l.next_action_date) ?? 0)))
    : 0;

  return (
    <div className="space-y-6">
      {/* Ueberblick */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi
          label="Ueberfaellig"
          value={overdue.length}
          href="#ueberfaellig"
          icon={AlertTriangle}
          tone="red"
        />
        <Kpi label="Heute faellig" value={due.length} href="#heute" icon={CalendarCheck} tone="amber" />
        <Kpi label="Morgen" value={next.length} href="#morgen" icon={Clock} />
        <Kpi label="Rest der Woche" value={rest.length} href="#woche" icon={CalendarDays} />
        <Kpi label="Davon heiss (Score 70+)" value={hot} href="#ueberfaellig" icon={Flame} />
      </div>

      {overdue.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>
            <strong>{overdue.length} Follow-up(s) ueberfaellig</strong>
            {worstOverdue > 0 ? ` - das aelteste seit ${worstOverdue} Tagen.` : "."} Am besten
            zuerst abarbeiten: Anrufen, Mail oder WhatsApp direkt aus der Zeile.
          </span>
        </div>
      ) : null}

      <Section
        id="ueberfaellig"
        title="Ueberfaellig"
        subtitle="Sofort nachfassen"
        icon={AlertTriangle}
        accent="red"
        leads={overdue}
        emptyTitle="Nichts ueberfaellig"
        emptyDescription="Sauber - alle Follow-ups sind aktuell."
      />
      <Section
        id="heute"
        title="Heute faellig"
        subtitle="Nach Score sortiert - heisseste zuerst"
        icon={CalendarCheck}
        accent="amber"
        leads={due}
        emptyTitle="Heute nichts faellig"
        emptyDescription="Fuer heute stehen keine Follow-ups an."
      />
      <Section
        id="morgen"
        title="Morgen"
        icon={Clock}
        leads={next}
        emptyTitle="Morgen nichts faellig"
        emptyDescription="Fuer morgen sind keine Follow-ups geplant."
      />
      <Section
        id="woche"
        title="Rest der Woche"
        subtitle="Ab uebermorgen bis Sonntag"
        icon={CalendarDays}
        leads={rest}
        emptyTitle="Diese Woche nichts mehr"
        emptyDescription="Bis Sonntag stehen keine weiteren Follow-ups an."
      />
    </div>
  );
}
