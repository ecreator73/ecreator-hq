import type { Metadata } from "next";
import { leadsService } from "@/server/services";
import { LeadPipeline } from "@/components/sales/lead-pipeline";
import type { LeadWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Leads - Tabelle" };

/** Lead-Pipeline (Kanban) - im Menue "Tabelle". */
export default async function LeadsPipelinePage() {
  const leads: LeadWithRelations[] = await leadsService
    .board()
    .catch(() => [] as LeadWithRelations[]);

  return <LeadPipeline leads={leads} />;
}
