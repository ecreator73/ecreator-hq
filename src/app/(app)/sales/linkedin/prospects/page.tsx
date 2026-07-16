import type { Metadata } from "next";
import { linkedinProspectsService } from "@/server/services";
import type { ProspectFilters } from "@/server/services";
import { linkedinFormOptionsAction } from "@/app/(app)/sales/linkedin/actions";
import { ProspectsTable } from "@/components/linkedin/prospects-table";

export const metadata: Metadata = { title: "Sales - LinkedIn Prospects" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const SORTABLE = [
  "full_name",
  "company_name",
  "lead_score",
  "next_followup_date",
  "created_at",
];

export default async function LinkedInProspectsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const scoreMinRaw = one(sp.scoreMin);
  const scoreMin = scoreMinRaw ? Number(scoreMinRaw) : undefined;

  const filters: ProspectFilters = {
    search: one(sp.search),
    status: one(sp.status),
    campaign_id: one(sp.campaign),
    owner_id: one(sp.owner),
    industry: one(sp.industry),
    scoreMin: scoreMin && !Number.isNaN(scoreMin) ? scoreMin : undefined,
  };

  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);
  const sortColRaw = one(sp.sort);
  const sortCol =
    sortColRaw && SORTABLE.includes(sortColRaw) ? sortColRaw : undefined;
  const sort = sortCol
    ? { column: sortCol, ascending: (one(sp.dir) ?? "asc") === "asc" }
    : undefined;

  // Prospects + Formular-Optionen parallel laden (unabhaengig voneinander).
  const [result, optRes] = await Promise.all([
    linkedinProspectsService.list(filters, { page, sort }).catch(() => null),
    linkedinFormOptionsAction(),
  ]);
  const options =
    optRes.ok && optRes.data
      ? optRes.data
      : { users: [], campaigns: [] };

  return (
    <div className="space-y-4">
      {result === null ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Noch keine Daten - falls das Modul neu ist: Migration 0021 in
          Supabase einspielen.
        </div>
      ) : null}
      <ProspectsTable
        rows={result?.rows ?? []}
        total={result?.total ?? 0}
        page={result?.page ?? page}
        pageSize={result?.pageSize ?? 50}
        options={options}
      />
    </div>
  );
}
