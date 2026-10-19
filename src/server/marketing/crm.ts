import type { createAdminClient } from "@/lib/supabase/admin";
import { computeLeadScore } from "@/lib/lead-score";

/**
 * Gemeinsame CRM-Bausteine fuer den Lead-Eingang (Website, Calendly).
 * Laeuft ausschliesslich serverseitig mit der Service-Role (Webhooks haben
 * keine Session). Getrennte Konzepte: Kontakt (Person) / Lead (Verkaufschance)
 * / Conversion-Ereignis (einzelne Anfrage) / Buchung (Calendly-Termin).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Admin = ReturnType<typeof createAdminClient>;

export const ORG = "11111111-1111-1111-1111-111111111111";

/** Status, die bei einer Buchung automatisch auf «Termin gebucht» gehen. */
const PRE_MEETING_STATUSES = ["neu", "nicht_erreicht", "mehrfach_nicht_erreicht", "followup", "mail_gesendet"];

export function normEmail(v: string | null | undefined): string | null {
  const s = (v ?? "").trim().toLowerCase();
  return s && s.includes("@") ? s : null;
}

/** Telefonnummer vergleichbar machen (CH-Standard): +41… ohne Leerzeichen. */
export function normPhone(v: string | null | undefined): string | null {
  let s = (v ?? "").replace(/[^\d+]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  else if (s.startsWith("0")) s = `+41${s.slice(1)}`;
  else if (!s.startsWith("+")) s = `+${s}`;
  return s.length >= 8 ? s : null;
}

export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function splitName(full: string): { first: string; last: string | null } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Unbekannt", last: null };
  if (parts.length === 1) return { first: parts[0]!, last: null };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1]! };
}

