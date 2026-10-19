import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getContext } from "@/server/services/_helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDays, utcBounds, zurichDay, type DayRange } from "@/lib/marketing/range";
import { channelGroup } from "@/lib/marketing/channels";
import { getIntegration, googleEnv, type CalendlyConfig, type GoogleConfig, type MetaAdsConfig } from "./integrations";
import { ga4RangeReport, ga4RangeSummary, type Ga4RangeSummary } from "./providers/ga4";
import { gscRangeReport } from "./providers/gsc";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Lesende Abfragen des Marketing-Dashboards. Laeuft mit der Session des
 * Nutzers (RLS: Marketing-Tabellen nur super_admin/ceo/cso). Keine
 * erfundenen Werte: fehlt eine Quelle, liefert die Funktion `null` und die
 * Oberflaeche zeigt «Integration erforderlich» bzw. «Keine Daten verfuegbar».
 */

const MAX_ROWS = 20_000;

/* ------------------------------------------------------------------------ */
/* Integrationen / Frische                                                   */
/* ------------------------------------------------------------------------ */

export type SourceKey = "website" | "calendly" | "ga4" | "google_ads" | "gsc" | "meta_ads";

export interface SourceStatus {
  key: SourceKey;
  label: string;
  state: "connected" | "setup_required" | "error" | "pending";
  detail: string;
  lastSyncAt: string | null;
  lastEventAt: string | null;
  lastError: string | null;
  lastRunStatus: string | null;
}

export const getSourceStatuses = cache(async (): Promise<Record<SourceKey, SourceStatus>> => {
  const db = createAdminClient();
  const [google, calendly, meta, runsRes, lastLead] = await Promise.all([
    getIntegration<GoogleConfig>("google"),
    getIntegration<CalendlyConfig>("calendly"),
    getIntegration<MetaAdsConfig>("meta_ads"),
    db.from("mi_sync_runs").select("provider, status, started_at, finished_at, error").order("started_at", { ascending: false }).limit(60),
    db.from("mi_conversion_events").select("received_at").not("external_id", "is", null).order("received_at", { ascending: false }).limit(1),
  ]);
  const runs = (runsRes.data ?? []) as Array<{ provider: string; status: string; finished_at: string | null; error: string | null }>;
  const lastRun = (p: string) => runs.find((r) => r.provider === p) ?? null;
  const lastOk = (p: string) => runs.find((r) => r.provider === p && r.status === "ok")?.finished_at ?? null;
  const env = googleEnv();
  const gConnected = Boolean(google?.has_credentials && google.status !== "disconnected");

  const googleSource = (key: "ga4" | "google_ads" | "gsc", label: string, configured: boolean, missing: string): SourceStatus => {
    const run = lastRun(key);
    let state: SourceStatus["state"] = "setup_required";
    let detail = missing;
    if (!env) detail = "Google-OAuth-Client fehlt (GOOGLE_OAUTH_CLIENT_ID/SECRET)";
    else if (!gConnected) detail = "Google-Konto nicht verbunden";
    else if (google?.status === "error") {
      state = "error";
      detail = google.last_error ?? "Zugang fehlerhaft";
    } else if (configured) {
      state = run?.status === "error" ? "error" : lastOk(key) ? "connected" : "pending";
      detail = state === "pending" ? "Daten werden synchronisiert" : state === "error" ? run?.error ?? "Abgleich fehlgeschlagen" : "Verbunden";
    }
    return { key, label, state, detail, lastSyncAt: lastOk(key), lastEventAt: null, lastError: run?.status === "error" ? run.error : null, lastRunStatus: run?.status ?? null };
  };

  const adsConfigured = Boolean(google?.config.ads_customer_id && env?.developerToken);
  const metaRun = lastRun("meta_ads");
  const metaConfigured = Boolean(meta?.has_credentials && meta.config.ad_account_id);

  return {
    website: {
      key: "website",
      label: "Website-Formulare",
      state: process.env.WEBSITE_LEAD_SECRET ? "connected" : "setup_required",
      detail: process.env.WEBSITE_LEAD_SECRET ? "Signierter Lead-Eingang aktiv" : "WEBSITE_LEAD_SECRET fehlt",
      lastSyncAt: null,
      lastEventAt: (lastLead.data?.[0] as any)?.received_at ?? null,
      lastError: null,
      lastRunStatus: null,
    },
    calendly: {
      key: "calendly",
      label: "Calendly",
      state: !calendly?.has_credentials ? "setup_required" : calendly.status === "error" ? "error" : calendly.webhook_verified ? "connected" : "pending",
      detail: !calendly?.has_credentials
        ? "Calendly-Token fehlt"
        : calendly.webhook_verified
          ? "Webhook aktiv (Buchung, Absage, Verschiebung)"
          : "Webhook noch nicht registriert",
      lastSyncAt: calendly?.last_sync_at ?? null,
      lastEventAt: calendly?.webhook_last_event_at ?? null,
      lastError: calendly?.last_error ?? null,
      lastRunStatus: null,
    },
    ga4: googleSource("ga4", "Google Analytics 4", Boolean(google?.config.ga4_property_id), "Keine GA4-Property gewaehlt"),
    google_ads: googleSource(
      "google_ads",
      "Google Ads",
      adsConfigured,
      !env?.developerToken ? "Developer-Token fehlt (GOOGLE_ADS_DEVELOPER_TOKEN)" : "Kein Google-Ads-Konto gewaehlt",
    ),
    gsc: googleSource("gsc", "Search Console", Boolean(google?.config.gsc_site_url), "Keine Search-Console-Property gewaehlt"),
    meta_ads: {
      key: "meta_ads",
      label: "Meta Ads",
      state: !metaConfigured ? "setup_required" : metaRun?.status === "error" ? "error" : lastOk("meta_ads") ? "connected" : "pending",
      detail: !meta?.has_credentials
        ? "Token mit ads_read fehlt"
        : !meta.config.ad_account_id
          ? "Kein Werbekonto gewaehlt"
          : metaRun?.status === "error"
            ? metaRun.error ?? "Abgleich fehlgeschlagen"
            : lastOk("meta_ads")
              ? "Verbunden"
              : "Daten werden synchronisiert",
      lastSyncAt: lastOk("meta_ads"),
      lastEventAt: null,
      lastError: metaRun?.status === "error" ? metaRun.error : null,
      lastRunStatus: metaRun?.status ?? null,
    },
  };
});

