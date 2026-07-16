import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  linkedinCampaignsService,
  linkedinDashboardService,
} from "@/server/services";
import type { LinkedInProspectStatus } from "@/config/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "LinkedIn - Statistiken" };

type KpiTone = "neutral" | "brand" | "green" | "amber";

const TONE_STYLES: Record<KpiTone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-700",
  green: "text-green-600",
  amber: "text-amber-600",
};

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: KpiTone;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
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

export default async function LinkedInStatsPage() {
  // Beide Loads parallel; Demo-Modus / fehlende Migration: nie crashen.
  const [statsRes, campaignStats] = await Promise.all([
    linkedinDashboardService.stats().catch(() => null),
    linkedinCampaignsService
      .stats()
      .catch(
        () => [] as Awaited<ReturnType<typeof linkedinCampaignsService.stats>>,
      ),
  ]);

  const stats = statsRes ?? {
    total: 0,
    new7d: 0,
    contactRequests: 0,
    connected: 0,
    replyRate: 0,
    meetings: 0,
    offers: 0,
    won: 0,
    pipeline: [] as Array<{ status: LinkedInProspectStatus; count: number }>,
  };

  // Kumulative Antworten = aktuell in "antwort_erhalten" + alle weiter
  // fortgeschrittenen Stufen (meetings enthaelt Termin/Angebot/Gewonnen).
  const replies =
    (stats.pipeline.find((p) => p.status === "antwort_erhalten")?.count ?? 0) +
    stats.meetings;

  const funnel = [
    { label: "Kontaktanfragen", value: stats.contactRequests },
    { label: "Verbunden", value: stats.connected },
    { label: "Antworten", value: replies },
    { label: "Termine", value: stats.meetings },
    { label: "Angebote", value: stats.offers },
    { label: "Gewonnen", value: stats.won },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((s) => s.value));

  return (
    <div className="space-y-6">
      <PageHeader
        title="LinkedIn-Statistiken"
        description="Kennzahlen der LinkedIn-Akquise — Funnel von der Kontaktanfrage bis zum Abschluss."
      />

      {statsRes === null ? (
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

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Prospects gesamt" value={stats.total} />
        <Kpi label="Neu (7 Tage)" value={stats.new7d} tone="brand" />
        <Kpi label="Kontaktanfragen" value={stats.contactRequests} />
        <Kpi label="Verbunden" value={stats.connected} />
        <Kpi
          label="Antwortquote"
          value={`${stats.replyRate}%`}
          tone={stats.replyRate > 0 ? "amber" : "neutral"}
        />
        <Kpi label="Gespraeche/Termine" value={stats.meetings} />
        <Kpi label="Angebote" value={stats.offers} />
        <Kpi
          label="Gewonnen"
          value={stats.won}
          tone={stats.won > 0 ? "green" : "neutral"}
        />
      </div>

      {/* Funnel: horizontale Balken, dependency-frei mit Divs */}
      <Card>
        <CardHeader>
          <CardTitle>Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.total === 0 ? (
            <EmptyState
              title="Noch keine Prospects erfasst"
              description="Sobald Prospects angelegt oder importiert sind, erscheint hier der Funnel."
            />
          ) : (
            <ol className="space-y-3">
              {funnel.map((stage, i) => (
                <li key={stage.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="text-neutral-600">{stage.label}</span>
                    <span className="font-medium tabular-nums text-neutral-900">
                      {stage.value}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        i === funnel.length - 1
                          ? "bg-green-500"
                          : "bg-brand-500",
                      )}
                      style={{
                        width: `${Math.max(
                          stage.value > 0 ? 2 : 0,
                          Math.round((stage.value / maxFunnel) * 100),
                        )}%`,
                      }}
                      title={`${stage.label}: ${stage.value}`}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Kennzahlen pro Kampagne */}
      <Card>
        <CardHeader>
          <CardTitle>Pro Kampagne</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignStats.length === 0 ? (
            <EmptyState
              title="Noch keine Kampagnen"
              description="Lege Kampagnen an und ordne Prospects zu, um die Performance zu vergleichen."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Prospects
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Kontaktiert
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Verbunden
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Antworten
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Termine
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Gewonnen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {campaignStats.map((c) => (
                    <tr key={c.campaign.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">
                        {c.campaign.name}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {c.total}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {c.contacted}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {c.connected}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {c.replied}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {c.meetings}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-medium tabular-nums",
                          c.won > 0 ? "text-green-600" : "text-neutral-900",
                        )}
                      >
                        {c.won}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
