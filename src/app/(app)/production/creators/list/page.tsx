import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { StarRating } from "@/components/creators/star-rating";
import { CreatorQuickCreate } from "@/components/creators/creator-quick-create";
import { CreatorImport } from "@/components/creators/creator-import";
import { CreatorExportButtons } from "@/components/creators/creator-export-buttons";
import { creatorsService } from "@/server/services";
import type { CreatorFilters } from "@/server/services";
import type { CreatorWithStats } from "@/types/entities";
import {
  CREATOR_STATUSES,
  CREATOR_TYPES,
  CREATOR_TYPE_LABELS,
  STATUS_REGISTRY,
  statusLabel,
} from "@/config/catalog";
import { cn, formatCHF } from "@/lib/utils";

export const metadata: Metadata = { title: "Creators - Creator Pool" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const controlClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function creatorStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return STATUS_REGISTRY.creator[
    status as keyof typeof STATUS_REGISTRY.creator
  ]?.color;
}

function typesLabel(types: string[] | null): string {
  if (!types || types.length === 0) return "-";
  return types
    .map(
      (t) =>
        CREATOR_TYPE_LABELS[t as keyof typeof CREATOR_TYPE_LABELS] ?? t,
    )
    .join(", ");
}

function regionLabel(creator: CreatorWithStats): string {
  const parts = [creator.city, creator.canton].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(", ") : "-";
}

export default async function CreatorsListPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const minScoreRaw = one(sp.minScore);
  const minScore =
    minScoreRaw != null && minScoreRaw !== "" ? Number(minScoreRaw) : undefined;

  const filters: CreatorFilters = {
    status: one(sp.status) || undefined,
    canton: one(sp.canton) || undefined,
    creatorType: one(sp.type) || undefined,
    minScore: Number.isFinite(minScore) ? minScore : undefined,
    search: one(sp.q) || undefined,
  };

  const creators: CreatorWithStats[] = await creatorsService
    .listWithStats(filters)
    .catch(() => []);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Creators ({creators.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <CreatorImport />
            <CreatorExportButtons creators={creators} />
            <CreatorQuickCreate />
          </div>
        </div>

        <form method="GET" className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="creator-status-filter"
              className="text-xs font-medium text-neutral-500"
            >
              Status
            </label>
            <select
              id="creator-status-filter"
              name="status"
              defaultValue={filters.status ?? ""}
              className={cn(controlClass, "font-medium")}
            >
              <option value="">Alle Status</option>
              {CREATOR_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="creator-type-filter"
              className="text-xs font-medium text-neutral-500"
            >
              Kategorie
            </label>
            <select
              id="creator-type-filter"
              name="type"
              defaultValue={filters.creatorType ?? ""}
              className={cn(controlClass, "font-medium")}
            >
              <option value="">Alle Kategorien</option>
              {CREATOR_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="creator-canton-filter"
              className="text-xs font-medium text-neutral-500"
            >
              Kanton
            </label>
            <input
              id="creator-canton-filter"
              name="canton"
              defaultValue={filters.canton ?? ""}
              placeholder="z. B. ZH"
              className={cn(controlClass, "w-28")}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="creator-minscore-filter"
              className="text-xs font-medium text-neutral-500"
            >
              Min-Score
            </label>
            <input
              id="creator-minscore-filter"
              name="minScore"
              type="number"
              min={0}
              max={100}
              defaultValue={minScoreRaw ?? ""}
              placeholder="0"
              className={cn(controlClass, "w-24")}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="creator-search"
              className="text-xs font-medium text-neutral-500"
            >
              Suche
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              />
              <input
                id="creator-search"
                name="q"
                defaultValue={filters.search ?? ""}
                placeholder="Name, E-Mail, Handle ..."
                className={cn(controlClass, "w-60 pl-8")}
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <Search className="h-4 w-4" />
            Filtern
          </button>

          <Link
            href="/production/creators/list"
            className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50"
          >
            Zuruecksetzen
          </Link>
        </form>
      </CardHeader>

      <CardContent>
        {creators.length === 0 ? (
          <EmptyState
            title="Keine Creators gefunden"
            description="Es gibt keine Creators, die zu den aktuellen Filtern passen. Passe die Filter an oder lege einen neuen Creator an."
            action={<CreatorQuickCreate />}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[72rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Typen</th>
                  <th className="px-4 py-2.5 font-medium">Region</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Tagessatz
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Bewertung</th>
                  <th className="px-4 py-2.5 font-medium">Reise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {creators.map((c) => (
                  <tr key={c.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/production/creators/${c.id}`}
                        className="font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {c.first_name} {c.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={statusLabel("creator", c.status)}
                        color={creatorStatusColor(c.status)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {typesLabel(c.creator_types)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {regionLabel(c)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {c.full_day_rate != null
                        ? formatCHF(c.full_day_rate)
                        : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {c.score ?? 0}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.rating_avg != null ? (
                        <span className="inline-flex items-center gap-1.5">
                          <StarRating value={c.rating_avg} size={14} />
                          <span className="text-xs text-neutral-500">
                            {c.rating_avg.toFixed(1)}
                            {c.rating_count > 0 ? ` (${c.rating_count})` : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {c.travel_available ? "Ja" : "Nein"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