/* ------------------------------------------------------------------------ */
/* First-Party: Conversions, Leads, Buchungen                                */
/* ------------------------------------------------------------------------ */

export interface ConversionRow {
  id: string;
  occurred_at: string;
  kind: string;
  form_type: string | null;
  form_name: string | null;
  channel: string;
  attribution_confidence: string;
  lead_id: string | null;
  landing_page: string | null;
  page_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  service: string | null;
  is_duplicate: boolean;
  booking_id: string | null;
  external_id: string | null;
  first_seen_at: string | null;
}

const CONV_COLS =
  "id, occurred_at, kind, form_type, form_name, channel, attribution_confidence, lead_id, landing_page, page_url, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, fbclid, service, is_duplicate, booking_id, external_id, first_seen_at";

export async function listConversions(range: DayRange, opts: { includeDuplicates?: boolean } = {}): Promise<ConversionRow[] | null> {
  const { supabase } = await getContext();
  const { start, end } = utcBounds(range);
  let q = supabase.from("mi_conversion_events").select(CONV_COLS).gte("occurred_at", start).lt("occurred_at", end).order("occurred_at", { ascending: false }).limit(MAX_ROWS);
  if (!opts.includeDuplicates) q = q.eq("is_duplicate", false);
  const { data, error } = await q;
  if (error) return null; // Tabelle fehlt (Migration) oder keine Rechte
  return (data ?? []) as ConversionRow[];
}

export interface BookingRow {
  id: string;
  calendly_invitee_uri: string;
  event_name: string | null;
  invitee_name: string | null;
  invitee_email: string | null;
  status: string;
  booked_at: string | null;
  start_time: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  rescheduled: boolean;
  old_invitee_uri: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
  page_url: string | null;
  channel: string | null;
  attribution_status: string;
  received_via: string[];
  lead_id: string | null;
}

