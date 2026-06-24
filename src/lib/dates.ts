/** Datums-Helfer fuer die Aufgaben-Tagesansichten (serverseitig genutzt). */

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function today(): string {
  return isoDay(new Date());
}

export function tomorrow(): string {
  return isoDay(addDays(new Date(), 1));
}

/** Montag–Sonntag der Woche mit Versatz (0 = diese Woche, 1 = naechste). */
export function weekRange(offsetWeeks = 0): { from: string; to: string } {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7; // Mo=0 ... So=6
  const monday = addDays(now, -mondayOffset + offsetWeeks * 7);
  const sunday = addDays(monday, 6);
  return { from: isoDay(monday), to: isoDay(sunday) };
}