export async function leadStatusId(db: Admin, key: string): Promise<string | null> {
  const { data } = await db.from("statuses").select("id").eq("entity_type", "lead").eq("key", key).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Live-Aktivitaet schreiben. Fehler hier duerfen den Lead-Eingang nie stoppen. */
export async function logMarketingActivity(
  db: Admin,
  entry: {
    type: string;
    title: string;
    severity?: "info" | "warning" | "error";
    source?: string;
    detail?: string | null;
    lead_id?: string | null;
    booking_id?: string | null;
    campaign?: string | null;
    status?: string | null;
    occurred_at?: string;
  },
): Promise<void> {
  try {
    await db.from("mi_activity_log").insert({ org_id: ORG, severity: "info", ...entry });
  } catch {
    /* Protokoll ist best effort */
  }
}

/**
 * Kontakt deterministisch finden oder anlegen:
 *   1. normalisierte E-Mail (zuerst Kontakte ohne Kunde, dann Kundenkontakte)
 *   2. normalisierte Telefonnummer
 *   3. sonst neu (ohne Kunde, Quelle «website»/«calendly»)
 */
export async function upsertContact(
  db: Admin,
  p: { name: string; email: string | null; phone: string | null; company: string | null; source: string },
): Promise<string | null> {
  const emailNorm = normEmail(p.email);
  const phoneNorm = normPhone(p.phone);

  if (emailNorm) {
    const { data } = await db
      .from("contacts")
      .select("id, client_id, phone, company_name")
      .eq("email_norm", emailNorm)
      .is("deleted_at", null)
      .order("client_id", { ascending: true, nullsFirst: true })
      .limit(1);
    const hit = data?.[0] as any;
    if (hit) {
      const patch: Record<string, unknown> = {};
      if (!hit.phone && p.phone) {
        patch.phone = p.phone;
        patch.phone_norm = phoneNorm;
      }
      if (!hit.company_name && p.company) patch.company_name = p.company;
      if (Object.keys(patch).length) await db.from("contacts").update(patch).eq("id", hit.id);
      return hit.id as string;
    }
  }
  if (!emailNorm && phoneNorm) {
    const { data } = await db.from("contacts").select("id").eq("phone_norm", phoneNorm).is("deleted_at", null).limit(1);
    if (data?.[0]) return (data[0] as any).id as string;
  }

  const { first, last } = splitName(p.name || "Unbekannt");
  const insert = {
    org_id: ORG,
    client_id: null,
    first_name: first,
    last_name: last,
    email: p.email,
    email_norm: emailNorm,
    phone: p.phone,
    phone_norm: phoneNorm,
    company_name: p.company,
    source: p.source,
  };
  const { data, error } = await db.from("contacts").insert(insert).select("id").single();
  if (!error) return (data as any).id as string;
  // Gleichzeitiger Eingang derselben Person: Unique-Index greift -> erneut lesen.
  if (emailNorm) {
    const { data: again } = await db.from("contacts").select("id").eq("email_norm", emailNorm).is("client_id", null).is("deleted_at", null).limit(1);
    if (again?.[0]) return (again[0] as any).id as string;
  }
  return null;
}

/** Bestehenden Lead derselben Person finden (Kontakt, sonst E-Mail, sonst Telefon). */
export async function findLeadForPerson(
  db: Admin,
  p: { contactId: string | null; email: string | null; phone: string | null },
): Promise<any | null> {
  const cols =
    "id, status_id, contact_id, contact_name, company_name, ft_channel, ft_at, ft_campaign, campaign_name, status:statuses!leads_status_id_fkey(key,label)";
  if (p.contactId) {
    const { data } = await db.from("leads").select(cols).eq("contact_id", p.contactId).is("deleted_at", null).order("created_at", { ascending: false }).limit(1);
    if (data?.[0]) return data[0];
  }
  const email = normEmail(p.email);
  if (email) {
    const { data } = await db.from("leads").select(cols).ilike("email", email).is("deleted_at", null).order("created_at", { ascending: false }).limit(1);
    if (data?.[0]) return data[0];
  }
  const phone = (p.phone ?? "").trim();
  if (!email && phone) {
    const { data } = await db.from("leads").select(cols).eq("phone", phone).is("deleted_at", null).order("created_at", { ascending: false }).limit(1);
    if (data?.[0]) return data[0];
  }
  return null;
}

export async function createLead(db: Admin, fields: Record<string, unknown>): Promise<string> {
  const sid = await leadStatusId(db, "neu");
  const nextAction = tomorrowISO();
  const { data, error } = await db
    .from("leads")
    .insert({
      org_id: ORG,
      status_id: sid,
      owner_id: null,
      next_action_date: nextAction,
      lead_score: computeLeadScore({ status: "neu", next_action_date: nextAction }),
      ...fields,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Lead-Insert: ${error.message}`);
  return (data as any).id as string;
}

/** Nach einer Buchung: Lead auf «Termin gebucht», falls er noch davor steht. */
export async function markLeadMeetingBooked(db: Admin, leadId: string): Promise<void> {
  const { data } = await db.from("leads").select("status:statuses!leads_status_id_fkey(key)").eq("id", leadId).maybeSingle();
  const key = (data as any)?.status?.key as string | undefined;
  if (key && !PRE_MEETING_STATUSES.includes(key)) return;
  const sid = await leadStatusId(db, "termin_gebucht");
  if (!sid) return;
  await db
    .from("leads")
    .update({ status_id: sid, lead_score: computeLeadScore({ status: "termin_gebucht", next_action_date: tomorrowISO() }) })
    .eq("id", leadId);
}

export async function addSalesNote(db: Admin, leadId: string, subject: string, body: string): Promise<void> {
  await db.from("sales_activities").insert({ org_id: ORG, lead_id: leadId, type: "note", subject, body });
}

export async function addFollowupTask(db: Admin, leadId: string, title: string): Promise<void> {
  await db.from("tasks").insert({ title, due_date: tomorrowISO(), lead_id: leadId, assigned_to: null });
}
