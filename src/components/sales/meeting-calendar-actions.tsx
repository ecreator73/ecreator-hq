import { CalendarPlus, Download } from "lucide-react";
import { googleCalendarLink } from "@/lib/ics";

/**
 * Direktaktionen je Termin: in Google Kalender eintragen oder als
 * .ics-Datei herunterladen (Outlook/Apple). Ohne Anmeldung nutzbar.
 */
export function MeetingCalendarActions({
  id,
  title,
  date,
  durationMinutes,
  notes,
}: {
  id: string;
  title: string;
  date: string;
  durationMinutes?: number | null;
  notes?: string | null;
}) {
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) return null;

  const gLink = googleCalendarLink({
    title,
    start,
    durationMinutes: durationMinutes ?? 60,
    description: notes,
  });

  const BTN =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-300 hover:text-brand-700";

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={gLink}
        target="_blank"
        rel="noreferrer"
        className={BTN}
        title="Termin in Google Kalender eintragen"
      >
        <CalendarPlus className="h-3.5 w-3.5" /> Google
      </a>
      <a
        href={`/api/calendar/event/${id}.ics`}
        className={BTN}
        title="Als Kalenderdatei herunterladen (Outlook, Apple)"
      >
        <Download className="h-3.5 w-3.5" /> .ics
      </a>
    </div>
  );
}
