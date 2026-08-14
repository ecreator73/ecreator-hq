import type { Metadata } from "next";
import { leadsService } from "@/server/services";
import { LeadsFullTable } from "@/components/sales/leads-full-table";
import type { LeadWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Leads - Tabelle" };

/**
 * Vollstaendige Lead-Tabelle: alle erfassten Felder in einer Ansicht,
 * sortierbar/filterbar und als CSV exportierbar.
 */
export default async function LeadsTablePage() {
  const leads: LeadWithRelations[] = await leadsService
    .board()
    .catch(() => [] as LeadWithRelations[]);

  return <LeadsFullTable leads={leads} />;
}
