import { createAdminClient } from "@/lib/supabase/admin";
import { getContext } from "@/server/services/_helpers";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { metaClient } from "./client";
import { normalizeMetaLead, type NormalizedLead } from "./normalizer";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Admin = ReturnType<typeof createAdminClient>;

const PROVIDER = "meta";
const ORG = "11111111-1111-1111-1111-111111111111";

interface MetaCredentials {
  user_token?: string;
  page_tokens?: Record<string, string>; // pageId -> token
}
export interface MetaConfig {
  business?: { id: string; name: string } | null;
  ad_account?: { id: string; name: string } | null;
  pages?: Array<{ id: string; name: string }>;
  forms?: Array<{ id: string; name: string; page_id: string }>;
}
export interface MetaConnectionRow {
  id: string;
  status: string;
  account_name: string | null;
  config: MetaConfig;
  webhook_verified: boolean;
  webhook_last_event_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  has_credentials: boolean;
}

function admin(): Admin {
  return createAdminClient();
}

async function rawConnection(db: Admin): Promise<any | null> {
  const { data } = await db.from("ad_integrations").select("*").eq("provider", PROVIDER).maybeSingle();
  return data ?? null;
}

function decryptCreds(row: any): MetaCredentials {
  if (!row?.credentials_encrypted) return {};
  try {
    return JSON.parse(decryptSecret(row.credentials_encrypted)) as MetaCredentials;
  } catch {
    return {};
  }
}

async function leadStatusId(db: Admin, key = "neu"): Promise<string | null> {
  const { data } = await db.from("statuses").select("id").eq("entity_type", "lead").eq("key", key).maybeSingle();
  return data?.id ?? null;
}

const tomorrowISO = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

