import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcs } from "@/lib/ics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Einzelnen Termin als .ics herunterladen (Outlook, Apple Kalender).
 * Nur fuer angemeldete Benutzer - die Route liegt bewusst NICHT unter den
 * oeffentlichen Pfaden des Feeds.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const meetingId = id.replace(/\.ics$/i, "");

  const { data } = await createAdminClient()
    .from("meetings")
    .select("id, title, meeting_date, duration_minutes, status, notes")
    .eq("id", meetingId)
    .maybeSingle();

  if (!data?.meeting_date) {
    return new NextResponse("Termin nicht gefunden", { status: 404 });
  }

  const m = data as {
    id: string;
    title: string | null;
    meeting_date: string;
    duration_minutes: number | null;
    status: string | null;
    notes: string | null;
  };

  const ics = buildIcs(
    [
      {
        uid: `meeting-${m.id}`,
        start: new Date(m.meeting_date),
        durationMinutes: m.duration_minutes ?? 60,
        title: m.title ?? "Termin",
        description: m.notes,
        cancelled: m.status === "cancelled",
      },
    ],
    { calendarName: "eCreator CRM - Termin" },
  );

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="termin-${meetingId.slice(0, 8)}.ics"`,
    },
  });
}
