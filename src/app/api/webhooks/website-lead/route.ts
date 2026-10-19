import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySignature } from "@/server/marketing/signature";
import { ingestWebsiteLead, websiteLeadSchema } from "@/server/marketing/website-lead";
import { logMarketingActivity } from "@/server/marketing/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lead-Eingang der Website (www.ecreator.ch).
 *
 * POST /api/webhooks/website-lead
 *   Header  X-Ecreator-Signature: t=<unix>,v1=<hex HMAC-SHA256 ueber "t.body">
 *   Secret  WEBSITE_LEAD_SECRET (identisch in Vercel «ecreator-website» und «ecreator-hq»)
 *
 * Antworten: 200 verarbeitet/Dublette, 400 ungueltig, 401 Signatur, 413 zu gross,
 * 503 nicht konfiguriert, 500 Fehler (die Website wiederholt dann).
 * Fehler werden ohne Personendaten protokolliert.
 */

const MAX_BYTES = 64_000;
let lastRejectLog = 0;

export async function POST(req: Request) {
  const secret = process.env.WEBSITE_LEAD_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });

  const check = verifySignature(req.headers.get("x-ecreator-signature"), raw, secret);
  if (!check.ok) {
    // Hoechstens ein Eintrag pro Minute, damit Fremdaufrufe das Protokoll nicht fluten.
    if (Date.now() - lastRejectLog > 60_000) {
      lastRejectLog = Date.now();
      try {
        await logMarketingActivity(createAdminClient(), {
          type: "webhook_rejected",
          severity: "warning",
          source: "website",
          title: "Website-Lead abgewiesen (Signatur)",
          detail: `Grund: ${check.reason}`,
        });
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json({ ok: false, error: "signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }
  const parsed = websiteLeadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid", fields: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  }

  const db = createAdminClient();
  try {
    const result = await ingestWebsiteLead(db, parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 300) : "Fehler";
    console.error("website_lead_ingest_failed", { type: parsed.data.lead_type, reason: msg });
    await logMarketingActivity(db, {
      type: "integration_error",
      severity: "error",
      source: "website",
      title: "Website-Lead konnte nicht gespeichert werden",
      detail: `${parsed.data.lead_type}: ${msg}`,
    });
    return NextResponse.json({ ok: false, error: "ingest" }, { status: 500 });
  }
}
