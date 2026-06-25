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
    const dead = ["won", "lost", "paused"]
      .map((k) => byKey.get(k))
      .filter(Boolean) as string[];

    // Offene Pipeline-Leads in einem Zug holen + in JS aggregieren
    let lq = supabase
      .from("leads")
      .select("lead_score, estimated_value, status_id, next_action_date")
      .is("deleted_at", null);
    if (dead.length) lq = lq.not("status_id", "in", `(${dead.join(",")})`);
    const { data: openLeads, error: leadErr } = await lq.limit(2000);
    if (leadErr) throw new ServiceError("Sales-Dashboard konnte nicht geladen werden", leadErr);
    const leads = (openLeads ?? []) as Array<{
      lead_score: number | null;
      estimated_value: number | null;
      status_id: string;
      next_action_date: string | null;
    }>;

    const newId = byKey.get("new");
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

    // Gewonnen / Verloren fuer Win-Rate
    const wonId = byKey.get("won");
    const lostId = byKey.get("lost");
    async function statusCount(id: string | undefined): Promise<number> {
      if (!id) return 0;
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status_id", id);
      return count ?? 0;
    }
    const [won, lost] = await Promise.all([statusCount(wonId), statusCount(lostId)]);
    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    // Angebote
    const { data: offerRows } = await supabase
      .from("offers")
      .select("status, amount")
      .is("deleted_at", null);
    const offers = (offerRows ?? []) as Array<{ status: string; amount: number | null }>;
    const openOffers = offers.filter((o) => o.status === "draft" || o.status === "sent").length;
    const acceptedOffers = offers.filter((o) => o.status === "accepted").length;
    const rejectedOffers = offers.filter((o) => o.status === "rejected").length;
    const offerVolume = offers.reduce((s, o) => s + (o.amount ?? 0), 0);
    const offerWinRate =
      acceptedOffers + rejectedOffers > 0
        ? Math.round((acceptedOffers / (acceptedOffers + rejectedOffers)) * 100)
        : 0;

    // Termine heute (Sales)
    const { count: meetingsToday } = await supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .not("lead_id", "is", null)
      .eq("status", "planned")
      .gte("meeting_date", `${today}T00:00:00`)
      .lte("meeting_date", `${today}T23:59:59`);

    // Auslaufende Verträge (90 Tage)
    const { data: expiring } = await supabase.rpc("contracts_expiring", {
      within_days: 90,
    });
    const contractsExpiring = ((expiring ?? []) as Contract[]).length;

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
