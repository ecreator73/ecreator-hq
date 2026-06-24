"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ClapperboardIcon, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { formatCHF, formatDate } from "@/lib/utils";
import { SHOOT_ASSIGNMENT_STATUSES, statusLabel } from "@/config/catalog";
import type { ShootAssignmentWithRelations } from "@/types/entities";
import {
  deleteAssignmentAction,
  setAssignmentStatusAction,
} from "@/app/(app)/production/creators/actions";

function statusColor(key: string): string | undefined {
  return SHOOT_ASSIGNMENT_STATUSES.find((s) => s.key === key)?.color;
}

function creatorName(a: ShootAssignmentWithRelations): string {
  if (!a.creator) return "Unbekannter Creator";
  return [a.creator.first_name, a.creator.last_name].filter(Boolean).join(" ");
}

/**
 * Besetzungen (Shoot-Assignments). Auf der Creator-Detailseite (mode="creator")
 * zeigt jede Zeile den Shoot, auf der Shoot-Detailseite den Creator. Status
 * laesst sich auf Bestaetigt/Abgelehnt/Durchgefuehrt setzen; Eintraege loeschbar.
 */
export function AssignmentsPanel({
  assignments,
  mode = "creator",
}: {
  assignments: ShootAssignmentWithRelations[];
  mode?: "creator" | "shoot";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function setStatus(id: string, status: string) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const res = await setAssignmentStatusAction(id, status);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const res = await deleteAssignmentAction(id);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={ClapperboardIcon}
        title={
          mode === "creator" ? "Keine Besetzungen" : "Noch niemand besetzt"
        }
        description={
          mode === "creator"
            ? "Dieser Creator wurde noch keinem Shooting zugeordnet."
            : "Fuer dieses Shooting wurde noch kein Creator angefragt."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="space-y-3">
        {assignments.map((a) => {
          const isBusy = pending && busyId === a.id;
          return (
            <li
              key={a.id}
              className="rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {mode === "creator"
                      ? (a.shoot?.title ?? "Unbenanntes Shooting")
                      : creatorName(a)}
                  </p>
                  {mode === "creator" && a.shoot?.shooting_date ? (
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {formatDate(a.shoot.shooting_date)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {a.agreed_rate != null ? (
                    <span className="text-sm font-medium text-neutral-700">
                      {formatCHF(a.agreed_rate)}
                    </span>
                  ) : null}
                  <StatusBadge
                    label={statusLabel("shoot_assignment", a.status)}
                    color={statusColor(a.status)}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatus(a.id, "confirmed")}
                  disabled={isBusy || a.status === "confirmed"}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 text-xs font-medium text-green-700 shadow-sm transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  Bestaetigt
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(a.id, "rejected")}
                  disabled={isBusy || a.status === "rejected"}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-700 shadow-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Abgelehnt
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(a.id, "done")}
                  disabled={isBusy || a.status === "done"}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 text-xs font-medium text-brand-700 shadow-sm transition-colors hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  Durchgefuehrt
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  disabled={isBusy}
                  className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-500 shadow-sm transition-colors hover:bg-neutral-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Loeschen
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
