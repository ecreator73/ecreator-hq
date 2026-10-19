import { createHmac } from "node:crypto";
import { fetchJson, ProviderError } from "./http";
import type { Admin } from "../crm";

/**
 * Meta Marketing API (Insights), uebernommen aus eCreator Command.
 * Nur Lesen (ads_read). Token serverseitig, verschluesselt gespeichert.
 * «Gemeldete Leads» sind Plattform-Angaben (Meta-Attribution) und bleiben
 * getrennt von bestaetigten Website-Leads. Reichweite ist nicht ueber Tage
 * summierbar (im Dashboard so beschriftet).
 */

const VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const BASE = `https://graph.facebook.com/${VERSION}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function withAuth(url: URL, token: string): URL {
  url.searchParams.set("access_token", token);
  const secret = process.env.META_APP_SECRET;
  if (secret) url.searchParams.set("appsecret_proof", createHmac("sha256", secret).update(token).digest("hex"));
  return url;
}

async function getAll(path: string, token: string, params: Record<string, string>): Promise<any[]> {
  const out: any[] = [];
  let next: string | null = (() => {
    const u = new URL(`${BASE}/${path}`);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return withAuth(u, token).toString();
  })();
  let guard = 0;
  while (next && guard++ < 200) {
    const json: { data?: any[]; paging?: { next?: string } } = await fetchJson(next, { label: "Meta Ads" });
    out.push(...(json.data ?? []));
    next = json.paging?.next ?? null;
  }
  return out;
}

export async function listMetaAdAccounts(token: string): Promise<Array<{ id: string; name: string; currency: string; timeZone: string; status: number }>> {
  const rows = await getAll("me/adaccounts", token, { fields: "account_id,name,currency,timezone_name,account_status", limit: "200" });
  return rows.map((r) => ({
    id: String(r.account_id),
    name: r.name ?? String(r.account_id),
    currency: r.currency ?? "",
    timeZone: r.timezone_name ?? "",
    status: Number(r.account_status ?? 0),
  }));
}

const LEAD_ACTIONS = new Set(["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"]);

function leadsFrom(actions: any[] | undefined): number {
  if (!Array.isArray(actions)) return 0;
  // «lead» ist Metas Sammelwert; nur wenn er fehlt, die Einzelwerte nehmen (keine Doppelzaehlung).
  const total = actions.find((a) => a.action_type === "lead");
  if (total) return Number(total.value ?? 0) || 0;
  return actions.filter((a) => LEAD_ACTIONS.has(a.action_type)).reduce((s, a) => s + (Number(a.value ?? 0) || 0), 0);
}

const micros = (spend: unknown) => Math.round((Number(spend ?? 0) || 0) * 1_000_000);
const int = (v: unknown) => Math.round(Number(v ?? 0)) || 0;

export async function syncMetaAds(
  db: Admin,
  cfg: { token: string; accountId: string; currency?: string | null },
  from: string,
  to: string,
): Promise<number> {
  if (!cfg.token) throw new ProviderError("Meta Ads: kein Token.", 401, true);
  const act = `act_${cfg.accountId.replace(/^act_/, "")}`;
  const accountId = act.slice(4);
  const currency = cfg.currency || "CHF";
  const now = new Date().toISOString();
  const timeRange = JSON.stringify({ since: from, until: to });

  const campaigns = await getAll(`${act}/campaigns`, cfg.token, { fields: "id,name,effective_status,objective,daily_budget", limit: "500" });
  const meta = new Map(campaigns.map((c) => [String(c.id), c]));

  const campInsights = await getAll(`${act}/insights`, cfg.token, {
    level: "campaign",
    time_increment: "1",
    time_range: timeRange,
    fields: "campaign_id,campaign_name,objective,spend,impressions,reach,clicks,inline_link_clicks,actions",
    limit: "500",
  });
  const campRows = campInsights.map((r) => {
    const c = meta.get(String(r.campaign_id));
    const leads = leadsFrom(r.actions);
    return {
      date: r.date_start,
      platform: "meta_ads",
      account_id: accountId,
      campaign_id: String(r.campaign_id),
      campaign_name: r.campaign_name ?? c?.name ?? null,
      campaign_status: c?.effective_status ?? null,
      campaign_type: r.objective ?? c?.objective ?? null,
      // daily_budget kommt in der kleinsten Waehrungseinheit (Rappen) -> Micros
      budget_micros: c?.daily_budget != null ? int(c.daily_budget) * 10_000 : null,
      currency,
      impressions: int(r.impressions),
      clicks: int(r.clicks),
      link_clicks: int(r.inline_link_clicks),
      reach: int(r.reach),
      cost_micros: micros(r.spend),
      platform_conversions: leads,
      platform_leads: leads,
      synced_at: now,
    };
  });
  for (let i = 0; i < campRows.length; i += 1000) {
    const { error } = await db.from("mi_daily_channel_metrics").upsert(campRows.slice(i, i + 1000), { onConflict: "date,platform,account_id,campaign_id" });
    if (error) throw new Error(`Meta Kampagnen: ${error.message}`);
  }

  const adInsights = await getAll(`${act}/insights`, cfg.token, {
    level: "ad",
    time_increment: "1",
    time_range: timeRange,
    fields: "campaign_id,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,inline_link_clicks,actions",
    limit: "500",
  });
  const adRows = adInsights.map((r) => {
    const leads = leadsFrom(r.actions);
    return {
      date: r.date_start,
      platform: "meta_ads",
      account_id: accountId,
      campaign_id: String(r.campaign_id),
      ad_group_id: String(r.adset_id ?? ""),
      ad_group_name: r.adset_name ?? null,
      ad_id: String(r.ad_id),
      ad_name: r.ad_name ?? null,
      ad_type: null,
      currency,
      impressions: int(r.impressions),
      clicks: int(r.clicks),
      link_clicks: int(r.inline_link_clicks),
      reach: int(r.reach),
      cost_micros: micros(r.spend),
      platform_conversions: leads,
      platform_leads: leads,
      synced_at: now,
    };
  });
  for (let i = 0; i < adRows.length; i += 1000) {
    const { error } = await db.from("mi_daily_ad_metrics").upsert(adRows.slice(i, i + 1000), { onConflict: "date,platform,account_id,ad_id" });
    if (error) throw new Error(`Meta Anzeigen: ${error.message}`);
  }
  return campRows.length + adRows.length;
}
