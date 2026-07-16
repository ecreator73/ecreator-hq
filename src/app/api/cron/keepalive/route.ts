import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Taeglicher Wachhalter (Vercel Cron, siehe vercel.json): ein Mini-Read
 * erzeugt API-Aktivitaet, damit Supabase (Free-Plan) das Projekt nicht nach
 * 7 Tagen Inaktivitaet pausiert (Vorfall vom 15.07.2026).
 */
export async function GET(req: Request) {
  // Vercel sendet bei Cron-Aufrufen "Authorization: Bearer <CRON_SECRET>",
  // sofern die Env-Variable gesetzt ist. Ohne CRON_SECRET bleibt der
  // Endpoint offen, gibt aber nichts Sensibles preis.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const db = createAdminClient();
    const { error } = await db.from("statuses").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 },
    );
  }
}
