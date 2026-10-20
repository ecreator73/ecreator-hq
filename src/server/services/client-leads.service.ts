import { getContext } from "./_helpers";
import { CLIENT_LEAD_GROUPS, type ClientLeadGroup } from "@/lib/client-lead-status";

/**
 * Kunden-Leads (Leads aus Kampagnen fuer Kunden, aus Lovable `external_leads`):
 * Kennzahlen je Kunde/Zeitraum, Monatsverlauf, Kampagnen, Rohstatus.
 * Liest mit der Session (RLS: Leitung + Projektleitung).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ClientLeadRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: ClientLeadGroup;
  status_raw: string | null;
  campaign_name: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientLeadSummary {
  total: number;
  last7: number;
  last30: number;
  last90: number;
  byGroup: Record<string, number>;
  months: Array<{ month: string; total: number; byGroup: Record<string, number> }>;
  campaigns: Array<{ campaign: string; total: number; hot: number; won: number; wrong: number }>;
  rawStatuses: Array<{ raw: string; count: number; group: ClientLeadGroup }>;
  medianHoursToWork: number | null;
  within24h: number | null;
  recent: ClientLeadRow[];
}

const DAY = 86_400_000;

export function summarize(rows: ClientLeadRow[], now = Date.now()): ClientLeadSummary {
  const byGroup: Record<string, number> = Object.fromEntries(CLIENT_LEAD_GROUPS.map((g) => [g.key, 0]));
  const months = new Map<string, Record<string, number>>();
  const camp = new Map<string, { total: number; hot: number; won: number; wrong: number }>();
  const raw = new Map<string, { count: number; group: ClientLeadGroup }>();
  const hours: number[] = [];
  for (const r of rows) {
    byGroup[r.status] = (byGroup[r.status] ?? 0) + 1;
    const m = r.created_at.slice(0, 7);
    const mg = months.get(m) ?? {};
    mg[r.status] = (mg[r.status] ?? 0) + 1;
    months.set(m, mg);
    const k = r.campaign_name?.trim() || "Ohne Kampagne";
    const c = camp.get(k) ?? { total: 0, hot: 0, won: 0, wrong: 0 };
    c.total++;
    if (r.status === "hot") c.hot++;
    if (r.status === "won") c.won++;
    if (r.status === "wrong") c.wrong++;
    camp.set(k, c);
    const rk = r.status_raw ?? "(leer)";
    const rr = raw.get(rk) ?? { count: 0, group: r.status };
    rr.count++;
    raw.set(rk, rr);
    // Bearbeitungszeit: Eingang bis letzte Aenderung (nur bearbeitete Leads, Naeherung)
    if (r.status !== "neu") {
      const h = (Date.parse(r.updated_at) - Date.parse(r.created_at)) / 3_600_000;
      if (h > 0 && h < 24 * 120) hours.push(h);
    }
  }
  hours.sort((a, b) => a - b);
  const monthList = [...months.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, g]) => ({ month, total: Object.values(g).reduce((s, n) => s + n, 0), byGroup: g }));
  return {
    total: rows.length,
    last7: rows.filter((r) => now - Date.parse(r.created_at) < 7 * DAY).length,
    last30: rows.filter((r) => now - Date.parse(r.created_at) < 30 * DAY).length,
    last90: rows.filter((r) => now - Date.parse(r.created_at) < 90 * DAY).length,
    byGroup,
    months: monthList,
    campaigns: [...camp.entries()].map(([campaign, v]) => ({ campaign, ...v })).sort((a, b) => b.total - a.total),
    rawStatuses: [...raw.entries()].map(([r, v]) => ({ raw: r, ...v })).sort((a, b) => b.count - a.count),
    medianHoursToWork: hours.length ? hours[Math.floor(hours.length / 2)]! : null,
    within24h: hours.length ? hours.filter((h) => h <= 24).length / hours.length : null,
    recent: rows.slice(0, 100),
  };
}

const COLS = "id, name, email, phone, status, status_raw, campaign_name, source, created_at, updated_at";

export const clientLeadsService = {
  async listByClient(clientId: string, range?: { from?: string; to?: string }): Promise<ClientLeadRow[]> {
    const { supabase } = await getContext();
    const out: ClientLeadRow[] = [];
    for (let from = 0; from < 20_000; from += 1000) {
      let q = supabase.from("client_leads").select(COLS).eq("client_id", clientId).order("created_at", { ascending: false }).range(from, from + 999);
      if (range?.from) q = q.gte("created_at", range.from);
      if (range?.to) q = q.lt("created_at", range.to);
      const { data, error } = await q;
      if (error) break;
      out.push(...((data ?? []) as any[]));
      if (!data || data.length < 1000) break;
    }
    return out;
  },

  /** Anzahl je Kunde (fuer Liste/Dashboard), optional ab Datum. */
  async countsByClient(since?: string): Promise<Map<string, number>> {
    const { supabase } = await getContext();
    const counts = new Map<string, number>();
    for (let from = 0; from < 50_000; from += 1000) {
      let q = supabase.from("client_leads").select("client_id").not("client_id", "is", null).range(from, from + 999);
      if (since) q = q.gte("created_at", since);
      const { data, error } = await q;
      if (error) break;
      for (const r of (data ?? []) as Array<{ client_id: string }>) counts.set(r.client_id, (counts.get(r.client_id) ?? 0) + 1);
      if (!data || data.length < 1000) break;
    }
    return counts;
  },

  /** Alle Kunden-Leads (ohne Personendaten) fuer die Gesamtstatistik. */
  async overview(): Promise<Array<{ client_id: string | null; external_client_name: string | null; status: ClientLeadGroup; status_raw: string | null; campaign_name: string | null; created_at: string; updated_at: string }>> {
    const { supabase } = await getContext();
    const out: any[] = [];
    for (let from = 0; from < 50_000; from += 1000) {
      const { data, error } = await supabase
        .from("client_leads")
        .select("client_id, external_client_name, status, status_raw, campaign_name, created_at, updated_at")
        .order("created_at", { ascending: false })
        .range(from, from + 999);
      if (error) break;
      out.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return out;
  },
};

