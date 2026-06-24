import type { Metadata } from "next";
import { leadsService } from "@/server/services";
import { LeadPipeline } from "@/components/sales/lead-pipeline";
import type { LeadWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Sales - Pipeline" };

export default async function SalesPipelinePage() {
  let leads: LeadWithRelations[] = [];
  try {
    leads = await leadsService.board();
  } catch {
    // Demo-Modus / keine DB -> leere Pipeline
    leads = [];
  }
  return <LeadPipeline leads={leads} />;
}
