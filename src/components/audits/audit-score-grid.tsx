import {
  AUDIT_CATEGORIES,
  auditScoreLevel,
} from "@/config/catalog";
import { StatusBadge } from "@/components/tasks/status-badge";
import type { WebsiteAuditWithRelations } from "@/types/entities";
import { cn } from "@/lib/utils";

/** Balkenfarbe je nach Score-Hoehe (hoch = gut). */
function barColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 60) return "bg-brand-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Praesentationale Score-Uebersicht: grosses Gesamt-Badge + 8 Kategorie-Karten
 * (Label, Score/100 und farbiger Fortschrittsbalken) gemaess AUDIT_CATEGORIES.
 */
export function AuditScoreGrid({
  audit,
}: {
  audit: WebsiteAuditWithRelations;
}) {
  const overall = clampScore(audit.overall_score);
  const level = auditScoreLevel(audit.overall_score);
  const record = audit as unknown as Record<string, number>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Gesamtbewertung
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight text-neutral-900">
              {overall}
            </span>
            <span className="text-sm text-neutral-400">/ 100</span>
          </div>
        </div>
        <StatusBadge label={level.label} color={level.tone} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {AUDIT_CATEGORIES.map((category) => {
          const score = clampScore(record[`${category.key}_score`]);
          return (
            <div
              key={category.key}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-neutral-700">
                  {category.label}
                </span>
                <span className="text-sm font-semibold tabular-nums text-neutral-900">
                  {score}
                  <span className="text-xs font-normal text-neutral-400">
                    /100
                  </span>
                </span>
              </div>
              <div
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${category.label}: ${score} von 100`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    barColor(score),
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
