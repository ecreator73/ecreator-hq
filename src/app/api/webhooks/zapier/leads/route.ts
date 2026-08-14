import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { metaService } from "@/server/integrations/meta/service";
import { normalizeZapierLead } from "@/server/integrations/zapier/normalizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORG = "11111111-1111-1111-1111-111111111111";

/**
 * Eingehende Leads von Zapier (z.B. Facebook Lead Ads -> Zapier -> eCreator OS).
 *
 * POST https://crm.ecreator.ch/api/webhooks/zapier/leads?token=<ZAPIER_WEBHOOK_SECRET>
 * (alternativ Header "X-Webhook-Token").
 *
 * Der Payload darf beliebig aussehen - Felder werden tolerant zugeordnet und
 * vollstaendig in metadata_json abgelegt. Verarbeitung identisch zur direkten
 * Meta-Anbindung: Dublettenpruefung, Status "neu", Aktivitaet + Follow-up-Task.
 */

function tokenOk(req: Request, url: URL): boolean {
  const expected = process.env.ZAPIER_WEBHOOK_SECRET;
  if (!expected) return false;
  const given =
    req.headers.get("x-webhook-token") ??
    url.searchParams.get("token") ??
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return given === expected;
}

/** Kleiner Selbsttest fuer den Browser/Zapier-Verbindungstest. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!process.env.ZAPIER_WEBHOOK_SECRET) {
    return NextResponse.json(
      { ok: false, error: "ZAPIER_WEBHOOK_SECRET ist auf dem Server nicht gesetzt." },
      { status: 503 },
    );
  }
  if (!tokenOk(req, url)) {
    return NextResponse.json({ ok: false, error: "Ungueltiges Token" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    ready: true,
    hint: "Bereit. Zapier-Aktion: POST mit JSON-Body an dieselbe URL.",
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!process.env.ZAPIER_WEBHOOK_SECRET) {
    return NextResponse.json(
      { ok: false, error: "ZAPIER_WEBHOOK_SECRET ist auf dem Server nicht gesetzt." },
      { status: 503 },
    );
  }
  if (!tokenOk(req, url)) {
    return NextResponse.json({ ok: false, error: "Ungueltiges Token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Kein gueltiges JSON" }, { status: 400 });
  }

  // Zapier kann ein Objekt oder (selten) eine Liste schicken.
  const items: Array<Record<string, unknown>> = Array.isArray(body)
    ? (body as Array<Record<string, unknown>>)
    : [body as Record<string, unknown>];

  const db = createAdminClient();
  const defaultSource = url.searchParams.get("source") ?? "meta_ads";
  const results: Array<{ status: string; leadId: string | null }> = [];

  for (const item of items) {
    const { lead, empty } = normalizeZapierLead(item ?? {}, defaultSource);

    // Ereignis IMMER protokollieren (auch Fehler) - sichtbar in Settings.
    const { data: evt } = await db
      .from("ad_lead_events")
      .insert({
        org_id: ORG,
        provider: "zapier",
        signature_valid: true,
        external_id: lead.external_lead_id,
        form_id: lead.form_id,
        status: "received",
        payload: item ?? null,
      })
      .select("id")
      .single();
    const eventId = evt?.id as string | undefined;
    const finish = (status: string, leadId: string | null, error?: string) =>
      eventId
        ? db
            .from("ad_lead_events")
            .update({ status, lead_id: leadId, error: error ?? null })
            .eq("id", eventId)
        : Promise.resolve();

    if (empty) {
      await finish("skipped", null, "Weder Name noch E-Mail noch Telefon im Payload");
      results.push({ status: "skipped", leadId: null });
      continue;
    }

    try {
      // Gleiche Logik wie die direkte Meta-Anbindung (Dublette -> aktualisieren,
      // sonst anlegen + Aktivitaet + Follow-up-Task fuer morgen).
      const { id, created } = await metaService.upsertLead(db, lead);
      await finish(created ? "processed" : "duplicate", id);
      results.push({ status: created ? "processed" : "duplicate", leadId: id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler";
      await finish("error", null, msg);
      results.push({ status: "error", leadId: null });
    }
  }

  const created = results.filter((r) => r.status === "processed").length;
  const failed = results.filter((r) => r.status === "error").length;

  // 200 auch bei Teilfehlern: Zapier soll nicht endlos wiederholen; Fehler sind
  // im Ereignis-Log sichtbar. Nur ein Komplettausfall meldet 500.
  return NextResponse.json(
    { ok: failed < results.length, created, results },
    { status: failed > 0 && failed === results.length ? 500 : 200 },
  );
}