export interface ContractItem {
  id: string;
  contract_id: string;
  description: string;
  detail: string | null;
  quantity: number;
  unit_price: number;
  recurring: boolean;
}

export interface OnboardingSubmission {
  id: string;
  client_id: string | null;
  status: "open" | "closed";
  company: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  website: string | null;
  industry: string | null;
  region: string | null;
  monthly_ad_budget: string | null;
  services: string[];
  answers: Record<string, unknown>;
  files?: Array<{ path: string; name: string; size: number }>;
  created_at: string;
}

export interface PricingItem {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  unit: string | null;
  unit_price: number | null;
  recurring: boolean;
  price_on_request: boolean | null;
  package: string | null;
  active: boolean;
  sort_order: number | null;
}

/** Vertragspositionen, Onboarding-Einsendungen, Produkte (Kunden-CRM). */
export const clientCrmService = {
  async contractItems(contractIds: string[]): Promise<ContractItem[]> {
    if (!contractIds.length) return [];
    const { supabase } = await getContext();
    const { data } = await supabase
      .from("document_items")
      .select("id, contract_id, description, detail, quantity, unit_price, recurring")
      .in("contract_id", contractIds)
      .order("sort_order", { ascending: true });
    return ((data ?? []) as any[]).map((r) => ({ ...r, quantity: Number(r.quantity), unit_price: Number(r.unit_price) }));
  },

  async onboardingSubmissions(): Promise<OnboardingSubmission[]> {
    const { supabase } = await getContext();
    const { data } = await supabase.from("client_onboarding_submissions").select("*").order("created_at", { ascending: false }).limit(500);
    return (data ?? []) as OnboardingSubmission[];
  },

  async pricingItems(): Promise<PricingItem[]> {
    const { supabase } = await getContext();
    const { data } = await supabase.from("pricing_items").select("*").order("sort_order", { ascending: true, nullsFirst: false }).order("name");
    return (data ?? []) as PricingItem[];
  },
};
