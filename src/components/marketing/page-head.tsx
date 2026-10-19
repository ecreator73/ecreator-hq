import { Suspense } from "react";
import { RangeFilter } from "./range-filter";
import { Freshness } from "./ui";
import type { ResolvedRange } from "@/lib/marketing/range";
import { formatDay } from "@/lib/marketing/range";
import type { SourceStatus } from "@/server/marketing/dashboard.service";

/** Seitenkopf: Titel, Untertitel, Zeitraumfilter, Frische der Quellen. */
export function PageHead({
  title,
  subtitle,
  range,
  sources,
  showRange = true,
  showCompare = true,
  actions,
}: {
  title: string;
  subtitle?: string;
  range?: ResolvedRange;
  sources?: SourceStatus[];
  showRange?: boolean;
  showCompare?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {range && showRange ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Suspense fallback={null}>
            <RangeFilter key={`${range.from}-${range.to}`} from={range.from} to={range.to} showCompare={showCompare} />
          </Suspense>
          <p className="text-[11px] text-neutral-500">
            {formatDay(range.from)} – {formatDay(range.to)} · Europe/Zurich
            {showCompare && range.compare ? ` · Vergleich ${formatDay(range.compare.from)} – ${formatDay(range.compare.to)}` : ""}
          </p>
        </div>
      ) : null}
      {sources?.length ? <Freshness statuses={sources} /> : null}
    </div>
  );
}
