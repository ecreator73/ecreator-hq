"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { AlertQuickCreate } from "@/components/executive/alert-quick-create";
import {
  ALERT_CATEGORY_LABELS,
  ALERT_SEVERITY_LABELS,
  alertSeverityColor,
} from "@/config/catalog";
import {
  resolveExecutiveAlertAction,
  deleteExecutiveAlertAction,
} from "@/app/(app)/executive/actions";
import type { ExecutiveAlert } from "@/types/entities";

export function StoredAlerts({ alerts }: { alerts: ExecutiveAlert[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Manuelle Alerts</CardTitle>
        <AlertQuickCreate />
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState
            title="Keine Alerts"
            description="Erfasse einen manuellen Alert, um auf Risiken hinzuweisen."
          />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert }: { alert: ExecutiveAlert }) {
  const [error, setError] = useState<string | null>(null);
  const [resolving, startResolve] = useTransition();
  const [removing, startRemove] = useTransition();
  const router = useRouter();

  const severityKey = alert.severity ?? "info";
  const categoryLabel = alert.category
    ? ALERT_CATEGORY_LABELS[alert.category as keyof typeof ALERT_CATEGORY_LABELS] ??
      alert.category
    : null;

  function resolve() {
    setError(null);
    startResolve(async () => {
      const result = await resolveExecutiveAlertAction(alert.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function remove() {
    setError(null);
    startRemove(async () => {
      const result = await deleteExecutiveAlertAction(alert.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <li className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={
              ALERT_SEVERITY_LABELS[
                severityKey as keyof typeof ALERT_SEVERITY_LABELS
              ] ?? severityKey
            }
            color={alertSeverityColor(severityKey)}
          />
          {categoryLabel ? (
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              {categoryLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-sm font-medium text-neutral-900">{alert.title}</p>
        {alert.description ? (
          <p className="mt-0.5 text-sm text-neutral-500">{alert.description}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={resolve}
          disabled={resolving || removing}
        >
          {resolving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Erledigt
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={remove}
          disabled={resolving || removing}
          aria-label="Loeschen"
        >
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </li>
  );
}
