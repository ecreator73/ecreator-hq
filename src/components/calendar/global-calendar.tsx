"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  GlobalCalendarEvent,
  CalendarCategory,
} from "@/server/services/calendar.service";

type View = "month" | "week" | "day";

const CATEGORIES: {
  key: CalendarCategory;
  label: string;
  dot: string;
  chip: string;
}[] = [
  { key: "meeting", label: "Meetings", dot: "bg-blue-500", chip: "border-blue-200 bg-blue-50 text-blue-700" },
  { key: "followup", label: "Follow-ups", dot: "bg-violet-500", chip: "border-violet-200 bg-violet-50 text-violet-700" },
  { key: "reporting", label: "Reporting-Calls", dot: "bg-cyan-500", chip: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  { key: "task", label: "Aufgaben", dot: "bg-amber-500", chip: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "deadline", label: "Deadlines", dot: "bg-red-500", chip: "border-red-200 bg-red-50 text-red-700" },
  { key: "shoot", label: "Shootings", dot: "bg-orange-500", chip: "border-orange-200 bg-orange-50 text-orange-700" },
  { key: "launch", label: "Launches", dot: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { key: "contract", label: "Vertraege", dot: "bg-brand-500", chip: "border-brand-200 bg-brand-50 text-brand-700" },
];
const DOT: Record<CalendarCategory, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.dot]),
) as Record<CalendarCategory, string>;

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function parse(d: string): Date {
  return new Date(`${d}T00:00:00`);
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Montag der Woche von d. */
function monday(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Mo=0
  x.setDate(x.getDate() - dow);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function GlobalCalendar({
  view,
  anchor,
  events,
  todayIso,
  prevHref,
  nextHref,
  todayHref,
}: {
  view: View;
  anchor: string; // YYYY-MM-DD
  events: GlobalCalendarEvent[];
  todayIso: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
}) {
  const viewHref = (v: View) => `/calendar?view=${v}&date=${anchor}`;
  const [active, setActive] = useState<Set<CalendarCategory>>(
    new Set(CATEGORIES.map((c) => c.key)),
  );

  const visible = useMemo(
    () => events.filter((e) => active.has(e.category)),
    [events, active],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, GlobalCalendarEvent[]>();
    for (const e of visible) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [visible]);

  const anchorDate = parse(anchor);
  const label =
    view === "day"
      ? new Intl.DateTimeFormat("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(anchorDate)
      : view === "week"
        ? (() => {
            const start = monday(anchorDate);
            const end = addDays(start, 6);
            return `${new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short" }).format(start)} – ${new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short", year: "numeric" }).format(end)}`;
          })()
        : new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric" }).format(anchorDate);

  function toggle(key: CalendarCategory) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Steuerleiste */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Link href={prevHref} aria-label="Zurueck" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm hover:bg-neutral-50">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href={nextHref} aria-label="Weiter" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm hover:bg-neutral-50">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <Link href={todayHref} className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50">
            Heute
          </Link>
          <span className="ml-1 text-base font-semibold capitalize text-neutral-900">{label}</span>
        </div>
        <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 shadow-sm">
          {(["day", "week", "month"] as View[]).map((v) => (
            <Link
              key={v}
              href={viewHref(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === v ? "bg-brand-600 text-white" : "text-neutral-600 hover:bg-neutral-100",
              )}
            >
              {v === "day" ? "Tag" : v === "week" ? "Woche" : "Monat"}
            </Link>
          ))}
        </div>
      </div>

      {/* Kategorie-Filter */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const on = active.has(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggle(c.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                on ? c.chip : "border-neutral-200 bg-white text-neutral-400",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", on ? c.dot : "bg-neutral-300")} />
              {c.label}
            </button>
          );
        })}
      </div>

      {view === "month" ? (
        <MonthGrid anchor={anchorDate} byDay={byDay} todayIso={todayIso} />
      ) : view === "week" ? (
        <DayList days={Array.from({ length: 7 }, (_, i) => iso(addDays(monday(anchorDate), i)))} byDay={byDay} todayIso={todayIso} />
      ) : (
        <DayList days={[anchor]} byDay={byDay} todayIso={todayIso} />
      )}
    </div>
  );
}

function MonthGrid({
  anchor,
  byDay,
  todayIso,
}: {
  anchor: Date;
  byDay: Map<string, GlobalCalendarEvent[]>;
  todayIso: string;
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = monday(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const month = anchor.getMonth();

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-center text-xs font-medium uppercase tracking-wide text-neutral-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const key = iso(d);
          const list = byDay.get(key) ?? [];
          const inMonth = d.getMonth() === month;
          const isToday = key === todayIso;
          return (
            <div
              key={key}
              className={cn(
                "min-h-[6.5rem] border-b border-r border-neutral-100 p-1.5",
                i % 7 === 6 && "border-r-0",
                !inMonth && "bg-neutral-50/50",
              )}
            >
              <div className="mb-1 flex justify-end">
                <span className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday ? "bg-brand-600 font-semibold text-white" : inMonth ? "text-neutral-700" : "text-neutral-300",
                )}>
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {list.slice(0, 3).map((e) => (
                  <Link key={e.id} href={e.href} title={e.title} className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight text-neutral-700 hover:bg-neutral-100">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[e.category])} />
                    <span className="truncate">{e.title}</span>
                  </Link>
                ))}
                {list.length > 3 ? (
                  <span className="px-1 text-[11px] text-neutral-400">+{list.length - 3} mehr</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayList({
  days,
  byDay,
  todayIso,
}: {
  days: string[];
  byDay: Map<string, GlobalCalendarEvent[]>;
  todayIso: string;
}) {
  const hasAny = days.some((d) => (byDay.get(d) ?? []).length > 0);
  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center">
        <CalendarDays className="mb-2 h-6 w-6 text-neutral-300" />
        <p className="text-sm text-neutral-500">Keine Termine in diesem Zeitraum.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {days.map((d) => {
        const list = byDay.get(d) ?? [];
        const isToday = d === todayIso;
        return (
          <div key={d}>
            <h3 className={cn("mb-2 text-sm font-semibold capitalize", isToday ? "text-brand-700" : "text-neutral-800")}>
              {new Intl.DateTimeFormat("de-CH", { weekday: "long", day: "2-digit", month: "long" }).format(parse(d))}
              {isToday ? " · Heute" : ""}
            </h3>
            {list.length === 0 ? (
              <p className="rounded-lg border border-neutral-100 bg-white px-4 py-3 text-sm text-neutral-400">Keine Termine.</p>
            ) : (
              <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
                {list.map((e) => (
                  <li key={e.id}>
                    <Link href={e.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT[e.category])} />
                      <span className="flex-1 text-sm font-medium text-neutral-900">{e.title}</span>
                      {e.subtitle ? <span className="shrink-0 text-xs text-neutral-500">{e.subtitle}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
