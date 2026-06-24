import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import {
  ALERT_CATEGORY_LABELS,
  ALERT_SEVERITY_LABELS,
  alertSeverityColor,
} from "@/config/catalog";
import { cn } from "@/lib/utils";
import type { ComputedAlert } from "@/types/entities";

export function AlertList({ alerts }: { alerts: ComputedAlert[] }) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        title="Keine kritischen Punkte"
        description="Aktuell gibt es keine offenen Risiken oder Warnungen."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert, i) => {
        const severityLabel =
          ALERT_SEVERITY_LABELS[
            alert.severity as keyof typeof ALERT_SEVERITY_LABELS
          ] ?? alert.severity;
        const categoryLabel =
          ALERT_CATEGORY_LABELS[
            alert.category as keyof typeof ALERT_CATEGORY_LABELS
          ] ?? alert.category;

        const inner = (
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm",
              alert.href ? "transition-colors hover:border-brand-300" : null,
            )}
          >
            <StatusBadge
              label={severityLabel}
              color={alertSeverityColor(alert.severity)}
            />
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-400">
              {categoryLabel}
            </span>
            <span className="min-w-0 flex-1 truncate text-neutral-800">
              {alert.title}
            </span>
          </div>
        );

        return (
          <li key={`${alert.category}-${i}`}>
            {alert.href ? (
              <Link href={alert.href} className="block">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
