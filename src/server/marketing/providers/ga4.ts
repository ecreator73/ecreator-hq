import { fetchJson } from "./http";
import { googleAccessToken } from "./google";
import type { Admin } from "../crm";

/**
 * GA4 Data API v1beta + Admin API v1beta (uebernommen aus eCreator Command,
 * neu in TypeScript). Daten je Tag in der Zeitzone der Property.
 * Wichtig: Nutzer (totalUsers) sind NICHT ueber Tage/Dimensionen summierbar -
 * Zeitraum-Nutzer kommen aus `rangeSummary` (eigene Abfrage, gecacht).
 */

const DATA = "https://analyticsdata.googleapis.com/v1beta";
const ADMIN = "https://analyticsadmin.googleapis.com/v1beta";
const PAGE = 100_000;

interface Row {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}
interface Report {
  rows?: Row[];
  rowCount?: number;
}

const num = (v: string | undefined) => Number(v ?? 0) || 0;
const gaDate = (v: string | undefined) => (v && v.length === 8 ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : v ?? "");

async function runReport(token: string, propertyId: string, body: Record<string, unknown>): Promise<Row[]> {
  const rows: Row[] = [];
  let offset = 0;
  for (;;) {
    const json = await fetchJson<Report>(`${DATA}/properties/${encodeURIComponent(propertyId)}:runReport`, {
      label: "GA4",
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ ...body, limit: PAGE, offset }),
    });
    rows.push(...(json.rows ?? []));
    offset += PAGE;
    if (!json.rowCount || offset >= json.rowCount) break;
  }
  return rows;
}

export async function listGa4Properties(): Promise<Array<{ id: string; name: string; account: string }>> {
  const token = await googleAccessToken();
  const out: Array<{ id: string; name: string; account: string }> = [];
  let pageToken: string | undefined;
  do {
    const u = new URL(`${ADMIN}/accountSummaries`);
    u.searchParams.set("pageSize", "200");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const json = await fetchJson<{
      accountSummaries?: Array<{ displayName?: string; propertySummaries?: Array<{ property?: string; displayName?: string }> }>;
      nextPageToken?: string;
    }>(u.toString(), { label: "GA4 Admin", headers: { authorization: `Bearer ${token}` } });
    for (const a of json.accountSummaries ?? []) {
      for (const p of a.propertySummaries ?? []) {
        const id = p.property?.split("/").pop();
        if (id) out.push({ id, name: p.displayName ?? id, account: a.displayName ?? "" });
      }
    }
    pageToken = json.nextPageToken;
  } while (pageToken);
  return out;
}

