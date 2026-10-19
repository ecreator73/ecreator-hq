import type { ChannelMetricRow, ConversionRow, BookingRow } from "./dashboard.service";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Reine Aggregationen (keine I/O). Kosten bleiben in Micros. */

export interface CampaignAgg {
  id: string;
  platform: string;
  campaign_id: string;
  name: string;
  status: string | null;
  type: string | null;
  budget: number | null;
  currency: string;
  impressions: number;
  clicks: number;
  link_clicks: number | null;
  cost: number;
  platform_conversions: number;
  platform_leads: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cost_per_conv: number | null;
  conv_rate: number | null;
  leads: number;
  bookings: number;
  cpl: number | null;
  cpb: number | null;
}

const div = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : a / b);

/** Website-Leads einer Kampagne zuordnen: utm_campaign = Kampagnenname oder Kampagnen-ID (case-insensitiv). */
export function campaignMatcher(conv: ConversionRow[] | null, bookings: BookingRow[] | null) {
  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  return (platform: string, campaignId: string, name: string | null) => {
    const keys = new Set([norm(campaignId), norm(name)].filter(Boolean));
    const plat = (ch: string | null) => (platform === "google_ads" ? ch === "google_ads" : ch === "meta_ads" || ch === "meta_unclear");
    const leads = (conv ?? []).filter((c) => c.kind === "form" && plat(c.channel) && keys.has(norm(c.utm_campaign))).length;
    const books = (bookings ?? []).filter((b) => !b.old_invitee_uri && plat(b.channel) && keys.has(norm(b.utm_campaign))).length;
    return { leads, bookings: books };
  };
}

export function aggregateCampaigns(rows: ChannelMetricRow[], match?: ReturnType<typeof campaignMatcher>): CampaignAgg[] {
  const map = new Map<string, CampaignAgg>();
  const latest = new Map<string, string>();
  for (const r of rows) {
    const key = `${r.platform}|${r.account_id}|${r.campaign_id}`;
    let a = map.get(key);
    if (!a) {
      a = {
        id: key,
        platform: r.platform,
        campaign_id: r.campaign_id,
        name: r.campaign_name ?? r.campaign_id,
        status: r.campaign_status,
        type: r.campaign_type,
        budget: r.budget_micros,
        currency: r.currency,
        impressions: 0,
        clicks: 0,
        link_clicks: r.link_clicks == null ? null : 0,
        cost: 0,
        platform_conversions: 0,
        platform_leads: r.platform_leads == null ? null : 0,
        ctr: null,
        cpc: null,
        cpm: null,
        cost_per_conv: null,
        conv_rate: null,
        leads: 0,
        bookings: 0,
        cpl: null,
        cpb: null,
      };
      map.set(key, a);
    }
    // Status/Name/Budget vom juengsten Tag
    if (!latest.has(key) || r.date > latest.get(key)!) {
      latest.set(key, r.date);
      a.name = r.campaign_name ?? a.name;
      a.status = r.campaign_status;
      a.budget = r.budget_micros;
    }
    a.impressions += r.impressions;
    a.clicks += r.clicks;
    if (r.link_clicks != null) a.link_clicks = (a.link_clicks ?? 0) + r.link_clicks;
    a.cost += r.cost_micros;
    a.platform_conversions += r.platform_conversions;
    if (r.platform_leads != null) a.platform_leads = (a.platform_leads ?? 0) + r.platform_leads;
  }
  for (const a of map.values()) {
    a.ctr = div(a.clicks, a.impressions);
    a.cpc = div(a.cost, a.clicks);
    a.cpm = a.impressions ? (a.cost / a.impressions) * 1000 : null;
    a.cost_per_conv = div(a.cost, a.platform_conversions);
    a.conv_rate = div(a.platform_conversions, a.clicks);
    if (match) {
      const m = match(a.platform, a.campaign_id, a.name);
      a.leads = m.leads;
      a.bookings = m.bookings;
      a.cpl = div(a.cost, a.leads);
      a.cpb = div(a.cost, a.bookings);
    }
  }
  return [...map.values()];
}

export function sumCampaigns(list: CampaignAgg[]) {
  const t = list.reduce(
    (s, a) => ({
      impressions: s.impressions + a.impressions,
      clicks: s.clicks + a.clicks,
      cost: s.cost + (a.currency === "CHF" ? a.cost : 0),
      conv: s.conv + a.platform_conversions,
      leads: s.leads + a.leads,
      bookings: s.bookings + a.bookings,
    }),
    { impressions: 0, clicks: 0, cost: 0, conv: 0, leads: 0, bookings: 0 },
  );
  return { ...t, ctr: div(t.clicks, t.impressions), cpc: div(t.cost, t.clicks), costPerConv: div(t.cost, t.conv), cpl: div(t.cost, t.leads), cpb: div(t.cost, t.bookings) };
}

/** Ad-/Keyword-Zeilen ueber Tage zusammenfassen. */
export function aggregateBy(rows: any[], keyOf: (r: any) => string, base: (r: any) => Record<string, unknown>) {
  const map = new Map<string, any>();
  for (const r of rows) {
    const k = keyOf(r);
    let a = map.get(k);
    if (!a) map.set(k, (a = { id: k, ...base(r), impressions: 0, clicks: 0, cost: 0, conv: 0, reach: null as number | null, link_clicks: null as number | null }));
    a.impressions += Number(r.impressions ?? 0);
    a.clicks += Number(r.clicks ?? 0);
    a.cost += Number(r.cost_micros ?? 0);
    a.conv += Number(r.platform_conversions ?? 0);
    if (r.link_clicks != null) a.link_clicks = (a.link_clicks ?? 0) + Number(r.link_clicks);
  }
  for (const a of map.values()) {
    a.ctr = div(a.clicks, a.impressions);
    a.cpc = div(a.cost, a.clicks);
    a.cost_per_conv = div(a.cost, a.conv);
  }
  return [...map.values()];
}
