import type { Metadata } from "next";
import { linkedinProspectsService } from "@/server/services";
import { PipelineBoard } from "@/components/linkedin/pipeline-board";
import type { LinkedInProspectWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "LinkedIn Sales - Pipeline" };

export default async function LinkedInPipelinePage() {
  let prospects: LinkedInProspectWithRelations[] = [];
  let loadError = false;
  try {
    prospects = await linkedinProspectsService.board({});
  } catch {
    // Demo-Modus / Tabelle fehlt -> leere Pipeline + Hinweis, nie crashen
    loadError = true;
  }
  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Noch keine Daten - falls das Modul neu ist: Migration <code>0021</code>{" "}
          in Supabase einspielen.
        </p>
      ) : null}
      <PipelineBoard prospects={prospects} />
    </div>
  );
}
