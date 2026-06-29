import type { Metadata } from "next";
import { leadsService } from "@/server/services";
import type { LeadFilters } from "@/server/services";
import { LeadsTable } from "@/components/sales/leads-table";
import { salesFormOptionsAction } from "@/app/(app)/sales/actions";
import type { LeadWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Sales - Leads" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export default async function SalesLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const scoreMinRaw = one(sp.scoreMin);
  const scoreMin = scoreMinRaw ? Number(scoreMinRaw) : undefined;

  const filters: LeadFilters = {
    search: one(sp.search),
    status: one(sp.status),
    source: one(sp.source),
    owner_id: one(sp.owner),
    scoreMin: scoreMin && !Number.isNaN(scoreMin) ? scoreMin : undefined,
  };

  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);
  const SORTABLE = [
    "company_name",
    "lead_score",
    "estimated_value",
    "next_action_date",
    "created_at",
  ];
  const sortColRaw = one(sp.sort);
  const sortCol =
    sortColRaw && SORTABLE.includes(sortColRaw) ? sortColRaw : undefined;
  const sort = sortCol
    ? { column: sortCol, ascending: (one(sp.dir) ?? "asc") === "asc" }
    : undefined;

  let result = {
    rows: [] as LeadWithRelations[],
    total: 0,
    page,
    pageSize: 50,
  };
  try {
    result = await leadsService.list(filters, { page, sort });
  } catch {
    // Demo-Modus / keine DB -> leere Tabelle
  }

  const optRes = await salesFormOptionsAction();
  const users = optRes.ok && optRes.data ? optRes.data.users : [];

  return (
    <LeadsTable
      rows={result.rows}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      options={{ users }}
    />
  );
}
