import { fetchJson, ProviderError } from "./http";
import { googleAccessToken } from "./google";
import { googleEnv } from "../integrations";
import type { Admin } from "../crm";

/**
 * Google Ads API (REST, GAQL), uebernommen aus eCreator Command.
 * Unterschiede zum Original: Kosten bleiben in Micros (keine Rundung auf
 * Franken), KEINE geschaetzten Termine (dort: Conversions × 0.4) - Termine
 * kommen ausschliesslich aus Calendly. Plattform-Conversions bleiben getrennt
 * von bestaetigten Website-Leads.
 *
 * Version konfigurierbar (GOOGLE_ADS_API_VERSION), Standard v24
 * (Google: v23 bis Feb. 2027, v24 bis Mai 2027 unterstuetzt).
 */

const VERSION = process.env.GOOGLE_ADS_API_VERSION || "v24";
const BASE = `https://googleads.googleapis.com/${VERSION}`;

const clean = (id: string | null | undefined) => String(id ?? "").replace(/-/g, "");

function headers(token: string, loginCustomerId?: string | null): Record<string, string> {
  const env = googleEnv();
  if (!env?.developerToken) throw new ProviderError("Google Ads: Developer-Token fehlt (GOOGLE_ADS_DEVELOPER_TOKEN).");
  const h: Record<string, string> = {
    authorization: `Bearer ${token}`,
    "developer-token": env.developerToken,
    "content-type": "application/json",
  };
  const login = clean(loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  if (login) h["login-customer-id"] = login;
  return h;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function searchAll(token: string, customerId: string, query: string, login?: string | null): Promise<any[]> {
  const rows: any[] = [];
  let pageToken: string | undefined;
  do {
    const json = await fetchJson<{ results?: any[]; nextPageToken?: string }>(`${BASE}/customers/${clean(customerId)}/googleAds:search`, {
      label: "Google Ads",
      method: "POST",
      headers: headers(token, login),
      body: JSON.stringify(pageToken ? { query, pageToken } : { query }),
    });
    rows.push(...(json.results ?? []));
    pageToken = json.nextPageToken;
  } while (pageToken);
  return rows;
}

export async function listAdsCustomers(login?: string | null): Promise<Array<{ id: string; name: string; currency: string; timeZone: string; manager: boolean }>> {
  const token = await googleAccessToken();
  const json = await fetchJson<{ resourceNames?: string[] }>(`${BASE}/customers:listAccessibleCustomers`, {
    label: "Google Ads",
    headers: headers(token, null),
  });
  const ids = (json.resourceNames ?? []).map((r) => r.split("/").pop()!).filter(Boolean);
  const out = [];
  for (const id of ids) {
    try {
      const rows = await searchAll(
        token,
        id,
        "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager FROM customer LIMIT 1",
        login ?? id,
      );
      const c = rows[0]?.customer ?? {};
      out.push({ id, name: c.descriptiveName ?? id, currency: c.currencyCode ?? "", timeZone: c.timeZone ?? "", manager: Boolean(c.manager) });
    } catch {
      out.push({ id, name: id, currency: "", timeZone: "", manager: false });
    }
  }
  return out;
}

const int = (v: unknown) => Math.round(Number(v ?? 0)) || 0;
const dec = (v: unknown) => Number(Number(v ?? 0).toFixed(2)) || 0;

async function upsertChunks(db: Admin, table: string, rows: Record<string, unknown>[], onConflict: string): Promise<void> {
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 1000), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

/** Kampagnen-, Anzeigen- und Keyword-Werte je Tag fuer [from, to]. */
export async function syncGoogleAds(
  db: Admin,
  cfg: { customerId: string; loginCustomerId?: string | null; currency?: string | null },
  from: string,
  to: string,
): Promise<number> {
  const token = await googleAccessToken();
  const cid = clean(cfg.customerId);
  const login = cfg.loginCustomerId ?? null;
  const currency = cfg.currency || "CHF";
  const now = new Date().toISOString();
  const where = `segments.date BETWEEN '${from}' AND '${to}'`;

  const campaigns = await searchAll(
    token,
    cid,
    `SELECT segments.date, campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
            campaign_budget.amount_micros, metrics.impressions, metrics.clicks, metrics.cost_micros,
            metrics.conversions, metrics.conversions_value
       FROM campaign WHERE ${where}`,
    login,
  );
  const campRows = campaigns.map((r) => ({
    date: r.segments?.date,
    platform: "google_ads",
    account_id: cid,
    campaign_id: String(r.campaign?.id ?? ""),
    campaign_name: r.campaign?.name ?? null,
    campaign_status: r.campaign?.status ?? null,
    campaign_type: r.campaign?.advertisingChannelType ?? null,
    budget_micros: r.campaignBudget?.amountMicros != null ? int(r.campaignBudget.amountMicros) : null,
    currency,
    impressions: int(r.metrics?.impressions),
    clicks: int(r.metrics?.clicks),
    cost_micros: int(r.metrics?.costMicros),
    platform_conversions: dec(r.metrics?.conversions),
    conversion_value: dec(r.metrics?.conversionsValue),
    synced_at: now,
  }));
  await upsertChunks(db, "mi_daily_channel_metrics", campRows, "date,platform,account_id,campaign_id");

  const ads = await searchAll(
    token,
    cid,
    `SELECT segments.date, campaign.id, ad_group.id, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.name,
            ad_group_ad.ad.type, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
       FROM ad_group_ad WHERE ${where}`,
    login,
  );
  const adRows = ads.map((r) => ({
    date: r.segments?.date,
    platform: "google_ads",
    account_id: cid,
    campaign_id: String(r.campaign?.id ?? ""),
    ad_group_id: String(r.adGroup?.id ?? ""),
    ad_group_name: r.adGroup?.name ?? null,
    ad_id: String(r.adGroupAd?.ad?.id ?? ""),
    ad_name: r.adGroupAd?.ad?.name ?? null,
    ad_type: r.adGroupAd?.ad?.type ?? null,
    currency,
    impressions: int(r.metrics?.impressions),
    clicks: int(r.metrics?.clicks),
    cost_micros: int(r.metrics?.costMicros),
    platform_conversions: dec(r.metrics?.conversions),
    synced_at: now,
  }));
  await upsertChunks(db, "mi_daily_ad_metrics", adRows, "date,platform,account_id,ad_id");

  const kws = await searchAll(
    token,
    cid,
    `SELECT segments.date, campaign.id, campaign.name, ad_group.id, ad_group.name,
            ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
            metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
       FROM keyword_view WHERE ${where}`,
    login,
  );
  const kwRows = kws.map((r) => ({
    date: r.segments?.date,
    account_id: cid,
    campaign_id: String(r.campaign?.id ?? ""),
    campaign_name: r.campaign?.name ?? null,
    ad_group_id: String(r.adGroup?.id ?? ""),
    ad_group_name: r.adGroup?.name ?? null,
    criterion_id: String(r.adGroupCriterion?.criterionId ?? ""),
    keyword_text: r.adGroupCriterion?.keyword?.text ?? null,
    match_type: r.adGroupCriterion?.keyword?.matchType ?? null,
    currency,
    impressions: int(r.metrics?.impressions),
    clicks: int(r.metrics?.clicks),
    cost_micros: int(r.metrics?.costMicros),
    platform_conversions: dec(r.metrics?.conversions),
    synced_at: now,
  }));
  await upsertChunks(db, "mi_daily_keyword_metrics", kwRows, "date,account_id,ad_group_id,criterion_id");

  return campRows.length + adRows.length + kwRows.length;
}
