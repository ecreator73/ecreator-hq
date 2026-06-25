import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { GlobalCalendar } from "@/components/calendar/global-calendar";
import { calendarService } from "@/server/services";
import type { GlobalCalendarEvent } from "@/server/services";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Kalender" };

type View = "month" | "week" | "day";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function parse(s: string | undefined): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  return new Date();
}
function monday(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const view: View =
    sp.view === "week" || sp.view === "day" ? sp.view : "month";
  const anchorDate = parse(sp.date);
  const anchor = iso(anchorDate);
  const todayIso = iso(new Date());

  // Sichtbarer Bereich -> Datenfenster
  let from: string;
  let to: string;
  let prev: Date;
  let next: Date;
  if (view === "day") {
    from = anchor;
    to = anchor;
    prev = addDays(anchorDate, -1);
    next = addDays(anchorDate, 1);
  } else if (view === "week") {
    const start = monday(anchorDate);
    from = iso(start);
    to = iso(addDays(start, 6));
    prev = addDays(start, -7);
    next = addDays(start, 7);
  } else {
    const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const gridStart = monday(first);
    from = iso(gridStart);
    to = iso(addDays(gridStart, 41));
    prev = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1);
    next = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1);
  }

  let events: GlobalCalendarEvent[] = [];
  try {
    events = await calendarService.events(from, to);
  } catch {
    events = [];
  }

  const link = (v: View, d: string) => `/calendar?view=${v}&date=${d}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Home"
        title="Kalender"
        description="Alle Termine an einem Ort: Meetings, Follow-ups, Reporting-Calls, Aufgaben, Projekt-Deadlines, Shootings, Launches und Vertragsablaeufe."
      />
      <GlobalCalendar
        view={view}
        anchor={anchor}
        events={events}
        todayIso={todayIso}
        prevHref={link(view, iso(prev))}
        nextHref={link(view, iso(next))}
        todayHref={link(view, todayIso)}
      />
    </div>
  );
}
