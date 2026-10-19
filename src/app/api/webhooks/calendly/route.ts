import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySignature } from "@/server/marketing/signature";
import { processCalendlyWebhook, type CalendlyWebhook } from "@/server/marketing/bookings";
import { getCredentials, touchWebhook, type CalendlyCredentials } from "@/server/marketing/integrations";
import { logMarketingActivity } from "@/server/marketing/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Calendly-Webhook (invitee.created, invitee.canceled).
 *
 * Signatur: Header «Calendly-Webhook-Signature: t=…,v1=…» (HMAC-SHA256 ueber
 * "t.body" mit dem Signing Key, den eCreator OS beim Registrieren des Webhooks
 * erzeugt und verschluesselt speichert; alternativ CALENDLY_WEBHOOK_SIGNING_KEY).
 *
 * Calendly wiederholt bei Fehlern - die Verarbeitung ist idempotent
 * (eindeutig per Invitee-URI), doppelte Zustellungen erzeugen nichts doppelt.
 */

const MAX_BYTES = 256_000;
let lastRejectLog = 0;

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ ok: false }, { status: 413 });

  const db = createAdminClient();
  const creds = await getCredentials<CalendlyCredentials>("calendly", db);
  const signingKey = creds?.signing_key || process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const check = verifySignature(req.headers.get("calendly-webhook-signature"), raw, signingKey);
  if (!check.ok) {
    if (Date.now() - lastRejectLog > 60_000) {
      lastRejectLog = Date.now();
      await logMarketingActivity(db, {
        type: "webhook_rejected",
        severity: "warning",
        source: "calendly",
        title: "Calendly-Webhook abgewiesen (Signatur)",
        detail: `Grund: ${check.reason}`,
      });
    }
    return NextResponse.json({ ok: false, error: "signature" }, { status: 401 });
  }

  let body: CalendlyWebhook;
  try {
    body = JSON.parse(raw) as CalendlyWebhook;
  } catch {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }

  try {
    const result = await processCalendlyWebhook(db, body);
    await touchWebhook("calendly", db);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 300) : "Fehler";
    console.error("calendly_webhook_failed", { event: body.event, reason: msg });
    await logMarketingActivity(db, {
      type: "integration_error",
      severity: "error",
      source: "calendly",
      title: "Calendly-Ereignis konnte nicht verarbeitet werden",
      detail: `${body.event ?? "?"}: ${msg}`,
    });
    // 500 -> Calendly stellt erneut zu.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
