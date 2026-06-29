import { getContext } from "./_helpers";
import { statusLabel } from "@/config/catalog";

export interface CountRow {
  key: string;
  label: string;
  total: number;
  won: number;
}
export interface OwnerPerf {
  ownerId: string | null;
  name: string;
  total: number;
  won: number;
  open: number;
  conversion: number; // 0..100
}
export interface AnalyticsOverview {
  totalLeads: number;
  won: number;
  open: number;
  conversion: number; // 0..100
  byStatus: CountRow[];
  bySource: CountRow[];
  byCampaign: CountRow[];
  byOwner: OwnerPerf[];
}

/** Abschluss-Status (zaehlen als "gewonnen"). */
const WON = new Set(["abgeschlossen", "vertrag_mail"]);
/** Terminal = nicht mehr offen. */
const TERMINAL = new Set(["abgeschlossen", "vertrag_mail", "absage", "fehleintrag", "andere"]);

const SOURCE_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  tiktok_ads: "TikTok Ads",
  google_ads: "Google Ads",
  linkedin_ads: "LinkedIn Ads",
  manual: "Manuell",
  vermittlung: "Vermittlung",
  lohnrechner: "Lohnrechner",
};

interface LeadRow {
  source: string | null;
  campaign_name: string | null;
  status_id: string | null;
  owner_id: string | null;
}

/**
 * Analytics: aggregiert die Lead-Daten zu Sales-Performance (je Mitarbeiter),
 * Kampagnen, Quellen und Status. Alles zur Laufzeit, RLS-sicher (Session).
 */
export const analyticsService = {
  async overview(): Promise<AnalyticsOverview> {
    const { supabase } = await getContext();
    const [leadsRes, statusRes, profRes] = await Promise.all([
      supabase.from("leads").select("source, campaign_name, status_id, owner_id").is("deleted_at", null),
      supabase.from("statuses").select("id, key").eq("entity_type", "lead"),
      supabase.from("profiles").select("id, full_name"),
    ]);

    const leads = (leadsRes.data ?? []) as LeadRow[];
    const keyById = new Map((statusRes.data ?? []).map((s) => [s.id as string, s.key as string]));
    const nameById = new Map((profRes.data ?? []).map((p) => [p.id as string, (p.full_name as string) ?? "—"]));

    const statusAgg = new Map<string, number>();
    const sourceAgg = new Map<string, { total: number; won: number }>();
    const campAgg = new Map<string, { total: number; won: number }>();
    const ownerAgg = new Map<string | null, { total: number; won: number; open: number }>();
    let won = 0;
    let open = 0;

    for (const l of leads) {
      const key = l.status_id ? keyById.get(l.status_id) ?? "?" : "?";
      const isWon = WON.has(key);
      const isOpen = !TERMINAL.has(key);
      if (isWon) won++;
      if (isOpen) open++;

      statusAgg.set(key, (statusAgg.get(key) ?? 0) + 1);

      const src = l.source || "unbekannt";
      const s = sourceAgg.get(src) ?? { total: 0, won: 0 };
      s.total++; if (isWon) s.won++; sourceAgg.set(src, s);

      const camp = l.campaign_name?.trim();
      if (camp) {
        const c = campAgg.get(camp) ?? { total: 0, won: 0 };
        c.total++; if (isWon) c.won++; campAgg.set(camp, c);
      }

      const o = ownerAgg.get(l.owner_id) ?? { total: 0, won: 0, open: 0 };
      o.total++; if (isWon) o.won++; if (isOpen) o.open++; ownerAgg.set(l.owner_id, o);
    }

    const total = leads.length;
    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

    const byStatus: CountRow[] = [...statusAgg.entries()]
      .map(([key, n]) => ({ key, label: statusLabel("lead", key), total: n, won: 0 }))
      .sort((a, b) => b.total - a.total);

    const bySource: CountRow[] = [...sourceAgg.entries()]
      .map(([key, v]) => ({ key, label: SOURCE_LABELS[key] ?? key, total: v.total, won: v.won }))
      .sort((a, b) => b.total - a.total);

    const byCampaign: CountRow[] = [...campAgg.entries()]
      .map(([key, v]) => ({ key, label: key, total: v.total, won: v.won }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    const byOwner: OwnerPerf[] = [...ownerAgg.entries()]
      .map(([ownerId, v]) => ({
        ownerId,
        name: ownerId ? nameById.get(ownerId) ?? "Unbekannt" : "Nicht zugewiesen",
        total: v.total,
        won: v.won,
        open: v.open,
        conversion: pct(v.won, v.total),
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totalLeads: total,
      won,
      open,
      conversion: pct(won, total),
      byStatus,
      bySource,
      byCampaign,
      byOwner,
    };
  },
};
