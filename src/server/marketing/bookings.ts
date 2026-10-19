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

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Calendly-Buchungen. Zwei Eingaenge fuehren auf DIESELBE Zeile
 * (eindeutig per Invitee-URI):
 *   - Website (/api/booking -> Lead-Eingang): kennt Einstiegsseite, Referrer,
 *     Klick-IDs -> «Attributed».
 *   - Calendly-Webhook: kennt jede Buchung (auch direkt auf calendly.com),
 *     Absagen und Verschiebungen, aber nur die UTM aus `tracking`
 *     -> «Partially Attributed» bzw. «Unattributed».
 */

export interface BookingAttribution {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  landing_page?: string | null;
  channel?: string | null;
  attribution_status?: "attributed" | "partial" | "unattributed";
}

export interface BookingUpsert {
  inviteeUri: string;
  eventUri?: string | null;
  via: "website" | "webhook";
  eventTypeUri?: string | null;
  eventName?: string | null;
  inviteeName?: string | null;
  inviteeEmail?: string | null;
  status?: "active" | "canceled" | "rescheduled";
  bookedAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  canceledAt?: string | null;
  cancelReason?: string | null;
  cancelerType?: string | null;
  rescheduled?: boolean;
  oldInviteeUri?: string | null;
  newInviteeUri?: string | null;
  pageUrl?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  attribution?: BookingAttribution;
}

const RANK: Record<string, number> = { unattributed: 0, partial: 1, attributed: 2 };

/** Buchung anlegen oder zusammenfuehren; liefert die Zeilen-ID. */
export async function upsertBooking(db: Admin, b: BookingUpsert): Promise<string | null> {
  const { data: current } = await db
    .from("mi_bookings")
    .select("*")
    .eq("calendly_invitee_uri", b.inviteeUri)
    .maybeSingle();
  const cur = current as any;

  const fill = <T>(next: T | null | undefined, prev: T | null | undefined): T | null =>
    next !== undefined && next !== null && next !== ("" as unknown) ? next : (prev ?? null);

  const a = b.attribution ?? {};
  // Bessere Attribution gewinnt (Website > Calendly-UTM > nichts).
  const takeAttr = !cur || RANK[a.attribution_status ?? "unattributed"]! >= RANK[cur.attribution_status ?? "unattributed"]!;

  const row: Record<string, unknown> = {
    org_id: ORG,
    calendly_invitee_uri: b.inviteeUri,
    calendly_event_uri: fill(b.eventUri, cur?.calendly_event_uri),
    event_type_uri: fill(b.eventTypeUri, cur?.event_type_uri),
    event_name: fill(b.eventName, cur?.event_name),
    invitee_name: fill(b.inviteeName, cur?.invitee_name),
    invitee_email: fill(b.inviteeEmail, cur?.invitee_email),
    status: b.status ?? cur?.status ?? "active",
    booked_at: fill(b.bookedAt, cur?.booked_at),
    start_time: fill(b.startTime, cur?.start_time),
    end_time: fill(b.endTime, cur?.end_time),
    canceled_at: fill(b.canceledAt, cur?.canceled_at),
    cancel_reason: fill(b.cancelReason, cur?.cancel_reason),
    canceler_type: fill(b.cancelerType, cur?.canceler_type),
    rescheduled: b.rescheduled ?? cur?.rescheduled ?? false,
    old_invitee_uri: fill(b.oldInviteeUri, cur?.old_invitee_uri),
    new_invitee_uri: fill(b.newInviteeUri, cur?.new_invitee_uri),
    page_url: fill(b.pageUrl, cur?.page_url),
    lead_id: fill(b.leadId, cur?.lead_id),
    contact_id: fill(b.contactId, cur?.contact_id),
    received_via: Array.from(new Set([...(cur?.received_via ?? []), b.via])),
  };
  if (takeAttr) {
    Object.assign(row, {
      utm_source: fill(a.utm_source, cur?.utm_source),
      utm_medium: fill(a.utm_medium, cur?.utm_medium),
      utm_campaign: fill(a.utm_campaign, cur?.utm_campaign),
      utm_content: fill(a.utm_content, cur?.utm_content),
      utm_term: fill(a.utm_term, cur?.utm_term),
      landing_page: fill(a.landing_page, cur?.landing_page),
      channel: fill(a.channel, cur?.channel),
      attribution_status: a.attribution_status ?? cur?.attribution_status ?? "unattributed",
    });
  }

  const { data, error } = await db
    .from("mi_bookings")
    .upsert(row, { onConflict: "calendly_invitee_uri" })
    .select("id")
    .single();
  if (error) throw new Error(`Buchung: ${error.message}`);
  return (data as any).id as string;
}

/* ------------------------------------------------------------------------ */
/* Calendly-Webhook                                                          */
/* ------------------------------------------------------------------------ */

