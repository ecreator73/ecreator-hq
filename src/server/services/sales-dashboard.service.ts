import { getContext, ServiceError } from "./_helpers";
import type { Contract } from "@/types/entities";
import { HOT_LEAD_THRESHOLD } from "@/lib/lead-score";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface SalesDashboardData {
  newLeads: number;
  hotLeads: number;
  followupsToday: number;
  followupsOverdue: number;
  meetingsToday: number;
  pipelineValue: number; // Rappen
  revenuePotential: number; // Rappen (gewichtet mit Score)
  winRate: number; // %
  openOffers: number;
  acceptedOffers: number;
  rejectedOffers: number;
  offerVolume: number; // Rappen
  offerWinRate: number; // %
  contractsExpiring: number;
}

export const salesDashboardService = {
  async summary(): Promise<SalesDashboardData> {
    const { supabase } = await getContext();

    const { data: statusRows } = await supabase
      .from("statuses")
      .select("id,key")
      .eq("entity_type", "lead");
    const byKey = new Map(
      ((statusRows ?? []) as Array<{ id: string; key: string }>).map((s) => [s.key, s.id]),
    );
    const today = todayISO();
    // Terminal-Status (normalisiertes Set) - zaehlen nicht zur offenen Pipeline.
    const dead = ["abgeschlossen", "absage", "fehleintrag", "andere", "massenmail"]
      .map((k) => byKey.get(k))
      .filter(Boolean) as string[];

    // Offene Pipeline-Leads in einem Zug holen + in JS aggregieren
    let lq = supabase
      .from("leads")
      .select("lead_score, estimated_value, status_id, next_action_date")
      .is("deleted_at", null);
    if (dead.length) lq = lq.not("status_id", "in", `(${dead.join(",")})`);

    async function statusCount(id: string | undefined): Promise<number> {
      if (!id) return 0;
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status_id", id);
      return count ?? 0;
    }

    // Alle restlichen Queries sind ab hier unabhaengig -> EINE parallele Welle
    // (statt 5 sequenzieller Roundtrips).
    const [leadsRes, won, lost, offersRes, meetingsRes, expiringRes] = await Promise.all([
      lq.limit(2000),
      statusCount(byKey.get("abgeschlossen")),
      statusCount(byKey.get("absage")),
      supabase.from("offers").select("status, amount").is("deleted_at", null),
      supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .not("lead_id", "is", null)
        .eq("status", "planned")
        .gte("meeting_date", `${today}T00:00:00`)
        .lte("meeting_date", `${today}T23:59:59`),
      supabase.rpc("contracts_expiring", { within_days: 90 }),
    ]);

    const { data: openLeads, error: leadErr } = leadsRes;
    if (leadErr) throw new ServiceError("Sales-Dashboard konnte nicht geladen werden", leadErr);
    const leads = (openLeads ?? []) as Array<{
      lead_score: number | null;
      estimated_value: number | null;
      status_id: string;
      next_action_date: string | null;
    }>;

    const newId = byKey.get("neu");
    const pipelineValue = leads.reduce((s, l) => s + (l.estimated_value ?? 0), 0);
    const revenuePotential = Math.round(
      leads.reduce((s, l) => s + ((l.estimated_value ?? 0) * (l.lead_score ?? 0)) / 100, 0),
    );
    const hotLeads = leads.filter((l) => (l.lead_score ?? 0) >= HOT_LEAD_THRESHOLD).length;
    const followupsToday = leads.filter((l) => l.next_action_date === today).length;
    const followupsOverdue = leads.filter(
      (l) => l.next_action_date != null && l.next_action_date < today,
    ).length;
    const newLeads = leads.filter((l) => l.status_id === newId).length;

    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    const offers = (offersRes.data ?? []) as Array<{ status: string; amount: number | null }>;
    const openOffers = offers.filter((o) => o.status === "draft" || o.status === "sent").length;
    const acceptedOffers = offers.filter((o) => o.status === "accepted").length;
    const rejectedOffers = offers.filter((o) => o.status === "rejected").length;
    const offerVolume = offers.reduce((s, o) => s + (o.amount ?? 0), 0);
    const offerWinRate =
      acceptedOffers + rejectedOffers > 0
        ? Math.round((acceptedOffers / (acceptedOffers + rejectedOffers)) * 100)
        : 0;

    const meetingsToday = meetingsRes.count;
    const contractsExpiring = ((expiringRes.data ?? []) as Contract[]).length;

    return {
      newLeads,
      hotLeads,
      followupsToday,
      followupsOverdue,
      meetingsToday: meetingsToday ?? 0,
      pipelineValue,
      revenuePotential,
      winRate,
      openOffers,
      acceptedOffers,
      rejectedOffers,
      offerVolume,
      offerWinRate,
      contractsExpiring,
    };
  },

  async contractsExpiring(withinDays = 90): Promise<Contract[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.rpc("contracts_expiring", {
      within_days: withinDays,
    });
    if (error) throw new ServiceError("Verträge konnten nicht geladen werden", error);
    return (data ?? []) as unknown as Contract[];
  },
};
