import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { CompanyQuickCreate } from "@/components/lead-engine/company-quick-create";
import { CompanyImport } from "@/components/lead-engine/company-import";
import { leadCompaniesService } from "@/server/services";
import type { LeadCompanyFilters } from "@/server/services";
import type { LeadCompanyWithStats } from "@/types/entities";
import {
  LEAD_OPPORTUNITY_TYPES,
  LEAD_OPPORTUNITY_TYPE_LABELS,
  WATCHLIST_STATUSES,
  WATCHLIST_STATUS_LABELS,
  TARGET_REGIONS,
  watchlistStatusColor,
  leadScoreLevel,
} from "@/config/catalog";

export const metadata: Metadata = { title: "Lead Engine - Firmen" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function watchlistLabel(key: string): string {
  return (
    WATCHLIST_STATUS_LABELS[key as keyof typeof WATCHLIST_STATUS_LABELS] ?? key
  );
}

export default async function LeadEngineCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const canton = one(sp.canton) ?? "";
  const industry = one(sp.industry) ?? "";
  const minScoreRaw = one(sp.minScore) ?? "";
  const opportunityType = one(sp.opportunityType) ?? "";
  const watchlistStatus = one(sp.watchlistStatus) ?? "";
  const q = one(sp.q) ?? "";

  const minScoreNum = minScoreRaw ? Number(minScoreRaw) : NaN;

  const filters: LeadCompanyFilters = {
    canton: canton || undefined,
    industry: industry || undefined,
    minScore: Number.isFinite(minScoreNum) ? minScoreNum : undefined,
    opportunityType: opportunityType || undefined,
    watchlistStatus: watchlistStatus || undefined,
    search: q || undefined,
  };

  let companies: LeadCompanyWithStats[] = [];
  try {
    companies = await leadCompaniesService.list(filters);
  } catch {
    companies = [];
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Firmen ({companies.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <CompanyImport />
            <CompanyQuickCreate />
          </div>
        </div>

        <form
          method="get"
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6"
        >
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">
              Region
            </label>
            <input
              name="canton"
              defaultValue={canton}
              list="lead-region-options"
              placeholder="Region"
              className={inputClass}
            />
            <datalist id="lead-region-options">
              {TARGET_REGIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">
              Branche
            </label>
            <input
              name="industry"
              defaultValue={industry}
              placeholder="Branche"
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">
              Min-Score
            </label>
            <input
              name="minScore"
              type="number"
              min={0}
              max={100}
              defaultValue={minScoreRaw}
              placeholder="0"
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">
              Opportunity-Typ
            </label>
            <select
              name="opportunityType"
              defaultValue={opportunityType}
              className={inputClass}
            >
              <option value="">Alle</option>
              {LEAD_OPPORTUNITY_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {LEAD_OPPORTUNITY_TYPE_LABELS[t.key]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">
              Watchlist
            </label>
            <select
              name="watchlistStatus"
              defaultValue={watchlistStatus}
              className={inputClass}
            >
              <option value="">Alle</option>
              {WATCHLIST_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">
              Suche
            </label>
            <div className="flex gap-2">
              <input
                name="q"
                defaultValue={q}
                placeholder="Name, Website, Ort"
                className={inputClass}
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                Filtern
              </button>
            </div>
          </div>
        </form>
      </CardHeader>

      <CardContent>
        {companies.length === 0 ? (
          <EmptyState
            title="Keine Firmen gefunden"
            description="Es gibt keine Firmen, die zu den aktuellen Filtern passen. Passe die Filter an, lege eine Firma an oder importiere eine CSV-Liste."
            action={<CompanyQuickCreate />}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[64rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Firma</th>
                  <th className="px-4 py-2.5 font-medium">Branche</th>
                  <th className="px-4 py-2.5 font-medium">Region</th>
                  <th className="px-4 py-2.5 font-medium">Gesamt-Score</th>
                  <th className="px-4 py-2.5 text-right font-medium">Website</th>
                  <th className="px-4 py-2.5 text-right font-medium">Ads</th>
                  <th className="px-4 py-2.5 text-right font-medium">CRM</th>
                  <th className="px-4 py-2.5 font-medium">Watchlist</th>
                  <th className="px-4 py-2.5 font-medium">Uebergeben</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {companies.map((c) => {
                  const level = leadScoreLevel(c.overall_score);
                  const region =
                    [c.city, c.canton].filter(Boolean).join(", ") || "-";
                  return (
                    <tr key={c.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/sales/lead-engine/${c.id}`}
                          className="font-medium text-neutral-900 hover:text-brand-700"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700">
                        {c.industry ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">{region}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          label={`${c.overall_score} · ${level.label}`}
                          color={level.tone}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">
                        {c.website_score}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">
                        {c.ads_score}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">
                        {c.crm_score}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          label={watchlistLabel(c.watchlist_status)}
                          color={watchlistStatusColor(c.watchlist_status)}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {c.handed_over ? "Ja" : "Nein"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