export async function listBookings(range: DayRange): Promise<BookingRow[] | null> {
  const { supabase } = await getContext();
  const { start, end } = utcBounds(range);
  const { data, error } = await supabase
    .from("mi_bookings")
    .select(
      "id, calendly_invitee_uri, event_name, invitee_name, invitee_email, status, booked_at, start_time, canceled_at, cancel_reason, rescheduled, old_invitee_uri, utm_source, utm_medium, utm_campaign, landing_page, page_url, channel, attribution_status, received_via, lead_id",
    )
    .gte("booked_at", start)
    .lt("booked_at", end)
    .order("booked_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) return null;
  return (data ?? []) as BookingRow[];
}

/** Neue (nicht verschobene) Buchungen = gezaehlte Buchungen. */
export function countableBookings(rows: BookingRow[]): BookingRow[] {
  return rows.filter((b) => !b.old_invitee_uri);
}

/* ------------------------------------------------------------------------ */
/* Plattform-Kennzahlen                                                      */
/* ------------------------------------------------------------------------ */

export interface ChannelMetricRow {
  date: string;
  platform: string;
  account_id: string;
  campaign_id: string;
  campaign_name: string | null;
  campaign_status: string | null;
  campaign_type: string | null;
  budget_micros: number | null;
  currency: string;
  impressions: number;
  clicks: number;
  link_clicks: number | null;
  reach: number | null;
  cost_micros: number;
  platform_conversions: number;
  platform_leads: number | null;
  conversion_value: number | null;
}

export async function listChannelMetrics(range: DayRange, platform?: "google_ads" | "meta_ads"): Promise<ChannelMetricRow[] | null> {
  const { supabase } = await getContext();
  let q = supabase.from("mi_daily_channel_metrics").select("*").gte("date", range.from).lte("date", range.to).limit(MAX_ROWS);
  if (platform) q = q.eq("platform", platform);
  const { data, error } = await q;
  if (error) return null;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    impressions: Number(r.impressions),
    clicks: Number(r.clicks),
    cost_micros: Number(r.cost_micros),
    link_clicks: r.link_clicks == null ? null : Number(r.link_clicks),
    reach: r.reach == null ? null : Number(r.reach),
    budget_micros: r.budget_micros == null ? null : Number(r.budget_micros),
    platform_conversions: Number(r.platform_conversions),
    platform_leads: r.platform_leads == null ? null : Number(r.platform_leads),
    conversion_value: r.conversion_value == null ? null : Number(r.conversion_value),
  })) as ChannelMetricRow[];
}

/** Kosten je Plattform; nur CHF wird summiert, andere Waehrungen werden gemeldet. */
export function spendSummary(rows: ChannelMetricRow[]) {
  const out = { google: 0, meta: 0, total: 0, otherCurrencies: [] as string[] };
  const other = new Set<string>();
  for (const r of rows) {
    if (r.currency && r.currency !== "CHF") {
      other.add(r.currency);
      continue;
    }
    if (r.platform === "google_ads") out.google += r.cost_micros;
    if (r.platform === "meta_ads") out.meta += r.cost_micros;
    out.total += r.cost_micros;
  }
  out.otherCurrencies = [...other];
  return out;
}

export async function listAdMetrics(range: DayRange, platform: "google_ads" | "meta_ads"): Promise<any[] | null> {
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("mi_daily_ad_metrics").select("*").eq("platform", platform).gte("date", range.from).lte("date", range.to).limit(MAX_ROWS);
  return error ? null : (data ?? []);
}

export async function listKeywordMetrics(range: DayRange): Promise<any[] | null> {
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("mi_daily_keyword_metrics").select("*").gte("date", range.from).lte("date", range.to).limit(MAX_ROWS);
  return error ? null : (data ?? []);
}

/* ------------------------------------------------------------------------ */
/* GA4 / Search Console                                                      */
/* ------------------------------------------------------------------------ */

export async function listGa4Totals(range: DayRange): Promise<any[] | null> {
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("mi_ga4_daily_totals").select("*").gte("date", range.from).lte("date", range.to).order("date").limit(MAX_ROWS);
  return error ? null : (data ?? []).map((r: any) => ({ ...r, total_users: +r.total_users, new_users: +r.new_users, sessions: +r.sessions, engaged_sessions: +r.engaged_sessions, screen_page_views: +r.screen_page_views, key_events: +r.key_events }));
}

export async function listGa4Traffic(range: DayRange): Promise<any[] | null> {
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("mi_ga4_daily_traffic").select("*").gte("date", range.from).lte("date", range.to).limit(MAX_ROWS);
  return error ? null : (data ?? []).map((r: any) => ({ ...r, sessions: +r.sessions, engaged_sessions: +r.engaged_sessions, total_users: +r.total_users, new_users: +r.new_users, key_events: +r.key_events }));
}

export async function listGa4Pages(range: DayRange): Promise<any[] | null> {
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("mi_ga4_daily_pages").select("*").gte("date", range.from).lte("date", range.to).limit(MAX_ROWS);
  return error ? null : (data ?? []).map((r: any) => ({ ...r, screen_page_views: +r.screen_page_views, total_users: +r.total_users, user_engagement_sec: +r.user_engagement_sec, key_events: +r.key_events }));
}

