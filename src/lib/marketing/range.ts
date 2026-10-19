/**
 * Zeitraeume des Marketing-Dashboards, immer in Europe/Zurich.
 * Ein Tag = 00:00 bis 24:00 Zuercher Zeit (Sommer-/Winterzeit korrekt).
 */

export const TZ = "Europe/Zurich";

export const RANGE_PRESETS = [
  { key: "today", label: "Heute" },
  { key: "yesterday", label: "Gestern" },
  { key: "7d", label: "7 Tage" },
  { key: "30d", label: "30 Tage" },
  { key: "90d", label: "90 Tage" },
  { key: "this_month", label: "Dieser Monat" },
  { key: "last_month", label: "Letzter Monat" },
  { key: "custom", label: "Eigener Zeitraum" },
] as const;
export type RangeKey = (typeof RANGE_PRESETS)[number]["key"];

export const COMPARE_OPTIONS = [
  { key: "prev", label: "Vorperiode" },
  { key: "yoy", label: "Vorjahr" },
  { key: "none", label: "Kein Vergleich" },
] as const;
export type CompareKey = (typeof COMPARE_OPTIONS)[number]["key"];

export interface DayRange {
  from: string; // YYYY-MM-DD (inklusive)
  to: string; // YYYY-MM-DD (inklusive)
}
export interface ResolvedRange extends DayRange {
  key: RangeKey;
  label: string;
  days: number;
  compareKey: CompareKey;
  compare: DayRange | null;
}

const DAY = 86_400_000;

/** Heutiges Datum in Zuerich als YYYY-MM-DD. */
export function zurichToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Datum (UTC-Zeitpunkt) -> Zuercher Kalendertag. */
export function zurichDay(iso: string | Date): string {
  return zurichToday(typeof iso === "string" ? new Date(iso) : iso);
}

function offsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** 00:00 Zuercher Zeit des Tages als UTC-ISO-String. */
export function zurichStartIso(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  return new Date(guess.getTime() - offsetMinutes(guess) * 60_000).toISOString();
}

export function addDaysStr(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) + n * DAY).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY) + 1;
}

/** Halb-offenes UTC-Intervall [start, end) fuer Abfragen auf timestamptz. */
export function utcBounds(r: DayRange): { start: string; end: string } {
  return { start: zurichStartIso(r.from), end: zurichStartIso(addDaysStr(r.to, 1)) };
}

export function listDays(r: DayRange): string[] {
  const out: string[] = [];
  for (let d = r.from; d <= r.to; d = addDaysStr(d, 1)) out.push(d);
  return out;
}

const isDay = (v: string | undefined | null): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));

function shiftYear(day: string, years: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const last = new Date(Date.UTC(y + years, m, 0)).getUTCDate();
  return `${y + years}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export function resolveRange(params: { range?: string; from?: string; to?: string; compare?: string }, now = new Date()): ResolvedRange {
  const today = zurichToday(now);
  const key = (RANGE_PRESETS.some((p) => p.key === params.range) ? params.range : "30d") as RangeKey;
  let from = today;
  let to = today;
  switch (key) {
    case "today":
      break;
    case "yesterday":
      from = to = addDaysStr(today, -1);
      break;
    case "7d":
      from = addDaysStr(today, -6);
      break;
    case "30d":
      from = addDaysStr(today, -29);
      break;
    case "90d":
      from = addDaysStr(today, -89);
      break;
    case "this_month":
      from = `${today.slice(0, 7)}-01`;
      break;
    case "last_month": {
      const first = `${today.slice(0, 7)}-01`;
      to = addDaysStr(first, -1);
      from = `${to.slice(0, 7)}-01`;
      break;
    }
    case "custom":
      if (isDay(params.from) && isDay(params.to) && params.from <= params.to) {
        from = params.from;
        to = params.to > today ? today : params.to;
        if (daysBetween(from, to) > 731) from = addDaysStr(to, -730);
      } else {
        from = addDaysStr(today, -29);
      }
      break;
  }
  const days = daysBetween(from, to);
  const compareKey = (COMPARE_OPTIONS.some((c) => c.key === params.compare) ? params.compare : "prev") as CompareKey;
  let compare: DayRange | null = null;
  if (compareKey === "prev") compare = { from: addDaysStr(from, -days), to: addDaysStr(from, -1) };
  if (compareKey === "yoy") compare = { from: shiftYear(from, -1), to: shiftYear(to, -1) };

  const label = key === "custom" ? `${formatDay(from)} – ${formatDay(to)}` : RANGE_PRESETS.find((p) => p.key === key)!.label;
  return { key, label, from, to, days, compareKey, compare };
}

/** TT.MM.JJJJ */
export function formatDay(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}.${m}.${y}`;
}

/** Zeitpunkt in Zuercher Zeit: TT.MM.JJJJ HH:MM */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("de-CH", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** «vor 15 Min.», «vor 3 Std.», «vor 2 Tagen» */
export function formatAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "nie";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(diff / 60_000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? "vor 1 Tag" : `vor ${d} Tagen`;
}

/** Wochenbeginn (Montag) eines Tages. */
export function weekStart(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDaysStr(day, -dow);
}

/** Query-String fuer Links, die den Zeitraum beibehalten. */
export function rangeQuery(r: ResolvedRange, extra: Record<string, string | undefined> = {}): string {
  const q = new URLSearchParams();
  q.set("range", r.key);
  if (r.key === "custom") {
    q.set("from", r.from);
    q.set("to", r.to);
  }
  if (r.compareKey !== "prev") q.set("compare", r.compareKey);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  return q.toString();
}