/** Tageswerte fuer [from, to] laden und idempotent speichern. */
export async function syncGa4(db: Admin, propertyId: string, from: string, to: string): Promise<number> {
  const token = await googleAccessToken();
  const dateRanges = [{ startDate: from, endDate: to }];
  const now = new Date().toISOString();
  let n = 0;

  // 1. Tages-Totals
  const totals = await runReport(token, propertyId, {
    dateRanges,
    dimensions: [{ name: "date" }],
    metrics: ["totalUsers", "newUsers", "activeUsers", "sessions", "engagedSessions", "screenPageViews", "keyEvents"].map((name) => ({ name })),
  });
  const totalRows = totals.map((r) => ({
    date: gaDate(r.dimensionValues?.[0]?.value),
    property_id: propertyId,
    total_users: num(r.metricValues?.[0]?.value),
    new_users: num(r.metricValues?.[1]?.value),
    active_users: num(r.metricValues?.[2]?.value),
    sessions: num(r.metricValues?.[3]?.value),
    engaged_sessions: num(r.metricValues?.[4]?.value),
    screen_page_views: num(r.metricValues?.[5]?.value),
    key_events: num(r.metricValues?.[6]?.value),
    synced_at: now,
  }));
  if (totalRows.length) {
    const { error } = await db.from("mi_ga4_daily_totals").upsert(totalRows, { onConflict: "date,property_id" });
    if (error) throw new Error(`GA4 Totals speichern: ${error.message}`);
    n += totalRows.length;
  }

  // 2. Traffic nach Kanal/Quelle/Medium/Kampagne/Landingpage/Geraet
  const traffic = await runReport(token, propertyId, {
    dateRanges,
    dimensions: ["date", "sessionDefaultChannelGroup", "sessionSource", "sessionMedium", "sessionCampaignName", "landingPage", "deviceCategory"].map(
      (name) => ({ name }),
    ),
    metrics: ["totalUsers", "newUsers", "sessions", "engagedSessions", "keyEvents"].map((name) => ({ name })),
  });
  const trafficMap = new Map<string, Record<string, unknown>>();
  for (const row of traffic.map((r) => {
    const d = r.dimensionValues ?? [];
    const m = r.metricValues ?? [];
    return {
      date: gaDate(d[0]?.value),
      property_id: propertyId,
      channel_group: (d[1]?.value ?? "").slice(0, 120),
      source: (d[2]?.value ?? "").slice(0, 200),
      medium: (d[3]?.value ?? "").slice(0, 120),
      campaign: (d[4]?.value ?? "").slice(0, 200),
      landing_page: (d[5]?.value ?? "").slice(0, 400),
      device_category: (d[6]?.value ?? "").slice(0, 40),
      total_users: num(m[0]?.value),
      new_users: num(m[1]?.value),
      sessions: num(m[2]?.value),
      engaged_sessions: num(m[3]?.value),
      key_events: num(m[4]?.value),
      synced_at: now,
    };
  })) {
    // Gekuerzte Werte koennen zusammenfallen: zusammenfassen statt Konflikt im Batch.
    const key = [row.date, row.channel_group, row.source, row.medium, row.campaign, row.landing_page, row.device_category].join("|");
    const e = trafficMap.get(key);
    if (!e) trafficMap.set(key, row);
    else for (const k of ["total_users", "new_users", "sessions", "engaged_sessions", "key_events"]) e[k] = (e[k] as number) + (row[k as keyof typeof row] as number);
  }
  const trafficRows = [...trafficMap.values()];
  for (let i = 0; i < trafficRows.length; i += 1000) {
    const { error } = await db
      .from("mi_ga4_daily_traffic")
      .upsert(trafficRows.slice(i, i + 1000), { onConflict: "date,property_id,channel_group,source,medium,campaign,landing_page,device_category" });
    if (error) throw new Error(`GA4 Traffic speichern: ${error.message}`);
  }
  n += trafficRows.length;

  // 3. Seiten (Titel je Pfad: der mit den meisten Aufrufen)
  const pages = await runReport(token, propertyId, {
    dateRanges,
    dimensions: [{ name: "date" }, { name: "pagePath" }, { name: "pageTitle" }],
    metrics: ["screenPageViews", "totalUsers", "userEngagementDuration", "keyEvents"].map((name) => ({ name })),
  });
  const byKey = new Map<string, { row: Record<string, unknown>; topViews: number }>();
  for (const r of pages) {
    const d = r.dimensionValues ?? [];
    const m = r.metricValues ?? [];
    const date = gaDate(d[0]?.value);
    const path = (d[1]?.value ?? "").slice(0, 400);
    const key = `${date}|${path}`;
    const views = num(m[0]?.value);
    const e = byKey.get(key);
    if (!e) {
      byKey.set(key, {
        topViews: views,
        row: {
          date,
          property_id: propertyId,
          page_path: path,
          page_title: (d[2]?.value ?? "").slice(0, 300),
          screen_page_views: views,
          total_users: num(m[1]?.value),
          user_engagement_sec: num(m[2]?.value),
          key_events: num(m[3]?.value),
          synced_at: now,
        },
      });
    } else {
      // Mehrere Titel pro Pfad: Aufrufe/Engagement summieren; Nutzer = Maximum
      // (nicht summierbar, Untergrenze statt Doppelzaehlung).
      e.row.screen_page_views = (e.row.screen_page_views as number) + views;
      e.row.total_users = Math.max(e.row.total_users as number, num(m[1]?.value));
      e.row.user_engagement_sec = (e.row.user_engagement_sec as number) + num(m[2]?.value);
      e.row.key_events = (e.row.key_events as number) + num(m[3]?.value);
      if (views > e.topViews) {
        e.topViews = views;
        e.row.page_title = (d[2]?.value ?? "").slice(0, 300);
      }
    }
  }
  const pageRows = [...byKey.values()].map((v) => v.row);
  for (let i = 0; i < pageRows.length; i += 1000) {
    const { error } = await db.from("mi_ga4_daily_pages").upsert(pageRows.slice(i, i + 1000), { onConflict: "date,property_id,page_path" });
    if (error) throw new Error(`GA4 Seiten speichern: ${error.message}`);
  }
  n += pageRows.length;
  return n;
}

export interface Ga4RangeSummary {
  totalUsers: number;
  newUsers: number;
  returningUsers: number | null;
  sessions: number;
  engagedSessions: number;
  views: number;
  keyEvents: number;
}

/** Eindeutige Nutzer fuer einen Zeitraum (nicht aus Tageswerten summierbar). */
export async function ga4RangeSummary(propertyId: string, from: string, to: string): Promise<Ga4RangeSummary> {
  const token = await googleAccessToken();
  const [tot, nvr] = await Promise.all([
    runReport(token, propertyId, {
      dateRanges: [{ startDate: from, endDate: to }],
      metrics: ["totalUsers", "newUsers", "sessions", "engagedSessions", "screenPageViews", "keyEvents"].map((name) => ({ name })),
    }),
    runReport(token, propertyId, {
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: [{ name: "newVsReturning" }],
      metrics: [{ name: "totalUsers" }],
    }),
  ]);
  const m = tot[0]?.metricValues ?? [];
  const ret = nvr.find((r) => r.dimensionValues?.[0]?.value === "returning");
  return {
    totalUsers: num(m[0]?.value),
    newUsers: num(m[1]?.value),
    returningUsers: ret ? num(ret.metricValues?.[0]?.value) : nvr.length ? 0 : null,
    sessions: num(m[2]?.value),
    engagedSessions: num(m[3]?.value),
    views: num(m[4]?.value),
    keyEvents: num(m[5]?.value),
  };
}

/**
 * Freie Zeitraum-Abfrage (fuer eindeutige Nutzer je Dimension, Geraete, Laender,
 * Staedte). Wird im Dashboard gecacht; nie bei oeffentlichen Seitenaufrufen.
 */
export async function ga4RangeReport(
  propertyId: string,
  from: string,
  to: string,
  dimensions: string[],
  metrics: string[],
  limit = 250,
): Promise<Array<{ dims: string[]; values: number[] }>> {
  const token = await googleAccessToken();
  const json = await fetchJson<Report>(`${DATA}/properties/${encodeURIComponent(propertyId)}:runReport`, {
    label: "GA4",
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      orderBys: [{ metric: { metricName: metrics[0] }, desc: true }],
      limit,
    }),
  });
  return (json.rows ?? []).map((r) => ({
    dims: (r.dimensionValues ?? []).map((d) => d.value ?? ""),
    values: (r.metricValues ?? []).map((m) => num(m.value)),
  }));
}