export async function listGscTotals(range: DayRange): Promise<any[] | null> {
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("mi_gsc_daily_totals").select("*").gte("date", range.from).lte("date", range.to).order("date").limit(MAX_ROWS);
  return error ? null : (data ?? []).map((r: any) => ({ ...r, clicks: +r.clicks, impressions: +r.impressions, ctr: +r.ctr, position: +r.position }));
}

export async function listGscDetail(range: DayRange): Promise<any[] | null> {
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("mi_gsc_daily").select("page, query, clicks, impressions, position").gte("date", range.from).lte("date", range.to).limit(MAX_ROWS);
  return error ? null : (data ?? []).map((r: any) => ({ ...r, clicks: +r.clicks, impressions: +r.impressions, position: +r.position }));
}

/** Eindeutige Nutzer im Zeitraum (GA4-Abfrage, 1 h gecacht). null = nicht verfuegbar. */
export async function ga4Summary(range: DayRange): Promise<Ga4RangeSummary | null> {
  const google = await getIntegration<GoogleConfig>("google");
  const pid = google?.config.ga4_property_id;
  if (!pid || !google?.has_credentials) return null;
  const load = unstable_cache(
    async () => {
      try {
        return await ga4RangeSummary(pid, range.from, range.to);
      } catch {
        return null;
      }
    },
    ["mi-ga4-summary", pid, range.from, range.to],
    { revalidate: 3600 },
  );
  return load();
}

/** Freie GA4-Zeitraumabfrage (1 h gecacht). null = GA4 nicht verbunden oder Fehler. */
export async function ga4Report(range: DayRange, dimensions: string[], metrics: string[], limit = 250): Promise<Array<{ dims: string[]; values: number[] }> | null> {
  const google = await getIntegration<GoogleConfig>("google");
  const pid = google?.config.ga4_property_id;
  if (!pid || !google?.has_credentials) return null;
  const load = unstable_cache(
    async () => {
      try {
        return await ga4RangeReport(pid, range.from, range.to, dimensions, metrics, limit);
      } catch {
        return null;
      }
    },
    ["mi-ga4-report", pid, range.from, range.to, dimensions.join(","), metrics.join(","), String(limit)],
    { revalidate: 3600 },
  );
  return load();
}

/** Search Console nach Land/Geraet (1 h gecacht). */
export async function gscReport(range: DayRange, dimension: "country" | "device"): Promise<Array<{ key: string; clicks: number; impressions: number; ctr: number; position: number }> | null> {
  const google = await getIntegration<GoogleConfig>("google");
  const site = google?.config.gsc_site_url;
  if (!site || !google?.has_credentials) return null;
  const load = unstable_cache(
    async () => {
      try {
        const rows = await gscRangeReport(site, range.from, range.to, dimension);
        return rows.map((r) => ({ key: r.keys?.[0] ?? "", clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: r.position ?? 0 }));
      } catch {
        return null;
      }
    },
    ["mi-gsc-report", site, range.from, range.to, dimension],
    { revalidate: 3600 },
  );
  return load();
}

/* ------------------------------------------------------------------------ */
/* Uebersicht                                                                */
/* ------------------------------------------------------------------------ */

export interface PeriodKpis {
  formLeads: number | null;
  bookings: number | null;
  bookingsActive: number | null;
  conversions: number | null;
  uniqueLeads: number | null;
  users: number | null;
  newUsers: number | null;
  returningUsers: number | null;
  sessions: number | null;
  views: number | null;
  organicSessions: number | null;
  paidSessions: number | null;
  spendGoogle: number | null;
  spendMeta: number | null;
  spendTotal: number | null;
  otherCurrencies: string[];
  paidLeads: number | null;
  organicLeads: number | null;
  directLeads: number | null;
  socialLeads: number | null;
}

export interface DailyPoint {
  day: string;
  users: number | null;
  sessions: number | null;
  leads: number;
  bookings: number;
  spend: number | null; // micros
  spendGoogle: number | null;
  spendMeta: number | null;
  organicSessions: number | null;
  paidSessions: number | null;
}

const PAID_GROUPS = new Set(["Paid Search", "Paid Social", "Paid Shopping", "Paid Video", "Paid Other", "Display", "Cross-network"]);

