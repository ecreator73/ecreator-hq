import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, cn } from "@/lib/utils";
import type { ProductionCalendarEvent } from "@/types/entities";

const TYPE_DOT: Record<ProductionCalendarEvent["type"], string> = {
  shoot: "bg-amber-500",
  launch: "bg-green-500",
  go_live: "bg-brand-500",
  milestone: "bg-red-500",
  reporting: "bg-blue-500",
};

const TYPE_LABEL: Record<ProductionCalendarEvent["type"], string> = {
  shoot: "Shooting",
  launch: "Launch",
  go_live: "Go-Live",
  milestone: "Meilenstein",
  reporting: "Reporting-Call",
};

/**
 * Praesentationaler Produktions-Kalender: Events nach Datum gruppiert
 * (aufsteigend), pro Tag eine Ueberschrift, je Event ein farbiger Punkt
 * (nach Typ), Titel als Link und Kundenname in Grau.
 */
export function ProductionCalendar({
  events,
}: {
  events: ProductionCalendarEvent[];
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Keine Termine"
        description="Fuer den gewaehlten Zeitraum sind keine Produktions-Termine vorhanden."
      />
    );
  }

  const groups = new Map<string, ProductionCalendarEvent[]>();
  for (const event of events) {
    const list = groups.get(event.date);
    if (list) list.push(event);
    else groups.set(event.date, [event]);
  }
  const days = Array.from(groups.keys()).sort();

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <div key={day} className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-800">
            {formatDate(day)}
          </h3>
          <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {(groups.get(day) ?? []).map((event) => (
              <li key={event.id}>
                <Link
                  href={event.href}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-neutral-50"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      TYPE_DOT[event.type],
                    )}
                  />
                  <span className="flex-1 text-sm font-medium text-neutral-900">
                    {event.title}
                  </span>
                  {event.clientName ? (
                    <span className="shrink-0 text-xs text-neutral-500">
                      {event.clientName}
                    </span>
                  ) : null}
                  <span className="shrink-0 text-xs text-neutral-400">
                    {TYPE_LABEL[event.type]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
