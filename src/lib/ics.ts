/**
 * iCalendar-Erzeugung (RFC 5545) fuer den CRM-Kalenderfeed und Einzeltermine.
 * Bewusst ohne Bibliothek - der benoetigte Umfang ist klein und stabil.
 */

export interface IcsEvent {
  /** Eindeutig und stabil (z.B. die Datensatz-ID). */
  uid: string;
  start: Date;
  /** Fehlt das Ende, wird die Dauer verwendet (Standard 60 Min). */
  end?: Date;
  durationMinutes?: number;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  /** cancelled -> im Kalender durchgestrichen/entfernt. */
  cancelled?: boolean;
}

/** 2026-08-15T09:00:00Z -> 20260815T090000Z */
function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Sonderzeichen nach RFC 5545 maskieren. */
function esc(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Zeilen auf 75 Oktette falten (Fortsetzung mit fuehrendem Leerzeichen). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

export function buildIcs(
  events: IcsEvent[],
  opts: { calendarName?: string; domain?: string } = {},
): string {
  const domain = opts.domain ?? "crm.ecreator.ch";
  const stamp = toIcsDate(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//eCreator OS//CRM//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(opts.calendarName ?? "eCreator CRM")}`,
    "X-WR-TIMEZONE:Europe/Zurich",
    // Wie oft Google/Outlook den Feed neu laden sollen
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const e of events) {
    const end =
      e.end ??
      new Date(e.start.getTime() + (e.durationMinutes ?? 60) * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${esc(e.uid)}@${domain}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsDate(e.start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${esc(e.title)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.url) lines.push(`URL:${esc(e.url)}`);
    lines.push(`STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/**
 * Link, der einen Termin direkt im Google Kalender vorausgefuellt oeffnet.
 * Braucht keine Verbindung/Anmeldung im CRM.
 */
export function googleCalendarLink(e: {
  title: string;
  start: Date;
  end?: Date;
  durationMinutes?: number;
  description?: string | null;
  location?: string | null;
}): string {
  const end =
    e.end ?? new Date(e.start.getTime() + (e.durationMinutes ?? 60) * 60 * 1000);
  const u = new URL("https://calendar.google.com/calendar/render");
  u.searchParams.set("action", "TEMPLATE");
  u.searchParams.set("text", e.title);
  u.searchParams.set("dates", `${toIcsDate(e.start)}/${toIcsDate(end)}`);
  if (e.description) u.searchParams.set("details", e.description);
  if (e.location) u.searchParams.set("location", e.location);
  u.searchParams.set("ctz", "Europe/Zurich");
  return u.toString();
}
