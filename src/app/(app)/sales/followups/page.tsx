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
import { leadsService } from "@/server/services";
import type { LeadFilters } from "@/server/services";
import type { LeadWithRelations } from "@/types/entities";
import { formatCHF, formatDate, cn } from "@/lib/utils";
import { today, tomorrow, weekRange } from "@/lib/dates";

export const metadata: Metadata = { title: "Sales - Follow-ups" };

async function rows(filters: LeadFilters): Promise<LeadWithRelations[]> {
  try {
    return (await leadsService.list(filters, { pageSize: 200 })).rows;
  } catch {
    return [];
  }
}

function LeadList({
  leads,
  emptyTitle,
  emptyDescription,
}: {
  leads: LeadWithRelations[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (leads.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {leads.map((lead) => (
        <li
          key={lead.id}
          className="flex flex-wrap items-center justify-between gap-3 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/sales/leads/${lead.id}`}
              className="truncate font-medium text-neutral-900 hover:text-brand-700"
            >
              {lead.company_name}
            </Link>
            <StatusBadge label={lead.status?.label} color={lead.status?.color} />
          </div>
          <div className="flex shrink-0 items-center gap-4 text-sm">
            <span className="tabular-nums text-neutral-700">
              {formatCHF(lead.estimated_value, lead.currency)}
            </span>
            <span className="text-neutral-500">
              {lead.next_action_date ? formatDate(lead.next_action_date) : "-"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Section({
  title,
  titleClassName,
  leads,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  titleClassName?: string;
  leads: LeadWithRelations[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn(titleClassName)}>
          {title} ({leads.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LeadList
          leads={leads}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </CardContent>
    </Card>
  );
}

export default async function SalesFollowupsPage() {
  const t = today();
  const tm = tomorrow();
  const week = weekRange(0);

  const [overdue, due, next, thisWeek] = await Promise.all([
    rows({ overdue: true, excludeStatus: ["won", "lost"] }),
    rows({ dueFrom: t, dueTo: t, excludeStatus: ["won", "lost"] }),
    rows({ dueFrom: tm, dueTo: tm, excludeStatus: ["won", "lost"] }),
    rows({ dueFrom: week.from, dueTo: week.to, excludeStatus: ["won", "lost"] }),
  ]);

  return (
    <div className="space-y-6">
      <Section
        title="Ueberfaellig"
        titleClassName="text-red-600"
        leads={overdue}
        emptyTitle="Nichts ueberfaellig"
        emptyDescription="Sehr gut - keine ueberfaelligen Follow-ups."
      />
      <Section
        title="Heute faellig"
        leads={due}
        emptyTitle="Heute nichts faellig"
        emptyDescription="Fuer heute stehen keine Follow-ups an."
      />
      <Section
        title="Morgen"
        leads={next}
        emptyTitle="Morgen nichts faellig"
        emptyDescription="Fuer morgen sind keine Follow-ups geplant."
      />
      <Section
        title="Diese Woche"
        leads={thisWeek}
        emptyTitle="Diese Woche nichts faellig"
        emptyDescription="In dieser Woche stehen keine Follow-ups an."
      />
    </div>
  );
}
