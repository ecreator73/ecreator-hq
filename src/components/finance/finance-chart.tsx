import { EmptyState } from "@/components/ui/empty-state";
import { formatCHF, cn } from "@/lib/utils";
import type { FinanceSeriesPoint } from "@/types/entities";

/**
 * Schlankes Balkendiagramm aus reinen Divs (keine Chart-Library).
 * Hoehe je Balken relativ zum Maximalwert; Monatslabel = Monatsteil aus YYYY-MM.
 */
export function FinanceChart({
  points,
  label,
  color = "bg-brand-500",
}: {
  points: FinanceSeriesPoint[];
  label?: string;
  color?: string;
}) {
  const max = points.reduce((m, p) => Math.max(m, p.value), 0);

  if (points.length === 0 || max <= 0) {
    return (
      <div className="space-y-2">
        {label ? (
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {label}
          </p>
        ) : null}
        <EmptyState
          title="Keine Daten"
          description="Sobald Umsaetze erfasst sind, erscheint hier der Verlauf."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label ? (
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {label}
        </p>
      ) : null}
      <div className="flex h-40 items-end gap-1.5">
        {points.map((p) => {
          const pct = Math.max((p.value / max) * 100, 2);
          const month = p.month.slice(5, 7);
          return (
            <div
              key={p.month}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all",
                    color,
                  )}
                  style={{ height: `${pct}%`, minHeight: "2px" }}
                  title={`${p.month} - ${formatCHF(p.value)}`}
                />
              </div>
              <span className="text-[10px] tabular-nums text-neutral-400">
                {month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
