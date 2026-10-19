import { fetchJson } from "./http";
import { googleAccessToken } from "./google";
import type { Admin } from "../crm";

/**
 * Google Search Console (Search Analytics), uebernommen aus eCreator Command.
 * Daten haben 2-3 Tage Verzug. Anonymisierte Suchanfragen fehlen in den
 * Detailzeilen -> Tages-Totals separat (sonst waeren Summen zu tief).
 * GSC-Klicks sind nicht dasselbe wie GA4-Sitzungen (so beschriftet).
 */

const API = "https://searchconsole.googleapis.com/webmasters/v3";
const ROW_LIMIT = 25_000;

export interface GscRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

export async function listGscSites(): Promise<Array<{ siteUrl: string; permission: string }>> {
  const token = await googleAccessToken();
  const json = await fetchJson<{ siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> }>(`${API}/sites`, {
    label: "Search Console",
    headers: { authorization: `Bearer ${token}` },
  });
  return (json.siteEntry ?? [])
    .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
    .map((s) => ({ siteUrl: s.siteUrl, permission: s.permissionLevel }));
}

async function query(token: string, site: string, body: Record<string, unknown>): Promise<GscRow[]> {
  const rows: GscRow[] = [];
  let startRow = 0;
  for (;;) {
    const json = await fetchJson<{ rows?: GscRow[] }>(`${API}/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      label: "Search Console",
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ ...body, rowLimit: ROW_LIMIT, startRow }),
    });
    const got = json.rows ?? [];
    rows.push(...got);
    if (got.length < ROW_LIMIT) break;
    startRow += ROW_LIMIT;
  }
  return rows;
}

export async function syncGsc(db: Admin, site: string, from: string, to: string): Promise<number> {
  const token = await googleAccessToken();
  const now = new Date().toISOString();

  const totals = await query(token, site, { startDate: from, endDate: to, dimensions: ["date"] });
  const totalRows = totals.map((r) => ({
    date: r.keys?.[0],
    site_url: site,
    clicks: Math.round(r.clicks ?? 0),
    impressions: Math.round(r.impressions ?? 0),
    ctr: Number((r.ctr ?? 0).toFixed(5)),
    position: Number((r.position ?? 0).toFixed(2)),
    synced_at: now,
  }));
  if (totalRows.length) {
    const { error } = await db.from("mi_gsc_daily_totals").upsert(totalRows, { onConflict: "date,site_url" });
    if (error) throw new Error(`GSC Totals: ${error.message}`);
  }

  const detail = await query(token, site, { startDate: from, endDate: to, dimensions: ["date", "page", "query"] });
  const seen = new Map<string, Record<string, unknown>>();
  for (const r of detail) {
    const page = (r.keys?.[1] ?? "").slice(0, 400);
    const q = (r.keys?.[2] ?? "").slice(0, 300);
    const key = `${r.keys?.[0]}|${page}|${q}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      date: r.keys?.[0],
      site_url: site,
      page,
      query: q,
      clicks: Math.round(r.clicks ?? 0),
      impressions: Math.round(r.impressions ?? 0),
      ctr: Number((r.ctr ?? 0).toFixed(5)),
      position: Number((r.position ?? 0).toFixed(2)),
      synced_at: now,
    });
  }
  const detailRows = [...seen.values()];
  for (let i = 0; i < detailRows.length; i += 1000) {
    const { error } = await db.from("mi_gsc_daily").upsert(detailRows.slice(i, i + 1000), { onConflict: "date,site_url,page,query" });
    if (error) throw new Error(`GSC Details: ${error.message}`);
  }
  return totalRows.length + detailRows.length;
}

/** Freie Zeitraum-Abfrage (z.B. Land, Geraet) - im Dashboard gecacht. */
export async function gscRangeReport(site: string, from: string, to: string, dimension: "country" | "device"): Promise<GscRow[]> {
  const token = await googleAccessToken();
  return query(token, site, { startDate: from, endDate: to, dimensions: [dimension] });
}
