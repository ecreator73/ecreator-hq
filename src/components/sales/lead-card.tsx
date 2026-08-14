import Link from "next/link";
import { CalendarClock, Coins, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatCHF, formatDate, cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/types/entities";

function scoreTone(score: number): string {
  if (score >= 70) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-neutral-100 text-neutral-500 border-neutral-200";
}

/** Vor weniger als 48 Stunden eingegangen -> "Neu"-Markierung. */
function isFresh(lead: LeadWithRelations): boolean {
  if (!lead.created_at) return false;
  return Date.now() - new Date(lead.created_at).getTime() < 48 * 60 * 60 * 1000;
}

const TERMINAL = ["abgeschlossen", "absage", "fehleintrag", "andere"];
function overdue(lead: LeadWithRelations): boolean {
  if (!lead.next_action_date) return false;
  if (TERMINAL.includes(lead.status?.key ?? "")) return false;
  return lead.next_action_date < new Date().toISOString().slice(0, 10);
}

/** Karte in der Pipeline - zeigt auf einen Blick, mit wem es um was geht. */
export function LeadCard({ lead }: { lead: LeadWithRelations }) {
  const isOverdue = overdue(lead);
  const title = lead.contact_name || lead.company_name;
  const subtitle = lead.contact_name ? lead.company_name : null;

  return (
    <Link
      href={`/sales/leads/${lead.id}`}
      draggable={false}
      className={cn(
        "group block rounded-lg border bg-white p-3 shadow-sm transition-all",
        "hover:-translate-y-px hover:border-brand-300 hover:shadow-md",
        isOverdue ? "border-red-200" : "border-neutral-200",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-semibold leading-snug text-neutral-900 group-hover:text-brand-700">
          {isFresh(lead) ? (
            <span className="mr-1.5 inline-flex items-center rounded bg-brand-100 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-brand-700">
              Neu
            </span>
          ) : null}
          {title}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
            scoreTone(lead.lead_score),
          )}
          title="Lead-Score"
        >
          {lead.lead_score}
        </span>
      </div>

      {subtitle ? (
        <p className="mt-0.5 truncate text-xs text-neutral-500">{subtitle}</p>
      ) : null}

      {lead.dienstleistung ? (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-neutral-500">
          {lead.dienstleistung}
        </p>
      ) : null}

      {lead.campaign_name ? (
        <p className="mt-1.5 truncate text-[10px] uppercase tracking-wide text-neutral-400">
          {lead.campaign_name}
        </p>
      ) : null}

      {/* Fusszeile: Wert / Telefon / Faelligkeit / Verantwortlich */}
      <div className="mt-2.5 flex items-center gap-2 border-t border-neutral-100 pt-2 text-[11px] text-neutral-500">
        {lead.estimated_value ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Coins className="h-3 w-3" />
            {formatCHF(lead.estimated_value, lead.currency)}
          </span>
        ) : lead.phone ? (
          <span className="inline-flex min-w-0 items-center gap-1">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </span>
        ) : null}

        {lead.next_action_date ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 whitespace-nowrap",
              isOverdue ? "font-semibold text-red-600" : "text-neutral-400",
            )}
            title={isOverdue ? "Follow-up ueberfaellig" : "Naechste Aktion"}
          >
            <CalendarClock className="h-3 w-3" />
            {formatDate(lead.next_action_date)}
          </span>
        ) : null}

        {lead.owner ? (
          <span className="ml-auto shrink-0" title={lead.owner.full_name ?? undefined}>
            <Avatar name={lead.owner.full_name ?? "?"} className="h-5 w-5 text-[9px]" />
          </span>
        ) : null}
      </div>
    </Link>
  );
}
