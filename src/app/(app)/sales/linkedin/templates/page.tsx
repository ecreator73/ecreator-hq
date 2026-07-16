import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TemplateManager } from "@/components/linkedin/template-manager";
import { linkedinTemplatesService } from "@/server/services";
import type { LinkedInMessageTemplate } from "@/types/entities";

export const metadata: Metadata = { title: "LinkedIn - Nachrichten-Vorlagen" };

export default async function LinkedInTemplatesPage() {
  // Demo-Modus / fehlende Migration: nie crashen, stattdessen Hinweis zeigen.
  const templates: LinkedInMessageTemplate[] | null =
    await linkedinTemplatesService.list().catch(() => null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LinkedIn Sales"
        title="Nachrichten-Vorlagen"
        description="Wiederverwendbare Vorlagen mit Platzhaltern fuer die persoenliche LinkedIn-Ansprache."
      />

      {templates === null ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Noch keine Daten - falls das Modul neu ist: Migration 0021 in
            Supabase einspielen.
          </span>
        </div>
      ) : null}

      <TemplateManager templates={templates ?? []} />
    </div>
  );
}
