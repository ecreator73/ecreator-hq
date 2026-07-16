import type { Metadata } from "next";
import { Info } from "lucide-react";
import {
  linkedinDashboardService,
  linkedinTemplatesService,
} from "@/server/services";
import { SessionRunner } from "@/components/linkedin/session-runner";

export const metadata: Metadata = { title: "LinkedIn - Tages-Session" };

export const dynamic = "force-dynamic";

/**
 * Tages-Session: alle heute faelligen (+ ueberfaelligen) Prospects als
 * Abarbeitungs-Strecke - Profil oeffnen, personalisierte Nachricht kopieren,
 * Ergebnis mit einem Klick erfassen, weiter. Kein Auto-Versand.
 */
export default async function LinkedInSessionPage() {
  // Unabhaengige Abrufe parallel.
  const [followups, templates] = await Promise.all([
    linkedinDashboardService
      .followups()
      .catch(() => null),
    linkedinTemplatesService.list().catch(() => []),
  ]);

  if (followups === null) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
        <span>
          Noch keine Daten - falls das Modul neu ist: Migration 0021 in
          Supabase einspielen.
        </span>
      </div>
    );
  }

  // Ueberfaellige zuerst, dann heute; max. 30 pro Session.
  const queue = [...followups.overdue, ...followups.today].slice(0, 30);

  return (
    <SessionRunner
      queue={queue}
      templates={templates.filter((t) => t.active)}
      overdueCount={followups.overdue.length}
      todayCount={followups.today.length}
    />
  );
}
