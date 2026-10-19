import { NextResponse } from "next/server";
import { canAccess, getSessionUser } from "@/lib/auth";
import { LEADERSHIP_ROLES } from "@/config/navigation";
import { recordAudit } from "@/lib/activity";
import { resolveRange } from "@/lib/marketing/range";
import { toCsv } from "@/lib/marketing/format";
import { CONFIDENCE_LABELS, channelLabel } from "@/lib/marketing/channels";
import { formLabel } from "@/lib/marketing/forms";
import {
  listBookings,
  listChannelMetrics,
  listConversions,
  listKeywordMetrics,
  listMarketingLeads,
} from "@/server/marketing/dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CSV-Export (serverseitig, nur Leitung). Jeder Export wird im Audit-Log
 * festgehalten (enthaelt Personendaten). Keine Daten im Website-Bundle.
 */

const micros = (v: number | null | undefined) => (v == null ? "" : (v / 1_000_000).toFixed(2));
const iso = (v: string | null | undefined) => v ?? "";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !canAccess(user.roles, LEADERSHIP_ROLES)) return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const p = Object.fromEntries(url.searchParams.entries());
  const range = resolveRange({ range: p.range, from: p.from, to: p.to });
  const type = p.type ?? "leads";
  let header: string[] = [];
  let rows: unknown[][] = [];

  if (type === "leads") {
    const data = (await listMarketingLeads(range, { channel: p.channel, status: p.status, form: p.form })) ?? [];
    header = ["ID", "Datum letzte Anfrage", "Name", "Firma", "E-Mail", "Telefon", "Leistung", "Formular", "Kanal (First Touch)", "Kampagne", "Landingpage", "Kanal (Last Touch)", "Attributions-Sicherheit", "Status", "Zuständig", "Nächster Schritt"];
    rows = data.map((l) => [
      l.id, iso(l.converted_at), l.contact_name, l.company_name, l.email, l.phone, l.dienstleistung, l.form_name ?? formLabel(l.form_type),
      channelLabel(l.ft_channel), l.ft_campaign, l.ft_landing_page, channelLabel(l.lt_channel), CONFIDENCE_LABELS[l.attribution_confidence ?? "unknown"],
      l.status?.label, l.owner?.full_name, l.next_action_date,
    ]);
  } else if (type === "bookings") {
    const data = (await listBookings(range)) ?? [];
    header = ["ID", "Gebucht am", "Termin", "Name", "E-Mail", "Event-Typ", "Status", "Abgesagt am", "Grund", "Quelle", "Medium", "Kampagne", "Kanal", "Landingpage", "Attribution", "Lead-ID"];
    rows = data.map((b) => [
      b.id, iso(b.booked_at), iso(b.start_time), b.invitee_name, b.invitee_email, b.event_name, b.status, iso(b.canceled_at), b.cancel_reason,
      b.utm_source, b.utm_medium, b.utm_campaign, channelLabel(b.channel), b.landing_page, b.attribution_status, b.lead_id,
    ]);
  } else if (type === "conversions") {
    const data = (await listConversions(range, { includeDuplicates: true })) ?? [];
    header = ["ID", "Zeit", "Art", "Formular", "Kanal", "Sicherheit", "Quelle", "Medium", "Kampagne", "Inhalt", "Begriff", "Landingpage", "Conversion-Seite", "Referrer", "Dublette", "Lead-ID"];
    rows = data.map((c) => [
      c.id, c.occurred_at, c.kind, c.form_name ?? formLabel(c.form_type), channelLabel(c.channel), CONFIDENCE_LABELS[c.attribution_confidence],
      c.utm_source, c.utm_medium, c.utm_campaign, c.utm_content, c.utm_term, c.landing_page, c.page_url, c.referrer, c.is_duplicate ? "ja" : "nein", c.lead_id,
    ]);
  } else if (type === "campaigns") {
    const data = (await listChannelMetrics(range)) ?? [];
    header = ["Datum", "Plattform", "Konto", "Kampagnen-ID", "Kampagne", "Status", "Typ/Ziel", "Währung", "Impressionen", "Klicks", "Kosten", "Plattform-Conversions", "Gemeldete Leads"];
    rows = data.map((m) => [m.date, m.platform, m.account_id, m.campaign_id, m.campaign_name, m.campaign_status, m.campaign_type, m.currency, m.impressions, m.clicks, micros(m.cost_micros), m.platform_conversions, m.platform_leads ?? ""]);
  } else if (type === "keywords") {
    const data = (await listKeywordMetrics(range)) ?? [];
    header = ["Datum", "Kampagne", "Anzeigengruppe", "Keyword", "Match Type", "Impressionen", "Klicks", "Kosten", "Plattform-Conversions"];
    rows = data.map((k: any) => [k.date, k.campaign_name, k.ad_group_name, k.keyword_text, k.match_type, k.impressions, k.clicks, micros(Number(k.cost_micros)), k.platform_conversions]); // eslint-disable-line @typescript-eslint/no-explicit-any
  } else {
    return NextResponse.json({ ok: false, error: "Unbekannter Export" }, { status: 400 });
  }

  await recordAudit({ action: "export", entityType: "marketing", newValues: { type, from: range.from, to: range.to, rows: rows.length } });
  return new NextResponse(toCsv(header, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ecreator-${type}-${range.from}_${range.to}.csv"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
