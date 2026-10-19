import { z } from "zod";
import { classifyAttribution, channelLabel } from "@/lib/marketing/channels";
import {
  ORG,
  addFollowupTask,
  addSalesNote,
  createLead,
  findLeadForPerson,
  logMarketingActivity,
  markLeadMeetingBooked,
  upsertContact,
  type Admin,
} from "./crm";
import { upsertBooking } from "./bookings";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Website-Lead-Eingang (www.ecreator.ch -> eCreator OS).
 *
 * Die Website schickt nach dem erfolgreichen Versand denselben Payload wie an
 * das bisherige CRM (flache Felder + `details`), signiert per HMAC. Ablauf:
 *   1. Idempotenz: dedupe_key = Website-Lead-ID (bzw. calendly:<invitee> bei
 *      Buchungen). Wiederholte Zustellung -> «duplicate», nichts doppelt.
 *   2. Doppelklick: gleicher Inhalts-Fingerprint innerhalb von 10 Minuten ->
 *      Ereignis als Dublette markiert, kein zweiter Lead.
 *   3. Kontakt finden/anlegen, Lead derselben Person finden oder neu anlegen
 *      (Wiederholungsanfragen bleiben als eigenes Ereignis erhalten).
 *   4. Conversion-Ereignis mit vollstaendiger Attribution, Live-Aktivitaet.
 */

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const s = (max: number) => z.string().trim().max(max).optional().nullable();

export const websiteLeadSchema = z
  .object({
    lead_id: z.string().trim().min(3).max(80).regex(/^[a-z]{2}_[A-Za-z0-9_-]+$/),
    lead_type: z.string().trim().max(40),
    created_at: s(40),
    name: s(200),
    first_name: s(100),
    last_name: s(100),
    email: s(200),
    phone: s(40),
    company: s(200),
    website: s(300),
    dienstleistung: s(400),
    message: s(6000),
    form_name: s(200),
    page_url: s(400),
    utm_source: s(300),
    utm_medium: s(300),
    utm_campaign: s(300),
    utm_content: s(300),
    utm_term: s(300),
    landing_page: s(400),
    referrer: s(400),
    first_seen: s(40),
    gclid: s(300),
    gbraid: s(300),
    wbraid: s(300),
    fbclid: s(300),
    msclkid: s(300),
    ttclid: s(300),
    li_fat_id: s(300),
    source_service: s(60),
    source_service_label: s(120),
    fingerprint: s(128),
    consent_status: z.enum(["granted", "denied", "unknown"]).optional().nullable(),
    details: z.record(z.unknown()).optional().nullable(),
  })
  .passthrough();

export type WebsiteLeadPayload = z.infer<typeof websiteLeadSchema>;

export type IngestResult = {
  status: "created" | "repeat" | "duplicate" | "enriched";
  leadId: string | null;
  eventId: string | null;
};

const val = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

