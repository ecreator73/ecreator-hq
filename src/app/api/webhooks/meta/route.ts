import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getMetaEnv } from "@/config/meta";
import { metaService } from "@/server/integrations/meta/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Webhook-Verifizierung (Meta ruft GET mit hub.challenge). */
export async function GET(req: Request) {
  const env = getMetaEnv();
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (env && mode === "subscribe" && token === env.verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function signatureValid(body: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Eingehende Leadgen-Events. Signatur pruefen, dann je Lead verarbeiten. */
export async function POST(req: Request) {
  const env = getMetaEnv();
  if (!env) return new NextResponse("Not configured", { status: 503 });

  const raw = await req.text();
  const valid = signatureValid(raw, req.headers.get("x-hub-signature-256"), env.appSecret);
  if (!valid) {
    // Ungueltige Signatur -> ablehnen (kein Verarbeiten, kein Datenleck).
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: { object?: string; entry?: Array<{ id?: string; changes?: Array<{ field?: string; value?: Record<string, unknown> }> }> };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Schnell antworten: Events sequentiell verarbeiten (i. d. R. wenige pro Call).
  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue;
        const v = (change.value ?? {}) as Record<string, string>;
        await metaService.processLeadgen({
          leadgenId: String(v.leadgen_id ?? ""),
          formId: v.form_id ?? null,
          pageId: v.page_id ?? entry.id ?? null,
          signatureValid: true,
          payload: v,
        });
      }
    }
  } catch {
    // bewusst: 200 zurueck (Event ist geloggt), Backfill via "Leads synchronisieren".
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