export interface CalendlyWebhook {
  event?: string;
  created_at?: string;
  payload?: {
    uri?: string;
    email?: string;
    name?: string;
    status?: string;
    created_at?: string;
    event?: string;
    rescheduled?: boolean;
    old_invitee?: string | null;
    new_invitee?: string | null;
    text_reminder_number?: string | null;
    tracking?: Record<string, string | null> | null;
    questions_and_answers?: Array<{ question?: string; answer?: string }>;
    cancellation?: { reason?: string | null; canceler_type?: string | null; created_at?: string | null } | null;
    scheduled_event?: {
      uri?: string;
      name?: string;
      start_time?: string;
      end_time?: string;
      event_type?: string;
    } | null;
  };
}

export type CalendlyResult = { status: "created" | "updated" | "canceled" | "rescheduled" | "ignored"; bookingId: string | null };

const clip = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function processCalendlyWebhook(
  db: Admin,
  body: CalendlyWebhook,
  opts: { backfill?: boolean } = {},
): Promise<CalendlyResult> {
  const p = body.payload;
  const inviteeUri = clip(p?.uri, 300);
  if (!p || !inviteeUri) return { status: "ignored", bookingId: null };
  const ev = p.scheduled_event ?? {};
  const eventUri = clip(ev.uri ?? p.event, 300);

  const { data: before } = await db
    .from("mi_bookings")
    .select("id, status, lead_id")
    .eq("calendly_invitee_uri", inviteeUri)
    .maybeSingle();
  const prev = before as any;

  if (body.event === "invitee.canceled") {
    const rescheduled = Boolean(p.rescheduled);
    const id = await upsertBooking(db, {
      inviteeUri,
      eventUri,
      via: "webhook",
      eventName: clip(ev.name, 200),
      inviteeName: clip(p.name, 200),
      inviteeEmail: clip(p.email, 200),
      startTime: clip(ev.start_time, 40),
      endTime: clip(ev.end_time, 40),
      status: rescheduled ? "rescheduled" : "canceled",
      rescheduled,
      newInviteeUri: clip(p.new_invitee, 300),
      canceledAt: clip(p.cancellation?.created_at, 40) ?? new Date().toISOString(),
      cancelReason: clip(p.cancellation?.reason, 500),
      cancelerType: clip(p.cancellation?.canceler_type, 40),
    });
    const changed = prev?.status !== (rescheduled ? "rescheduled" : "canceled");
    if (changed) {
      const leadId = (prev?.lead_id as string | null) ?? null;
      await logMarketingActivity(db, {
        type: rescheduled ? "booking_rescheduled" : "booking_canceled",
        severity: rescheduled ? "info" : "warning",
        source: "calendly",
        title: rescheduled ? `Termin verschoben: ${clip(p.name, 120) ?? "Gast"}` : `Termin abgesagt: ${clip(p.name, 120) ?? "Gast"}`,
        detail: clip(ev.name, 200),
        lead_id: leadId,
        booking_id: id,
        status: rescheduled ? "Verschoben" : "Abgesagt",
      });
      if (leadId && !rescheduled) {
        await addSalesNote(db, leadId, "Calendly-Termin abgesagt", clip(p.cancellation?.reason, 500) ?? "Ohne Begruendung");
      }
    }
    return { status: rescheduled ? "rescheduled" : "canceled", bookingId: id };
  }

  if (body.event !== "invitee.created") return { status: "ignored", bookingId: null };

  // UTM aus Calendly (gesetzt, wenn der Buchungslink UTM trug)
  const t = p.tracking ?? {};
  const utm = {
    utm_source: clip(t.utm_source, 300),
    utm_medium: clip(t.utm_medium, 300),
    utm_campaign: clip(t.utm_campaign, 300),
    utm_content: clip(t.utm_content, 300) && !String(t.utm_content).startsWith("source_service_") ? clip(t.utm_content, 300) : null,
    utm_term: clip(t.utm_term, 300),
  };
  const hasUtm = Boolean(utm.utm_source || utm.utm_medium || utm.utm_campaign);
  const { channel } = hasUtm
    ? classifyAttribution({ utmSource: utm.utm_source, utmMedium: utm.utm_medium, utmCampaign: utm.utm_campaign })
    : { channel: "unknown" as const };

  // Verschiebung: Lead/Kontakt vom alten Termin uebernehmen
  let leadId: string | null = (prev?.lead_id as string | null) ?? null;
  let contactId: string | null = null;
  const oldInvitee = clip(p.old_invitee, 300);
  if (!leadId && oldInvitee) {
    const { data: old } = await db.from("mi_bookings").select("lead_id, contact_id").eq("calendly_invitee_uri", oldInvitee).maybeSingle();
    leadId = ((old as any)?.lead_id as string | null) ?? null;
    contactId = ((old as any)?.contact_id as string | null) ?? null;
  }

  const name = clip(p.name, 200) ?? "Unbekannt";
  const email = clip(p.email, 200);
  const phone = clip(p.text_reminder_number, 40);
  let createdLead = false;
  if (!leadId) {
    contactId = await upsertContact(db, { name, email, phone, company: null, source: "calendly" });
    const existing = await findLeadForPerson(db, { contactId, email, phone });
    if (existing) {
      leadId = existing.id as string;
      if (!existing.contact_id && contactId) await db.from("leads").update({ contact_id: contactId }).eq("id", leadId);
    } else if (!oldInvitee) {
      leadId = await createLead(db, {
        company_name: name,
        contact_name: name,
        email,
        phone,
        source: "website",
        contact_id: contactId,
        idempotency_key: `calendly:${inviteeUri}`,
        external_lead_id: `calendly:${inviteeUri}`,
        form_type: "calendly",
        form_name: "Calendly-Buchung",
        message: (p.questions_and_answers ?? [])
          .map((x) => `${clip(x.question, 200) ?? ""}: ${clip(x.answer, 1000) ?? ""}`)
          .join("\n") || null,
        dienstleistung: "Strategie-Call",
        campaign_name: utm.utm_campaign,
        converted_at: clip(p.created_at, 40) ?? new Date().toISOString(),
        ft_source: utm.utm_source,
        ft_medium: utm.utm_medium,
        ft_campaign: utm.utm_campaign,
        ft_content: utm.utm_content,
        ft_term: utm.utm_term,
        ft_at: clip(p.created_at, 40),
        ft_channel: channel,
        lt_source: utm.utm_source,
        lt_medium: utm.utm_medium,
        lt_campaign: utm.utm_campaign,
        lt_channel: channel,
        lt_at: clip(p.created_at, 40),
        attribution_confidence: hasUtm ? "booking_data" : "unknown",
        metadata_json: { provider: "calendly", invitee: inviteeUri },
      });
      createdLead = true;
      await addSalesNote(db, leadId, "Strategie-Call ueber Calendly gebucht", `Termin: ${clip(ev.start_time, 40) ?? "-"} · Kanal: ${channelLabel(channel)}`);
      // Nachladen alter Buchungen erzeugt keine Aufgaben.
      if (!opts.backfill) await addFollowupTask(db, leadId, `Strategie-Call vorbereiten: ${name}`);
    }
  }

  const id = await upsertBooking(db, {
    inviteeUri,
    eventUri,
    via: "webhook",
    eventTypeUri: clip(ev.event_type, 300),
    eventName: clip(ev.name, 200),
    inviteeName: name,
    inviteeEmail: email,
    status: "active",
    bookedAt: clip(p.created_at, 40),
    startTime: clip(ev.start_time, 40),
    endTime: clip(ev.end_time, 40),
    oldInviteeUri: oldInvitee,
    leadId,
    contactId,
    attribution: { ...utm, channel, attribution_status: hasUtm ? "partial" : "unattributed" },
  });
  if (leadId && !opts.backfill) await markLeadMeetingBooked(db, leadId);

  // Conversion-Ereignis nur fuer NEUE Buchungen (eine Verschiebung ist keine
  // zusaetzliche Buchung). Die Website-Meldung derselben Buchung hat denselben
  // dedupe_key -> keine Doppelzaehlung.
  if (!oldInvitee) {
    await db.from("mi_conversion_events").upsert(
      {
        org_id: ORG,
        occurred_at: clip(p.created_at, 40) ?? new Date().toISOString(),
        kind: "booking",
        form_type: "calendly",
        form_name: "Calendly-Buchung",
        dedupe_key: `calendly:${inviteeUri}`,
        lead_id: leadId,
        contact_id: contactId,
        booking_id: id,
        service: "Strategie-Call",
        ...utm,
        channel,
        attribution_confidence: hasUtm ? "booking_data" : "unknown",
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
  }

  if (!prev) {
    await logMarketingActivity(db, {
      occurred_at: clip(p.created_at, 40) ?? undefined,
      type: oldInvitee ? "booking_rescheduled" : "booking_created",
      source: "calendly",
      title: oldInvitee ? `Neuer Termin nach Verschiebung: ${name}` : `Calendly-Buchung: ${name}`,
      detail: `${clip(ev.name, 200) ?? "Termin"} · ${channelLabel(channel)}${createdLead ? " · neuer Lead" : ""}`,
      lead_id: leadId,
      booking_id: id,
      campaign: utm.utm_campaign,
      status: "Aktiv",
    });
  }
  return { status: prev ? "updated" : "created", bookingId: id };
}
