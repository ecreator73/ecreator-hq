import type { Metadata } from "next";
import Link from "next/link";
import { Star, Clapperboard } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { StarRating } from "@/components/creators/star-rating";
import { creatorsService } from "@/server/services";
import type { CreatorWithStats } from "@/types/entities";
import { formatCHF, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Creator-Reporting" };

interface CreatorReporting {
  total: number;
  active: number;
  avgDayRate: number | null;
  topPerformers: CreatorWithStats[];
  mostBooked: CreatorWithStats[];
}

const EMPTY_REPORTING: CreatorReporting = {
  total: 0,
  active: 0,
  avgDayRate: null,
  topPerformers: [],
  mostBooked: [],
};

/** Vollstaendiger Anzeigename eines Creators. */
function creatorName(c: CreatorWithStats): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "Unbenannt";
}

type KpiTone = "neutral" | "brand" | "green";

const KPI_TONE: Record<KpiTone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-700",
  green: "text-green-600",
};

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: KpiTone;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          KPI_TONE[tone],
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default async function CreatorReportingPage() {
  const r = await creatorsService.reporting().catch(() => EMPTY_REPORTING);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Creator-Pool"
        title="Creator-Reporting"
        description="Leistung der Creator im Blick - Bewertungen und Buchungen auf einen Blick."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Anzahl Creator" value={r.total} tone="brand" />
        <Kpi label="Aktive Creator" value={r.active} tone="green" />
        <Kpi label="Durchschnittspreis / Tag" value={formatCHF(r.avgDayRate)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r.topPerformers.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Noch keine Bewertungen"
                description="Sobald Creator nach Shootings bewertet wurden, erscheinen hier die Top Performer."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                      <th className="px-4 py-2.5 font-medium">Creator</th>
                      <th className="px-4 py-2.5 font-medium">Bewertung</th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Anzahl
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {r.topPerformers.map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/production/creators/${c.id}`}
                            className="font-medium text-neutral-900 hover:text-brand-700"
                          >
                            {creatorName(c)}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <StarRating value={c.rating_avg} size="sm" />
                            <span className="tabular-nums text-neutral-500">
                              {c.rating_avg != null
                                ? c.rating_avg.toFixed(1)
                                : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-500">
                          {c.rating_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Haeufig gebucht */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clapperboard
                className="h-4 w-4 text-neutral-400"
                aria-hidden="true"
              />
              Haeufig gebucht
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r.mostBooked.length === 0 ? (
              <EmptyState
                icon={Clapperboard}
                title="Noch keine Buchungen"
                description="Sobald Creator fuer Shootings besetzt wurden, erscheinen hier die meistgebuchten Talente."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[24rem] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                      <th className="px-4 py-2.5 font-medium">Creator</th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Shootings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {r.mostBooked.map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/production/creators/${c.id}`}
                            className="font-medium text-neutral-900 hover:text-brand-700"
                          >
                            {creatorName(c)}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                          {c.shoot_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
