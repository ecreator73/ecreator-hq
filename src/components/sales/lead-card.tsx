import Link from "next/link";
import { CalendarClock, Coins } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatCHF, formatDate, cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/types/entities";

function scoreTone(score: number): string {
  if (score >= 70) return "bg-green-50 text-green-700 border-green-100";
  if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-neutral-100 text-neutral-600 border-neutral-200";
}

function overdue(lead: LeadWithRelations): boolean {
  if (!lead.next_action_date) return false;
  if (lead.status?.key === "won" || lead.status?.key === "lost") return false;
  return lead.next_action_date < new Date().toISOString().slice(0, 10);
}

export function LeadCard({ lead }: { lead: LeadWithRelations }) {
  return (
    <Link
      href={`/sales/leads/${lead.id}`}
      draggable={false}
      className="block rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-colors hover:border-brand-300"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-neutral-900">
          {lead.company_name}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold",
            scoreTone(lead.lead_score),
          )}
        >
          {lead.lead_score}
        </span>
      </div>
      {lead.contact_name ? (
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {lead.contact_name}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-neutral-500">
        {lead.estimated_value != null ? (
          <span className="inline-flex items-center gap-1">
            <Coins className="h-3.5 w-3.5" />
            {formatCHF(lead.estimated_value, lead.currency)}
          </span>
        ) : (
          <span />
        )}
        {lead.owner ? (
          <Avatar name={lead.owner.full_name ?? "?"} className="h-6 w-6 text-[10px]" />
        ) : null}
      </div>

      {lead.next_action_date ? (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs",
            overdue(lead) ? "font-medium text-red-600" : "text-neutral-400",
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDate(lead.next_action_date)}
        </div>
      ) : null}
    </Link>
  );
}
