import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  CampaignManager,
  type LinkedInCampaignStat,
} from "@/components/linkedin/campaign-manager";
import { linkedinCampaignsService } from "@/server/services";

export const metadata: Metadata = { title: "LinkedIn - Kampagnen" };

export default async function LinkedInCampaignsPage() {
  // Demo-Modus / fehlende Migration: nie crashen, stattdessen Hinweis zeigen.
  const stats: LinkedInCampaignStat[] | null = await linkedinCampaignsService
    .stats()
    .catch(() => null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LinkedIn Sales"
        title="Kampagnen"
        description="Buendle deine LinkedIn-Akquise pro Zielgruppe und verfolge den Funnel von der Kontaktanfrage bis zum Abschluss."
      />

      {stats === null ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Noch keine Daten - falls das Modul neu ist: Migration 0021 in
            Supabase einspielen.
          </span>
        </div>
      ) : null}

      <CampaignManager stats={stats ?? []} />
    </div>
  );
}
