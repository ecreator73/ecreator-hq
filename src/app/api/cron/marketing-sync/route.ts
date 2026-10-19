import { NextResponse } from "next/server";
import { runAllSyncs } from "@/server/marketing/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Taeglicher Marketing-Abgleich (Vercel Cron, siehe vercel.json):
 * GA4, Google Ads, Search Console, Meta Ads. Nicht verbundene Quellen werden
 * uebersprungen. Nur mit CRON_SECRET aufrufbar.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET fehlt" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const results = await runAllSyncs("cron");
  return NextResponse.json({ ok: results.every((r) => r.status !== "error"), results });
}