function isoOrNull(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Formularangaben ohne Kontaktdaten (Datenminimierung im Ereignis). */
function minimizeDetails(details: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!details) return null;
  const drop = new Set([
    "first_name", "last_name", "name", "email", "phone", "telefon", "kontakt", "company", "attribution",
    "utm_source", "utm_medium", "utm_campaign", "utm_content",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) if (!drop.has(k)) out[k] = v;
  return out;
}

function bookingFromDetails(details: Record<string, unknown> | null | undefined) {
  const cal = (details?.calendly ?? null) as { invitee?: string; event?: string } | null;
  const termin = (details?.termin ?? null) as { start?: string; end?: string; titel?: string } | null;
  if (!cal?.invitee) return null;
  return { invitee: String(cal.invitee), event: cal.event ? String(cal.event) : null, termin };
}

export async function ingestWebsiteLead(db: Admin, p: WebsiteLeadPayload): Promise<IngestResult> {
  const booking = bookingFromDetails(p.details);
  const dedupeKey = booking ? `calendly:${booking.invitee}` : `website:${p.lead_id}`;
  const occurredAt = isoOrNull(p.created_at) ?? new Date().toISOString();

  const attribution = {
    utmSource: val(p.utm_source),
    utmMedium: val(p.utm_medium),
    utmCampaign: val(p.utm_campaign),
    referrer: val(p.referrer),
    landingPage: val(p.landing_page),
    gclid: val(p.gclid),
    gbraid: val(p.gbraid),
    wbraid: val(p.wbraid),
    fbclid: val(p.fbclid),
    msclkid: val(p.msclkid),
    ttclid: val(p.ttclid),
    liFatId: val(p.li_fat_id),
  };
  const { channel, confidence } = classifyAttribution(attribution);
  const attrCols = {
    utm_source: attribution.utmSource,
    utm_medium: attribution.utmMedium,
    utm_campaign: attribution.utmCampaign,
    utm_content: val(p.utm_content),
    utm_term: val(p.utm_term),
    landing_page: attribution.landingPage,
    referrer: attribution.referrer,
    first_seen_at: isoOrNull(p.first_seen),
    gclid: attribution.gclid,
    gbraid: attribution.gbraid,
    wbraid: attribution.wbraid,
    fbclid: attribution.fbclid,
    msclkid: attribution.msclkid,
    ttclid: attribution.ttclid,
    li_fat_id: attribution.liFatId,
    channel,
    attribution_confidence: confidence,
  };

  // 1. Idempotenz: dieselbe Absendung kam schon an
  const { data: existing } = await db
    .from("mi_conversion_events")
    .select("id, lead_id, external_id, channel")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();
  if (existing) {
    // Buchung kam zuerst per Calendly-Webhook: Website-Attribution nachtragen
    // (die Website kennt Einstiegsseite, Referrer und Klick-IDs, Calendly nicht).
    if (booking && !existing.external_id) {
      await db
        .from("mi_conversion_events")
        .update({ external_id: p.lead_id, page_url: val(p.page_url), ...attrCols })
        .eq("id", existing.id);
      await upsertBooking(db, {
        inviteeUri: booking.invitee,
        eventUri: booking.event,
        via: "website",
        pageUrl: val(p.page_url),
        attribution: { ...attrCols, channel, attribution_status: confidence === "unknown" ? "partial" : "attributed" },
      });
      const lid = (existing.lead_id as string | null) ?? null;
      if (lid && confidence !== "unknown") {
        // Lead stammt aus dem Webhook (nur Calendly-UTM): Website-Attribution ist genauer.
        const { data: l } = await db.from("leads").select("attribution_confidence").eq("id", lid).maybeSingle();
        if ((l as any)?.attribution_confidence !== "utm_verified") {
          await db
            .from("leads")
            .update({
              ft_source: attribution.utmSource,
              ft_medium: attribution.utmMedium,
              ft_campaign: attribution.utmCampaign,
              ft_content: val(p.utm_content),
              ft_term: val(p.utm_term),
              ft_landing_page: attribution.landingPage,
              ft_referrer: attribution.referrer,
              ft_at: isoOrNull(p.first_seen) ?? occurredAt,
              ft_channel: channel,
              lt_source: attribution.utmSource,
              lt_medium: attribution.utmMedium,
              lt_campaign: attribution.utmCampaign,
              lt_landing_page: attribution.landingPage,
              lt_channel: channel,
              conversion_page: val(p.page_url),
              gclid: attribution.gclid,
              gbraid: attribution.gbraid,
              wbraid: attribution.wbraid,
              fbclid: attribution.fbclid,
              msclkid: attribution.msclkid,
              ttclid: attribution.ttclid,
              li_fat_id: attribution.liFatId,
              attribution_confidence: confidence,
            })
            .eq("id", lid);
        }
      }
      return { status: "enriched", leadId: lid, eventId: existing.id as string };
    }
    return { status: "duplicate", leadId: (existing.lead_id as string) ?? null, eventId: existing.id as string };
  }

  // 2. Doppelklick: gleicher Inhalt kurz hintereinander
  const fingerprint = val(p.fingerprint);
  let duplicateOf: { id: string; lead_id: string | null } | null = null;
  if (fingerprint) {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
    const { data } = await db
      .from("mi_conversion_events")
      .select("id, lead_id")
      .eq("fingerprint", fingerprint)
      .eq("is_duplicate", false)
      .gte("received_at", since)
      .limit(1);
    duplicateOf = (data?.[0] as any) ?? null;
  }

  const baseEvent = {
    org_id: ORG,
    occurred_at: occurredAt,
    kind: booking ? "booking" : "form",
    form_type: p.lead_type,
    form_name: val(p.form_name),
    dedupe_key: dedupeKey,
    external_id: p.lead_id,
    fingerprint,
    service: val(p.source_service_label) ?? val(p.dienstleistung),
    page_url: val(p.page_url),
    consent_status: p.consent_status ?? "unknown",
    details: minimizeDetails(p.details),
    ...attrCols,
  };

  if (duplicateOf) {
    const { data: dup } = await db
      .from("mi_conversion_events")
      .insert({ ...baseEvent, is_duplicate: true, lead_id: duplicateOf.lead_id })
      .select("id")
      .single();
    await logMarketingActivity(db, {
      type: "duplicate_blocked",
      severity: "warning",
      source: "website",
      title: "Doppelte Absendung erkannt",
      detail: `${val(p.form_name) ?? p.lead_type}: gleicher Inhalt innerhalb von 10 Minuten, kein zweiter Lead`,
      lead_id: duplicateOf.lead_id,
    });
    return { status: "duplicate", leadId: duplicateOf.lead_id, eventId: (dup as any)?.id ?? null };
  }

  // 3. Kontakt + Lead
  const name = val(p.name) ?? ([val(p.first_name), val(p.last_name)].filter(Boolean).join(" ") || "Unbekannt");
  const email = val(p.email);
  const phone = val(p.phone);
  const company = val(p.company);
  const contactId = await upsertContact(db, { name, email, phone, company, source: "website" });
  const existingLead = await findLeadForPerson(db, { contactId, email, phone });

  const lastTouch = {
    lt_source: attribution.utmSource,
    lt_medium: attribution.utmMedium,
    lt_campaign: attribution.utmCampaign,
    lt_landing_page: attribution.landingPage,
    lt_channel: channel,
    lt_at: occurredAt,
  };
  const formLabel = val(p.form_name) ?? p.lead_type;
  const sourceLine = `Kanal: ${channelLabel(channel)}${attribution.utmCampaign ? ` · Kampagne: ${attribution.utmCampaign}` : ""}${attribution.landingPage ? ` · Einstieg: ${attribution.landingPage}` : ""}`;

  let leadId: string;
  let status: IngestResult["status"];
  if (existingLead) {
    leadId = existingLead.id as string;
    status = "repeat";
    const patch: Record<string, unknown> = { ...lastTouch, conversion_page: val(p.page_url), converted_at: occurredAt };
    if (!existingLead.contact_id && contactId) patch.contact_id = contactId;
    // First Touch nur setzen, wenn der Lead noch keinen hat (z.B. Alt-Lead).
    if (!existingLead.ft_channel) {
      Object.assign(patch, {
        ft_source: attribution.utmSource,
        ft_medium: attribution.utmMedium,
        ft_campaign: attribution.utmCampaign,
        ft_content: val(p.utm_content),
        ft_term: val(p.utm_term),
        ft_landing_page: attribution.landingPage,
        ft_referrer: attribution.referrer,
        ft_at: isoOrNull(p.first_seen) ?? occurredAt,
        ft_channel: channel,
        attribution_confidence: confidence,
      });
    }
    await db.from("leads").update(patch).eq("id", leadId);
    await addSalesNote(db, leadId, `Erneute Anfrage ueber die Website (${formLabel})`, [val(p.message) ?? "", sourceLine].filter(Boolean).join("\n"));
    await addFollowupTask(db, leadId, `Erneute Website-Anfrage: ${name}`);
  } else {
    status = "created";
    leadId = await createLead(db, {
      company_name: company ?? name,
      contact_name: name,
      email,
      phone,
      website: val(p.website),
      source: "website",
      contact_id: contactId,
      idempotency_key: dedupeKey,
      external_lead_id: `website:${p.lead_id}`,
      form_type: p.lead_type,
      form_name: formLabel,
      message: val(p.message),
      dienstleistung: val(p.dienstleistung),
      campaign_name: attribution.utmCampaign,
      ad_name: val(p.utm_content),
      conversion_page: val(p.page_url),
      converted_at: occurredAt,
      ft_source: attribution.utmSource,
      ft_medium: attribution.utmMedium,
      ft_campaign: attribution.utmCampaign,
      ft_content: val(p.utm_content),
      ft_term: val(p.utm_term),
      ft_landing_page: attribution.landingPage,
      ft_referrer: attribution.referrer,
      ft_at: isoOrNull(p.first_seen) ?? occurredAt,
      ft_channel: channel,
      ...lastTouch,
      gclid: attribution.gclid,
      gbraid: attribution.gbraid,
      wbraid: attribution.wbraid,
      fbclid: attribution.fbclid,
      msclkid: attribution.msclkid,
      ttclid: attribution.ttclid,
      li_fat_id: attribution.liFatId,
      consent_status: p.consent_status ?? "unknown",
      attribution_confidence: confidence,
      metadata_json: { provider: "website", website_lead_id: p.lead_id, lead_type: p.lead_type },
    });
    await addSalesNote(db, leadId, `Lead ueber die Website eingegangen (${formLabel})`, [val(p.message) ?? "", sourceLine].filter(Boolean).join("\n"));
    await addFollowupTask(db, leadId, `Neuen Website-Lead kontaktieren: ${name}`);
  }

  // 4. Buchung (Strategie-Call ueber das eingebettete Calendly)
  let bookingId: string | null = null;
  if (booking) {
    bookingId = await upsertBooking(db, {
      inviteeUri: booking.invitee,
      eventUri: booking.event,
      via: "website",
      eventName: booking.termin?.titel ?? null,
      inviteeName: name,
      inviteeEmail: email,
      startTime: isoOrNull(booking.termin?.start),
      endTime: isoOrNull(booking.termin?.end),
      bookedAt: occurredAt,
      pageUrl: val(p.page_url),
      leadId,
      contactId,
      attribution: { ...attrCols, channel, attribution_status: confidence === "unknown" ? "partial" : "attributed" },
    });
    await markLeadMeetingBooked(db, leadId);
  }

  const { data: evt, error: evtErr } = await db
    .from("mi_conversion_events")
    .insert({ ...baseEvent, lead_id: leadId, contact_id: contactId, booking_id: bookingId })
    .select("id")
    .single();
  if (evtErr && !String(evtErr.message).includes("duplicate")) throw new Error(`Ereignis: ${evtErr.message}`);

  await logMarketingActivity(db, {
    type: booking ? "booking_created" : status === "created" ? "lead_created" : "lead_repeat",
    source: "website",
    title: booking
      ? `Strategie-Call gebucht: ${name}`
      : status === "created"
        ? `Neuer Lead: ${name}`
        : `Erneute Anfrage: ${name}`,
    detail: `${formLabel} · ${channelLabel(channel)}`,
    lead_id: leadId,
    booking_id: bookingId,
    campaign: attribution.utmCampaign,
    status: status === "created" ? "Neu" : null,
    occurred_at: occurredAt,
  });

  return { status, leadId, eventId: (evt as any)?.id ?? null };
}