export const metaService = {
  /** Sichere Sicht der Verbindung fuer die UI (keine Tokens). */
  async connection(): Promise<MetaConnectionRow | null> {
    const row = await rawConnection(admin());
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      account_name: row.account_name,
      config: (row.config ?? {}) as MetaConfig,
      webhook_verified: row.webhook_verified,
      webhook_last_event_at: row.webhook_last_event_at,
      last_sync_at: row.last_sync_at,
      last_error: row.last_error,
      has_credentials: Boolean(row.credentials_encrypted),
    };
  },

  /** OAuth-Callback: langlebiges Token holen, Seiten + deren Tokens speichern. */
  async connectWithToken(shortToken: string): Promise<void> {
    const db = admin();
    const userToken = await metaClient.longLivedToken(shortToken);
    const me = await metaClient.me(userToken);
    const pages = await metaClient.pages(userToken);
    const pageTokens: Record<string, string> = {};
    for (const p of pages) pageTokens[p.id] = p.access_token;
    const creds: MetaCredentials = { user_token: userToken, page_tokens: pageTokens };

    await db.from("ad_integrations").upsert(
      {
        org_id: ORG,
        provider: PROVIDER,
        status: "connected",
        account_name: me.name,
        config: { pages: pages.map((p) => ({ id: p.id, name: p.name })), forms: [] },
        credentials_encrypted: encryptSecret(JSON.stringify(creds)),
        last_error: null,
      },
      { onConflict: "org_id,provider" },
    );
  },

  async saveConfig(patch: Partial<MetaConfig>): Promise<void> {
    const db = admin();
    const row = await rawConnection(db);
    const config = { ...(row?.config ?? {}), ...patch };
    await db.from("ad_integrations").update({ config }).eq("provider", PROVIDER);
  },

  async disconnect(): Promise<void> {
    await admin().from("ad_integrations").update({ status: "disconnected", credentials_encrypted: null }).eq("provider", PROVIDER);
  },

  /** Page-Token fuer eine Seite (Lead-Abruf / Webhook-Subscription). */
  async pageToken(pageId: string): Promise<string | null> {
    const row = await rawConnection(admin());
    return decryptCreds(row).page_tokens?.[pageId] ?? null;
  },
  async userToken(): Promise<string | null> {
    const row = await rawConnection(admin());
    return decryptCreds(row).user_token ?? null;
  },

  /** Leadgen-Webhook fuer alle verbundenen Seiten abonnieren. */
  async subscribeWebhooks(): Promise<{ ok: number; failed: number; errors: string[] }> {
    const db = admin();
    const row = await rawConnection(db);
    const creds = decryptCreds(row);
    const pages: Array<{ id: string }> = row?.config?.pages ?? [];
    let ok = 0, failed = 0; const errors: string[] = [];
    for (const p of pages) {
      const token = creds.page_tokens?.[p.id];
      if (!token) { failed++; errors.push(`${p.id}: kein Page-Token`); continue; }
      try { await metaClient.subscribePage(p.id, token); ok++; }
      catch (e) { failed++; errors.push(`${p.id}: ${e instanceof Error ? e.message : "Fehler"}`); }
    }
    await db.from("ad_integrations").update({ webhook_verified: ok > 0 }).eq("provider", PROVIDER);
    return { ok, failed, errors };
  },

  /**
   * Verarbeitet ein eingehendes Leadgen-Event: Lead abrufen, normalisieren,
   * im CRM anlegen/aktualisieren, Aktivitaet + Follow-up-Task, Event-Log.
   */
  async processLeadgen(input: {
    leadgenId: string;
    formId?: string | null;
    pageId?: string | null;
    signatureValid: boolean;
    payload?: unknown;
  }): Promise<{ status: string; leadId: string | null; created: boolean }> {
    const db = admin();
    const { data: evt } = await db.from("ad_lead_events").insert({
      org_id: ORG, provider: PROVIDER, signature_valid: input.signatureValid,
      external_id: input.leadgenId, form_id: input.formId ?? null, page_id: input.pageId ?? null,
      status: "received", payload: input.payload ?? null,
    }).select("id").single();
    const eventId = evt?.id;
    const finish = (status: string, leadId: string | null, error?: string) =>
      db.from("ad_lead_events").update({ status, lead_id: leadId, error: error ?? null }).eq("id", eventId);

    try {
      const pageId = input.pageId ?? "";
      const token = pageId ? await this.pageToken(pageId) : await this.userToken();
      if (!token) { await finish("error", null, "Kein Token fuer Seite"); return { status: "error", leadId: null, created: false }; }

      const raw = await metaClient.lead(input.leadgenId, token);
      const row = await rawConnection(db);
      const formName = (row?.config?.forms ?? []).find((f: any) => f.id === (raw.form_id ?? input.formId))?.name ?? null;
      const n = normalizeMetaLead(raw, { form_name: formName });

      const { id, created } = await this.upsertLead(db, n);
      await db.from("ad_integrations").update({ webhook_last_event_at: new Date().toISOString() }).eq("provider", PROVIDER);
      await finish(created ? "processed" : "duplicate", id);
      return { status: created ? "processed" : "duplicate", leadId: id, created };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler";
      await finish("error", null, msg);
      return { status: "error", leadId: null, created: false };
    }
  },

  /** Lead anlegen oder (bei Dublette) aktualisieren + Aktivitaet/Task. */
  async upsertLead(db: Admin, n: NormalizedLead): Promise<{ id: string; created: boolean }> {
    // Dublette: external_lead_id -> email -> phone
    let dupId: string | null = null;
    const byExt = await db.from("leads").select("id").eq("external_lead_id", n.external_lead_id).is("deleted_at", null).maybeSingle();
    dupId = byExt.data?.id ?? null;
    if (!dupId && n.email) {
      const r = await db.from("leads").select("id").ilike("email", n.email).is("deleted_at", null).limit(1);
      dupId = r.data?.[0]?.id ?? null;
    }
    if (!dupId && n.phone) {
      const r = await db.from("leads").select("id").eq("phone", n.phone).is("deleted_at", null).limit(1);
      dupId = r.data?.[0]?.id ?? null;
    }

    const metaFields = {
      external_lead_id: n.external_lead_id, form_id: n.form_id, form_name: n.form_name,
      ad_id: n.ad_id, ad_name: n.ad_name, adset_id: n.adset_id, adset_name: n.adset_name,
      campaign_id: n.campaign_id, campaign_name: n.campaign_name, metadata_json: n.metadata_json,
    };

    if (dupId) {
      await db.from("leads").update(metaFields).eq("id", dupId);
      await db.from("sales_activities").insert({
        lead_id: dupId, type: "note", subject: "Lead ueber Meta Ads eingegangen (erneut)",
        body: `Kampagne: ${n.campaign_name ?? "-"} · Formular: ${n.form_name ?? n.form_id ?? "-"} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
      });
      return { id: dupId, created: false };
    }

    const sid = await leadStatusId(db, "neu");
    const insert = {
      company_name: n.company_name, contact_name: n.contact_name,
      email: n.email, phone: n.phone, source: n.source, status_id: sid, owner_id: null,
      next_action_date: tomorrowISO(),
      ...metaFields,
      ...(n.created_at ? { created_at: n.created_at } : {}),
    };
    const { data: ins, error } = await db.from("leads").insert(insert).select("id").single();
    if (error) throw new Error(`Lead-Insert: ${error.message}`);
    const id = ins.id as string;

    await db.from("sales_activities").insert({
      lead_id: id, type: "note", subject: "Lead ueber Meta Ads eingegangen",
      body: `Kampagne: ${n.campaign_name ?? "-"} · Formular: ${n.form_name ?? n.form_id ?? "-"} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    });
    await db.from("tasks").insert({ title: `Neuen Meta Lead kontaktieren: ${n.contact_name}`, due_date: tomorrowISO(), lead_id: id, assigned_to: null });
    return { id, created: true };
  },

  /** Historische Leads aller ausgewaehlten Formulare importieren. */
  async syncHistorical(): Promise<{ created: number; updated: number; errors: string[] }> {
    const db = admin();
    const row = await rawConnection(db);
    const creds = decryptCreds(row);
    const forms: Array<{ id: string; name: string; page_id: string }> = row?.config?.forms ?? [];
    let created = 0, updated = 0; const errors: string[] = [];
    for (const f of forms) {
      const token = creds.page_tokens?.[f.page_id];
      if (!token) { errors.push(`${f.name}: kein Page-Token`); continue; }
      try {
        const leads = await metaClient.formLeads(f.id, token);
        for (const raw of leads) {
          const n = normalizeMetaLead(raw, { form_name: f.name });
          try { const r = await this.upsertLead(db, n); r.created ? created++ : updated++; }
          catch (e) { errors.push(`${raw.id}: ${e instanceof Error ? e.message : "Fehler"}`); }
        }
      } catch (e) { errors.push(`${f.name}: ${e instanceof Error ? e.message : "Fehler"}`); }
    }
    await db.from("ad_integrations").update({ last_sync_at: new Date().toISOString() }).eq("provider", PROVIDER);
    return { created, updated, errors };
  },

  /** Lead-Formulare aller verbundenen Seiten (fuer die Auswahl in Settings). */
  async listForms(): Promise<Array<{ id: string; name: string; page_id: string; page_name: string }>> {
    const db = admin();
    const row = await rawConnection(db);
    const creds = decryptCreds(row);
    const pages: Array<{ id: string; name: string }> = row?.config?.pages ?? [];
    const out: Array<{ id: string; name: string; page_id: string; page_name: string }> = [];
    for (const p of pages) {
      const token = creds.page_tokens?.[p.id];
      if (!token) continue;
      try {
        const forms = await metaClient.leadForms(p.id, token);
        for (const f of forms) out.push({ id: f.id, name: f.name, page_id: p.id, page_name: p.name });
      } catch {
        /* Seite ohne Formular-Zugriff ueberspringen */
      }
    }
    return out;
  },

  /** Letzte eingehende Webhook-Events (Monitoring). */
  async recentEvents(limit = 20): Promise<any[]> {
    const { data } = await admin()
      .from("ad_lead_events")
      .select("id, received_at, signature_valid, external_id, status, error")
      .eq("provider", PROVIDER)
      .order("received_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  /** Dashboard-Kennzahlen (Home) - liest mit der Session (RLS). */
  async dashboardStats(): Promise<{ today: number; week: number; topCampaigns: Array<{ name: string; count: number }> }> {
    const { supabase } = await getContext();
    const now = new Date();
    const todayStart = now.toISOString().slice(0, 10);
    const weekStart = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("leads")
      .select("created_at, campaign_name")
      .eq("source", "meta_ads")
      .is("deleted_at", null)
      .gte("created_at", `${weekStart}T00:00:00`);
    const rows = (data ?? []) as Array<{ created_at: string; campaign_name: string | null }>;
    let today = 0; const camp = new Map<string, number>();
    for (const r of rows) {
      if (String(r.created_at).slice(0, 10) >= todayStart) today++;
      const c = r.campaign_name?.trim();
      if (c) camp.set(c, (camp.get(c) ?? 0) + 1);
    }
    const topCampaigns = [...camp.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    return { today, week: rows.length, topCampaigns };
  },
};