export async function periodKpis(range: DayRange, flags: { ga4: boolean; ads: boolean }): Promise<{ kpis: PeriodKpis; daily: DailyPoint[] }> {
  const [conv, book, metrics, totals, traffic, summary] = await Promise.all([
    listConversions(range),
    listBookings(range),
    flags.ads ? listChannelMetrics(range) : Promise.resolve(null),
    flags.ga4 ? listGa4Totals(range) : Promise.resolve(null),
    flags.ga4 ? listGa4Traffic(range) : Promise.resolve(null),
    flags.ga4 ? ga4Summary(range) : Promise.resolve(null),
  ]);

  const forms = conv?.filter((c) => c.kind === "form") ?? null;
  const counted = book ? countableBookings(book) : null;
  const leadsBy = (g: string) => (conv ? conv.filter((c) => channelGroup(c.channel) === g).length : null);
  const spend = metrics && metrics.length ? spendSummary(metrics) : null;

  const sumTraffic = (pred: (cg: string) => boolean) => (traffic && traffic.length ? traffic.filter((t) => pred(t.channel_group)).reduce((s, t) => s + t.sessions, 0) : null);

  const kpis: PeriodKpis = {
    formLeads: forms ? forms.length : null,
    bookings: counted ? counted.length : null,
    bookingsActive: counted ? counted.filter((b) => b.status === "active").length : null,
    conversions: conv ? conv.length : null,
    uniqueLeads: conv ? new Set(conv.map((c) => c.lead_id).filter(Boolean)).size : null,
    users: summary?.totalUsers ?? null,
    newUsers: summary?.newUsers ?? null,
    returningUsers: summary?.returningUsers ?? null,
    sessions: summary?.sessions ?? (totals && totals.length ? totals.reduce((s, t) => s + t.sessions, 0) : null),
    views: summary?.views ?? (totals && totals.length ? totals.reduce((s, t) => s + t.screen_page_views, 0) : null),
    organicSessions: sumTraffic((cg) => cg === "Organic Search"),
    paidSessions: sumTraffic((cg) => PAID_GROUPS.has(cg)),
    spendGoogle: spend ? spend.google : null,
    spendMeta: spend ? spend.meta : null,
    spendTotal: spend ? spend.total : null,
    otherCurrencies: spend?.otherCurrencies ?? [],
    paidLeads: leadsBy("paid"),
    organicLeads: leadsBy("organic"),
    directLeads: leadsBy("direct"),
    socialLeads: leadsBy("social"),
  };

  const days = listDays(range);
  const byDay = new Map<string, DailyPoint>(
    days.map((d) => [d, { day: d, users: totals ? 0 : null, sessions: totals ? 0 : null, leads: 0, bookings: 0, spend: metrics ? 0 : null, spendGoogle: metrics ? 0 : null, spendMeta: metrics ? 0 : null, organicSessions: traffic ? 0 : null, paidSessions: traffic ? 0 : null }]),
  );
  for (const c of conv ?? []) {
    const p = byDay.get(zurichDay(c.occurred_at));
    if (p) p.leads++;
  }
  for (const b of counted ?? []) {
    const p = b.booked_at ? byDay.get(zurichDay(b.booked_at)) : null;
    if (p) p.bookings++;
  }
  for (const t of totals ?? []) {
    const p = byDay.get(t.date);
    if (p) {
      p.users = (p.users ?? 0) + t.total_users;
      p.sessions = (p.sessions ?? 0) + t.sessions;
    }
  }
  for (const t of traffic ?? []) {
    const p = byDay.get(t.date);
    if (!p) continue;
    if (t.channel_group === "Organic Search") p.organicSessions = (p.organicSessions ?? 0) + t.sessions;
    if (PAID_GROUPS.has(t.channel_group)) p.paidSessions = (p.paidSessions ?? 0) + t.sessions;
  }
  for (const m of metrics ?? []) {
    if (m.currency !== "CHF") continue;
    const p = byDay.get(m.date);
    if (!p) continue;
    p.spend = (p.spend ?? 0) + m.cost_micros;
    if (m.platform === "google_ads") p.spendGoogle = (p.spendGoogle ?? 0) + m.cost_micros;
    if (m.platform === "meta_ads") p.spendMeta = (p.spendMeta ?? 0) + m.cost_micros;
  }
  return { kpis, daily: [...byDay.values()] };
}

/* ------------------------------------------------------------------------ */
/* Leads                                                                     */
/* ------------------------------------------------------------------------ */

