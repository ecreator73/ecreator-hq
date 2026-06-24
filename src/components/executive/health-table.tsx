import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import type { HealthRow } from "@/types/entities";

export function HealthTable({
  rows,
  title,
}: {
  rows: HealthRow[];
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            title="Keine Eintraege"
            description="Sobald hier Daten erfasst sind, erscheint der Gesundheitsstatus."
          />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {row.name}
                  </p>
                  {row.issues.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {row.issues.map((issue, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0">
                  <StatusBadge
                    label={row.status.label}
                    color={row.status.color}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
