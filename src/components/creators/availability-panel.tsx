"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import {
  AVAILABILITY_TYPES,
  AVAILABILITY_TYPE_LABELS,
} from "@/config/catalog";
import type { CreatorAvailability } from "@/types/entities";
import {
  createAvailabilityAction,
  deleteAvailabilityAction,
} from "@/app/(app)/production/creators/actions";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const TYPE_TONE: Record<string, "green" | "amber" | "red" | "neutral"> = {
  available: "green",
  limited: "amber",
  unavailable: "red",
};

/**
 * Verfuegbarkeitsfenster eines Creators: Liste (Zeitraum + Typ-Badge, loeschbar)
 * plus Inline-Formular fuer neue Eintraege. Mutationen via Server-Actions,
 * danach router.refresh().
 */
export function AvailabilityPanel({
  creatorId,
  items,
}: {
  creatorId: string;
  items: CreatorAvailability[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<string>(AVAILABILITY_TYPES[0].key);

  function add() {
    if (!startDate) {
      setError("Startdatum ist erforderlich.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createAvailabilityAction({
        creator_id: creatorId,
        start_date: startDate,
        end_date: endDate || undefined,
        availability_type: type as "available" | "limited" | "unavailable",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStartDate("");
      setEndDate("");
      setType(AVAILABILITY_TYPES[0].key);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteAvailabilityAction(id, creatorId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Keine Verfuegbarkeiten erfasst"
          description="Trage unten Zeitraeume ein, in denen dieser Creator verfuegbar oder eingeschraenkt ist."
        />
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <CalendarRange className="h-4 w-4 shrink-0 text-neutral-400" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {formatDate(item.start_date)}
                    {item.end_date ? ` – ${formatDate(item.end_date)}` : ""}
                  </p>
                  {item.note ? (
                    <p className="mt-0.5 text-xs text-neutral-500">{item.note}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={TYPE_TONE[item.availability_type] ?? "neutral"}>
                  {AVAILABILITY_TYPE_LABELS[
                    item.availability_type as keyof typeof AVAILABILITY_TYPE_LABELS
                  ] ?? item.availability_type}
                </Badge>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={pending}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label="Verfuegbarkeit loeschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
        <p className="mb-3 text-sm font-medium text-neutral-700">
          Neuer Zeitraum
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              Von <span className="text-red-500">*</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              Bis
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              Typ
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              {AVAILABILITY_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : null}
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={add} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Hinzufuegen
          </Button>
        </div>
      </div>
    </div>
  );
}
