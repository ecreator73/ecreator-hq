import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GenerateDraft } from "@/components/outreach/generate-draft";
import { outreachMessagesService } from "@/server/services";
import type { OutreachDashboard } from "@/types/entities";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Outreach - Dashboard" };

const EMPTY_DASHBOARD: OutreachDashboard = {
  drafts: 0,
  sent: 0,
  replies: 0,
  positive: 0,
  followupsDue: 0,
  meetings: 0,
  replyRate: 0,
  positiveRate: 0,
  meetingRate: 0,
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
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: WidgetTone;
}) {
  return (
    <div className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          TONE_STYLES[tone],
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default async function OutreachDashboardPage() {
  const d = await outreachMessagesService
    .dashboard()
    .catch(() => EMPTY_DASHBOARD);

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <PageHeader
        title="Outreach-Dashboard"
        description="Personalisierte Kaltakquise per E-Mail — Entwuerfe erstellen, Antworten verfolgen und Termine buchen. Kein automatischer Massenversand."
        actions={<GenerateDraft />}
      />

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Widget label="Entwuerfe" value={d.drafts} />
        <Widget label="Gesendet" value={d.sent} tone="brand" />
        <Widget label="Antworten" value={d.replies} />
        <Widget label="Positive Antworten" value={d.positive} tone="green" />
        <Widget
          label="Follow-ups offen"
          value={d.followupsDue}
          tone={d.followupsDue > 0 ? "amber" : "neutral"}
        />
        <Widget label="Termine" value={d.meetings} tone="brand" />
      </div>

      {/* Quoten */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Widget
          label="Antwortquote"
          value={`${d.replyRate}%`}
          tone="brand"
        />
        <Widget
          label="Positiv-Quote"
          value={`${d.positiveRate}%`}
          tone="green"
        />
        <Widget
          label="Terminquote"
          value={`${d.meetingRate}%`}
          tone="brand"
        />
      </div>

      {/* Hinweis Versand-Integration */}
      <div className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
        <span>
          Entwuerfe werden hier vorbereitet und manuell freigegeben. Der
          tatsaechliche Versand erfordert eine verbundene Gmail- oder
          Resend-Integration — bis dahin werden keine E-Mails automatisch
          zugestellt.
        </span>
      </div>
    </div>
  );
}
