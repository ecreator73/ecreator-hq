import { CalendarDays, User } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { CompanyGoal } from "@/types/entities";

/** Zahl mit Schweizer Tausendertrennung (ohne Waehrung). */
function formatNumber(n: number): string {
  return new Intl.NumberFormat("de-CH").format(n);
}

/** Praesentationaler Fortschritts-Block fuer ein Firmenziel. */
export function GoalProgress({ goal }: { goal: CompanyGoal }) {
  const hasTarget = goal.target_value != null && goal.target_value > 0;
  const pct = hasTarget
    ? Math.min(100, Math.round((goal.current_value / (goal.target_value as number)) * 100))
    : null;
  const unit = goal.unit ? ` ${goal.unit}` : "";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-900">{goal.title}</h3>
        {pct != null ? (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900">
            {pct}%
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-sm text-neutral-500">
        <span className="font-medium text-neutral-700">
          {formatNumber(goal.current_value)}
          {unit}
        </span>
        {hasTarget ? (
          <>
            {" / "}
            {formatNumber(goal.target_value as number)}
            {unit}
          </>
        ) : null}
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct != null && pct >= 100 ? "bg-green-500" : "bg-brand-500",
          )}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>

      {goal.due_date || goal.owner?.full_name ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
          {goal.due_date ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(goal.due_date)}
            </span>
          ) : null}
          {goal.owner?.full_name ? (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {goal.owner.full_name}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
