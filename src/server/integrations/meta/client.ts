import { createHmac } from "node:crypto";
import { META_GRAPH, getMetaEnv } from "@/config/meta";

/**
 * Schlanker Meta-Graph-API-Client (server-only). Nutzt appsecret_proof zur
 * Absicherung der Token-Aufrufe. Wirft MetaApiError mit lesbarer Meldung.
 */
export class MetaApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "MetaApiError";
  }
}

function env() {
  const e = getMetaEnv();
  if (!e) throw new MetaApiError("Meta ist nicht konfiguriert (META_APP_ID/SECRET/VERIFY_TOKEN fehlen).");
  return e;
}

function appSecretProof(token: string): string {
  return createHmac("sha256", env().appSecret).update(token).digest("hex");
}

async function graphGet<T>(
  path: string,
  token: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${META_GRAPH}/${path}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("appsecret_proof", appSecretProof(token));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`;
    throw new MetaApiError(`Meta-API: ${msg}`, res.status);
  }
  return json as T;
}

/** Alle Seiten einer paginierten Graph-Antwort einsammeln (bis Limit). */
async function graphList<T>(
  path: string,
  token: string,
  params: Record<string, string> = {},
  max = 500,
): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = null;
  let first = true;
  while ((first || next) && out.length < max) {
    let json: { data?: T[]; paging?: { next?: string } };
    if (next) {
      const res = await fetch(next, { cache: "no-store" });
      json = await res.json();
      if (!res.ok) break;
    } else {
      json = await graphGet<{ data?: T[]; paging?: { next?: string } }>(path, token, { ...params, limit: "100" });
    }
    out.push(...(json.data ?? []));
    next = json.paging?.next ?? null;
    first = false;
  }
  return out;
}

export interface MetaPage { id: string; name: string; access_token: string }
export interface MetaNamed { id: string; name: string }
export interface MetaLeadRaw {
  id: string;
  created_time?: string;
  form_id?: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  platform?: string;
  field_data?: Array<{ name: string; values: string[] }>;
}

export const metaClient = {
  /** OAuth-Code -> kurzlebiges User-Token. */
  async exchangeCode(code: string): Promise<string> {
    const e = env();
    const url = new URL(`${META_GRAPH}/oauth/access_token`);
    url.searchParams.set("client_id", e.appId);
    url.searchParams.set("client_secret", e.appSecret);
    url.searchParams.set("redirect_uri", e.redirectUri);
    url.searchParams.set("code", code);
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new MetaApiError(`Token-Tausch fehlgeschlagen: ${json?.error?.message ?? res.status}`);
    return json.access_token as string;
  },

  /** Kurzlebiges -> langlebiges User-Token (~60 Tage). */
  async longLivedToken(shortToken: string): Promise<string> {
    const e = env();
    const url = new URL(`${META_GRAPH}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", e.appId);
    url.searchParams.set("client_secret", e.appSecret);
    url.searchParams.set("fb_exchange_token", shortToken);
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new MetaApiError(`Langlebiges Token fehlgeschlagen: ${json?.error?.message ?? res.status}`);
    return json.access_token as string;
  },

  async me(token: string): Promise<MetaNamed> {
    return graphGet<MetaNamed>("me", token, { fields: "id,name" });
  },
  async businesses(token: string): Promise<MetaNamed[]> {
    return graphList<MetaNamed>("me/businesses", token, { fields: "id,name" });
  },
  async adAccounts(token: string): Promise<MetaNamed[]> {
    return graphList<MetaNamed>("me/adaccounts", token, { fields: "id,name,account_id" });
  },
  /** Seiten inkl. PAGE access tokens (zum Lead-Abruf + Webhook-Subscription). */
  async pages(token: string): Promise<MetaPage[]> {
    return graphList<MetaPage>("me/accounts", token, { fields: "id,name,access_token" });
  },
  async leadForms(pageId: string, pageToken: string): Promise<MetaNamed[]> {
    return graphList<MetaNamed>(`${pageId}/leadgen_forms`, pageToken, { fields: "id,name,status" });
  },

  /** Einzelnen Lead vollstaendig abrufen (Webhook -> Echtzeit). */
  async lead(leadgenId: string, pageToken: string): Promise<MetaLeadRaw> {
    return graphGet<MetaLeadRaw>(leadgenId, pageToken, {
      fields: "id,created_time,field_data,form_id,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform",
    });
  },

  /** Historische Leads eines Formulars (fuer "Leads synchronisieren"). */
  async formLeads(formId: string, pageToken: string, max = 500): Promise<MetaLeadRaw[]> {
    return graphList<MetaLeadRaw>(`${formId}/leads`, pageToken, {
      fields: "id,created_time,field_data,form_id,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform",
    }, max);
  },

  /** Leadgen-Webhook fuer eine Seite abonnieren. */
  async subscribePage(pageId: string, pageToken: string): Promise<void> {
    const url = new URL(`${META_GRAPH}/${pageId}/subscribed_apps`);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: "leadgen",
        access_token: pageToken,
        appsecret_proof: appSecretProof(pageToken),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new MetaApiError(`Webhook-Subscription fehlgeschlagen: ${json?.error?.message ?? res.status}`);
  },
};
