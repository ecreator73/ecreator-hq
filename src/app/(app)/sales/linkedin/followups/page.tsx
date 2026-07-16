import type { Metadata } from "next";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  CalendarRange,
  CheckCircle2,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { linkedinDashboardService } from "@/server/services";
import type { LinkedInProspectWithRelations } from "@/types/entities";
import { LINKEDIN_PROSPECT_STATUSES, statusLabel } from "@/config/catalog";
import { HOT_PROSPECT_THRESHOLD } from "@/lib/linkedin";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "LinkedIn - Follow-ups" };

/* Katalogfarben (gray/blue/green/amber/red) je Status fuer die Badges. */
const STATUS_COLOR: Record<string, string> = Object.fromEntries(
  LINKEDIN_PROSPECT_STATUSES.map((s) => [s.key, s.color]),
);

function ProspectRow({
  prospect,
  dateTone,
}: {
  prospect: LinkedInProspectWithRelations;
  dateTone: "red" | "neutral";
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
      <div className="min-w-0 flex-1">
        <Link
          href={`/sales/linkedin/prospects/${prospect.id}`}
          className="block truncate text-sm font-medium text-neutral-900 hover:text-brand-700"
        >
          {prospect.full_name}
        </Link>
        {prospect.company_name ? (
          <span className="block truncate text-xs text-neutral-500">
            {prospect.company_name}
          </span>
        ) : null}
      </div>
      <StatusBadge
        label={statusLabel("linkedin_prospect", prospect.status)}
        color={STATUS_COLOR[prospect.status]}
      />
      <span
        className={cn(
          "w-20 text-xs tabular-nums",
          dateTone === "red" ? "font-medium text-red-600" : "text-neutral-500",
        )}
      >
        {prospect.next_followup_date
          ? formatDate(prospect.next_followup_date)
          : "-"}
      </span>
      <span className="hidden w-32 truncate text-xs text-neutral-500 sm:block">
        {prospect.owner?.full_name ?? "-"}
      </span>
      <span
        className={cn(
          "w-16 text-right text-xs font-medium tabular-nums",
          prospect.lead_score >= HOT_PROSPECT_THRESHOLD
            ? "text-amber-600"
            : "text-neutral-700",
        )}
      >
        Score {prospect.lead_score}
      </span>
    </li>
  );
}

function Section({
  title,
  titleClassName,
  prospects,
  dateTone = "neutral",
  emptyTitle,
  emptyDescription,
  emptyIcon,
}: {
  title: string;
  titleClassName?: string;
  prospects: LinkedInProspectWithRelations[];
  dateTone?: "red" | "neutral";
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn(titleClassName)}>
          {title} ({prospects.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {prospects.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {prospects.map((p) => (
              <ProspectRow key={p.id} prospect={p} dateTone={dateTone} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function LinkedInFollowupsPage() {
  // Demo-Modus / fehlende Migration: nie crashen, Banner statt Fehler.
  const data = await linkedinDashboardService.followups().catch(() => null);
  const { overdue, today, week } = data ?? {
    overdue: [] as LinkedInProspectWithRelations[],
    today: [] as LinkedInProspectWithRelations[],
    week: [] as LinkedInProspectWithRelations[],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="LinkedIn-Follow-ups"
        description="Alle faelligen Follow-ups der LinkedIn-Akquise — ueberfaellig, heute und diese Woche."
      />

      {data === null ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <span>
            Noch keine Daten - falls das Modul neu ist: Migration 0021 in
            Supabase einspielen.
          </span>
        </div>
      ) : null}

      <Section
        title="Ueberfaellig"
        titleClassName="text-red-600"
        prospects={overdue}
        dateTone="red"
        emptyIcon={CheckCircle2}
        emptyTitle="Keine ueberfaelligen Follow-ups"
        emptyDescription="Sehr gut — alle Prospects sind auf Kurs."
      />
      <Section
        title="Heute"
        prospects={today}
        emptyIcon={CalendarCheck2}
        emptyTitle="Heute keine Follow-ups faellig"
        emptyDescription="Fuer heute ist alles erledigt — Zeit fuer neue Prospects."
      />
      <Section
        title="Diese Woche"
        prospects={week}
        emptyIcon={CalendarRange}
        emptyTitle="Diese Woche stehen keine weiteren Follow-ups an"
        emptyDescription="Neue Follow-ups erscheinen hier automatisch nach jedem Statuswechsel."
      />
    </div>
  );
}
