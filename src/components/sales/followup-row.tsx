import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { StatusBadge } from "@/components/tasks/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { LEAD_SOURCE_LABELS } from "@/config/catalog";
import { formatCHF, formatDate, cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/types/entities";

/** Tage zwischen heute und dem Follow-up-Datum (negativ = ueberfaellig). */
export function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  const d = new Date(`${dateIso}T00:00:00`);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

/** "3 Tage ueberfaellig" / "Heute" / "in 2 Tagen" */
export function dueLabel(dateIso: string | null | undefined): string {
  const n = daysUntil(dateIso);
  if (n === null) return "Kein Datum";
  if (n < -1) return `${Math.abs(n)} Tage ueberfaellig`;
  if (n === -1) return "1 Tag ueberfaellig";
  if (n === 0) return "Heute";
  if (n === 1) return "Morgen";
  return `in ${n} Tagen`;
}

const srcLabel = (s: string | null) =>
  s ? (LEAD_SOURCE_LABELS[s as keyof typeof LEAD_SOURCE_LABELS] ?? s) : null;

function scoreTone(score: number): string {
  if (score >= 70) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-neutral-100 text-neutral-500 border-neutral-200";
}

const ACTION =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-brand-300 hover:text-brand-700";

/**
 * Eine Zeile der Follow-up-Liste: alles was man zum Nachfassen braucht -
 * wer, was, wie dringend, plus Anrufen/Mail/WhatsApp mit einem Klick.
 */
export function FollowupRow({ lead }: { lead: LeadWithRelations }) {
  const n = daysUntil(lead.next_action_date);
  const isOverdue = n !== null && n < 0;
  const isToday = n === 0;
  const waNumber = (lead.phone ?? "").replace(/[^\d+]/g, "").replace(/^\+/, "");

  return (
    <li
      className={cn(
        "flex flex-wrap items-start gap-x-4 gap-y-2 border-l-2 py-3 pl-3 transition-colors hover:bg-neutral-50",
        isOverdue ? "border-red-400" : isToday ? "border-amber-400" : "border-transparent",
      )}
    >
      {/* Wer */}
      <div className="min-w-[13rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/sales/leads/${lead.id}`}
            className="font-medium text-neutral-900 hover:text-brand-700"
          >
            {lead.contact_name || lead.company_name}
          </Link>
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
              scoreTone(lead.lead_score),
            )}
            title="Lead-Score"
          >
            {lead.lead_score}
          </span>
          <StatusBadge label={lead.status?.label} color={lead.status?.color} />
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {[lead.contact_name ? lead.company_name : null, lead.city]
            .filter(Boolean)
            .join(" · ") || " "}
        </p>
        {lead.dienstleistung ? (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-neutral-500">
            {lead.dienstleistung}
          </p>
        ) : null}
      </div>

      {/* Kontaktwege */}
      <div className="min-w-[12rem] text-xs text-neutral-500">
        {lead.phone ? (
          <a href={`tel:${lead.phone}`} className="block hover:text-brand-700">
            {lead.phone}
          </a>
        ) : null}
        {lead.email ? (
          <a
            href={`mailto:${lead.email}`}
            className="block max-w-[14rem] truncate hover:text-brand-700"
          >
            {lead.email}
          </a>
        ) : null}
        {!lead.phone && !lead.email ? (
          <span className="text-neutral-300">Keine Kontaktdaten</span>
        ) : null}
      </div>

      {/* Herkunft / Wert */}
      <div className="min-w-[10rem] text-xs text-neutral-500">
        {srcLabel(lead.source) ? <p>{srcLabel(lead.source)}</p> : null}
        {lead.campaign_name ? (
          <p className="max-w-[12rem] truncate" title={lead.campaign_name}>
            {lead.campaign_name}
          </p>
        ) : null}
        {lead.estimated_value ? (
          <p className="tabular-nums text-neutral-700">
            {formatCHF(lead.estimated_value, lead.currency)}
          </p>
        ) : null}
      </div>

      {/* Faelligkeit */}
      <div className="min-w-[8.5rem] text-right text-xs">
        <p
          className={cn(
            "font-medium",
            isOverdue ? "text-red-600" : isToday ? "text-amber-600" : "text-neutral-600",
          )}
        >
          {dueLabel(lead.next_action_date)}
        </p>
        <p className="text-neutral-400">
          {lead.next_action_date ? formatDate(lead.next_action_date) : "-"}
        </p>
      </div>

      {/* Verantwortlich + Aktionen */}
      <div className="flex shrink-0 items-center gap-2">
        {lead.owner ? (
          <span title={lead.owner.full_name ?? undefined}>
            <Avatar name={lead.owner.full_name ?? "?"} className="h-7 w-7 text-[10px]" />
          </span>
        ) : (
          <span className="hidden text-[11px] text-neutral-400 sm:inline">
            Nicht zugewiesen
          </span>
        )}
        {lead.phone ? (
          <a href={`tel:${lead.phone}`} className={ACTION} title="Anrufen" aria-label="Anrufen">
            <Phone className="h-4 w-4" />
          </a>
        ) : null}
        {lead.email ? (
          <a
            href={`mailto:${lead.email}`}
            className={ACTION}
            title="E-Mail schreiben"
            aria-label="E-Mail schreiben"
          >
            <Mail className="h-4 w-4" />
          </a>
        ) : null}
        {waNumber ? (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noreferrer"
            className={ACTION}
            title="WhatsApp"
            aria-label="WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </li>
  );
}