export interface MarketingLead {
  id: string;
  contact_name: string | null;
  company_name: string;
  email: string | null;
  phone: string | null;
  dienstleistung: string | null;
  form_name: string | null;
  form_type: string | null;
  ft_channel: string | null;
  ft_campaign: string | null;
  ft_landing_page: string | null;
  lt_channel: string | null;
  attribution_confidence: string | null;
  conversion_page: string | null;
  converted_at: string | null;
  created_at: string;
  next_action_date: string | null;
  status: { key: string; label: string; color: string } | null;
  owner: { id: string; full_name: string | null } | null;
}

export async function listMarketingLeads(range: DayRange, f: { q?: string; channel?: string; status?: string; form?: string } = {}): Promise<MarketingLead[] | null> {
  const { supabase } = await getContext();
  const { start, end } = utcBounds(range);
  let q = supabase
    .from("leads")
    .select(
      "id, contact_name, company_name, email, phone, dienstleistung, form_name, form_type, ft_channel, ft_campaign, ft_landing_page, lt_channel, attribution_confidence, conversion_page, converted_at, created_at, next_action_date, status:statuses!leads_status_id_fkey(key,label,color), owner:profiles!leads_owner_id_fkey(id,full_name)",
    )
    .is("deleted_at", null)
    .not("form_type", "is", null)
    .gte("converted_at", start)
    .lt("converted_at", end)
    .order("converted_at", { ascending: false })
    .limit(2000);
  if (f.channel) q = q.eq("ft_channel", f.channel);
  if (f.form) q = q.eq("form_type", f.form);
  if (f.q) {
    const s = f.q.replace(/[%,()]/g, " ").trim();
    if (s) q = q.or(`contact_name.ilike.%${s}%,company_name.ilike.%${s}%,email.ilike.%${s}%,ft_campaign.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) return null;
  let rows = (data ?? []) as unknown as MarketingLead[];
  if (f.status) rows = rows.filter((r) => r.status?.key === f.status);
  return rows;
}

export async function getMarketingLead(id: string) {
  const { supabase } = await getContext();
  const { data: lead } = await supabase
    .from("leads")
    .select("*, status:statuses!leads_status_id_fkey(key,label,color), owner:profiles!leads_owner_id_fkey(id,full_name)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!lead) return null;
  const [events, bookings, activities, contact] = await Promise.all([
    supabase.from("mi_conversion_events").select("*").eq("lead_id", id).order("occurred_at", { ascending: false }),
    supabase.from("mi_bookings").select("*").eq("lead_id", id).order("booked_at", { ascending: false }),
    supabase.from("sales_activities").select("id, type, subject, body, activity_date").eq("lead_id", id).order("activity_date", { ascending: false }).limit(50),
    (lead as any).contact_id
      ? supabase.from("contacts").select("id, first_name, last_name, email, phone, company_name, client_id").eq("id", (lead as any).contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    lead: lead as any,
    events: (events.data ?? []) as any[],
    bookings: (bookings.data ?? []) as any[],
    activities: (activities.data ?? []) as any[],
    contact: (contact.data ?? null) as any,
  };
}

/* ------------------------------------------------------------------------ */
/* Live-Aktivitaet                                                           */
/* ------------------------------------------------------------------------ */

export interface ActivityRow {
  id: string;
  occurred_at: string;
  type: string;
  severity: string;
  source: string | null;
  title: string;
  detail: string | null;
  lead_id: string | null;
  booking_id: string | null;
  campaign: string | null;
  status: string | null;
}

export async function listActivity(opts: { limit?: number; type?: string; severity?: string } = {}): Promise<ActivityRow[] | null> {
  const { supabase } = await getContext();
  let q = supabase.from("mi_activity_log").select("*").order("occurred_at", { ascending: false }).limit(opts.limit ?? 100);
  if (opts.type) q = q.eq("type", opts.type);
  if (opts.severity) q = q.eq("severity", opts.severity);
  const { data, error } = await q;
  return error ? null : ((data ?? []) as ActivityRow[]);
}

export async function listSyncRuns(limit = 50): Promise<any[] | null> {
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("mi_sync_runs").select("*").order("started_at", { ascending: false }).limit(limit);
  return error ? null : (data ?? []);
}

/** Ist die Migration 0023 eingespielt? (sonst klare Meldung statt leerer Seiten) */
export const schemaReady = cache(async (): Promise<boolean> => {
  try {
    const { supabase } = await getContext();
    const { error } = await supabase.from("mi_activity_log").select("id", { head: true, count: "exact" }).limit(1);
    return !error;
  } catch {
    return false;
  }
});
