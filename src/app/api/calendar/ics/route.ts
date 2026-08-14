import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcs, type IcsEvent } from "@/lib/ics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Abonnierbarer Kalender-Feed (iCalendar) fuer Google Kalender, Outlook & Apple.
 *
 *   https://crm.ecreator.ch/api/calendar/ics?token=<CALENDAR_FEED_TOKEN>
 *
 * Google ruft die Adresse OHNE Anmeldung ab - deshalb schuetzt ein Token den
 * Zugriff. Optional: &scope=meetings (nur Termine) oder &scope=all (Standard:
 * Termine + Follow-ups + faellige Aufgaben).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const expected = process.env.CALENDAR_FEED_TOKEN;
  if (!expected) {
    return new NextResponse("CALENDAR_FEED_TOKEN ist nicht gesetzt.", { status: 503 });
  }
  const given = url.searchParams.get("token") ?? "";
  if (given !== expected) {
    return new NextResponse("Ungueltiges Token", { status: 401 });
  }

  const scope = url.searchParams.get("scope") ?? "all";
  const db = createAdminClient();
  const events: IcsEvent[] = [];

  // Zeitfenster: 90 Tage rueckwaerts, 365 vorwaerts.
  const from = new Date();
  from.setDate(from.getDate() - 90);
  const to = new Date();
  to.setDate(to.getDate() + 365);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const fromDay = fromIso.slice(0, 10);
  const toDay = toIso.slice(0, 10);

  // --- Termine (meetings) ---
  try {
    const { data } = await db
      .from("meetings")
      .select("id, title, meeting_date, duration_minutes, status, notes, client_id, lead_id")
      .is("deleted_at", null)
      .not("meeting_date", "is", null)
      .gte("meeting_date", fromIso)
      .lte("meeting_date", toIso)
      .limit(1000);
    for (const m of (data ?? []) as Array<{
      id: string;
      title: string | null;
      meeting_date: string;
      duration_minutes: number | null;
      status: string | null;
      notes: string | null;
    }>) {
      events.push({
        uid: `meeting-${m.id}`,
        start: new Date(m.meeting_date),
        durationMinutes: m.duration_minutes ?? 60,
        title: m.title ?? "Termin",
        description: m.notes,
        cancelled: m.status === "cancelled",
      });
    }
  } catch {
    /* Termine sind der Kern - bei Fehler bleibt der Feed leer statt zu brechen */
  }

  if (scope === "all") {
    // --- Follow-ups (Leads mit naechster Aktion) als Ganztagestermin 09:00 ---
    try {
      const { data } = await db
        .from("leads")
        .select("id, company_name, contact_name, next_action_date")
        .is("deleted_at", null)
        .not("next_action_date", "is", null)
        .gte("next_action_date", fromDay)
        .lte("next_action_date", toDay)
        .limit(1000);
      for (const l of (data ?? []) as Array<{
        id: string;
        company_name: string | null;
        contact_name: string | null;
        next_action_date: string;
      }>) {
        events.push({
          uid: `followup-${l.id}`,
          start: new Date(`${l.next_action_date}T09:00:00`),
          durationMinutes: 30,
          title: `Follow-up: ${l.contact_name || l.company_name || "Lead"}`,
          description: "Follow-up aus dem eCreator CRM",
        });
      }
    } catch {
      /* optionaler Block */
    }

    // --- Faellige Aufgaben ---
    try {
      const { data } = await db
        .from("tasks")
        .select("id, title, due_date")
        .is("deleted_at", null)
        .not("due_date", "is", null)
        .gte("due_date", fromDay)
        .lte("due_date", toDay)
        .limit(1000);
      for (const t of (data ?? []) as Array<{
        id: string;
        title: string;
        due_date: string;
      }>) {
        events.push({
          uid: `task-${t.id}`,
          start: new Date(`${t.due_date}T08:00:00`),
          durationMinutes: 30,
          title: `Aufgabe: ${t.title}`,
          description: "Aufgabe aus dem eCreator CRM",
        });
      }
    } catch {
      /* optionaler Block */
    }
  }

  const ics = buildIcs(events, {
    calendarName:
      scope === "meetings" ? "eCreator CRM - Termine" : "eCreator CRM",
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ecreator-crm.ics"',
      "Cache-Control": "public, max-age=900",
    },
  });
}
