import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { financeService } from "@/server/services";
import type { FinanceCalendarEvent } from "@/types/entities";
import { today, isoDay, addDays } from "@/lib/dates";
import { formatCHF, formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Finance - Kalender" };

const DOT_STYLES: Record<FinanceCalendarEvent["type"], string> = {
  invoice_due: "bg-amber-500",
  contract_end: "bg-red-500",
  renewal: "bg-brand-500",
};

export default async function FinanceCalendarPage() {
  const from = today();
  const to = isoDay(addDays(new Date(), 60));

  const events: FinanceCalendarEvent[] = await financeService
    .calendar(from, to)
    .catch(() => []);

  // Nach Datum gruppieren (Service liefert bereits aufsteigend sortiert).
  const groups: { date: string; items: FinanceCalendarEvent[] }[] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.date === ev.date) {
      last.items.push(ev);
    } else {
      groups.push({ date: ev.date, items: [ev] });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-neutral-900">
          Finance-Kalender
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Faellige Rechnungen, Vertragsenden und Verlaengerungen der naechsten
          60 Tage.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="Keine Termine"
              description="Keine Termine in den naechsten 60 Tagen."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <Card key={group.date}>
              <CardHeader>
                <CardTitle>{formatDate(group.date)}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-neutral-100">
                  {group.items.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          DOT_STYLES[ev.type],
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={ev.href}
                          className="text-sm font-medium text-neutral-900 hover:text-brand-700"
                        >
                          {ev.title}
                        </Link>
                        {ev.clientName ? (
                          <p className="truncate text-xs text-neutral-400">
                            {ev.clientName}
                          </p>
                        ) : null}
                      </div>
                      {ev.amount != null ? (
                        <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-700">
                          {formatCHF(ev.amount)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
