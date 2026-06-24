import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { clientsOpsService } from "./clients-ops.service";
import { projectsService } from "./projects.service";
import { tasksService } from "./tasks.service";
import { UPSELL_OPPORTUNITY_TYPE_LABELS } from "@/config/catalog";
import {
  testimonialInsertSchema,
  testimonialUpdateSchema,
  reviewRequestInsertSchema,
  type TestimonialCreateInput,
  type TestimonialUpdateInput,
  type ReviewRequestCreateInput,
} from "@/lib/validation/growth";
import type {
  UpsellOpportunityWithClient,
  ReferralOpportunityWithClient,
  ReviewRequestWithClient,
  RenewalWithClient,
  ChurnRiskWithClient,
  TestimonialWithClient,
  GrowthDashboard,
  GrowthTimelineItem,
} from "@/types/entities";

const AUTO_TASK_THRESHOLD = 80;

/** Geschaetzter Monatswert (Rappen) je Upsell-Typ. */
const UPSELL_VALUE: Record<string, number> = {
  website: 600000,
  seo: 80000,
  meta_ads: 150000,
  google_ads: 150000,
  tiktok_ads: 120000,
  crm: 50000,
  automation: 60000,
  recruiting: 250000,
  video: 120000,
  content: 120000,
  landingpages: 90000,
  reporting_upgrade: 30000,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clientName(c: unknown): { id: string; name: string } | null {
  return (c as { id: string; name: string } | null) ?? null;
}

function withClient<T>(row: Record<string, unknown>): T {
  const { client, ...rest } = row as Record<string, unknown> & { client?: unknown };
  return { ...(rest as object), client: clientName(client) } as T;
}

function clientSelect(table: string): string {
  return `*, client:clients!${table}_client_id_fkey(id,name)`;
}

export const growthService = {
  /**
   * Wachstumschancen fuer einen Kunden erkennen (Upsell/Referral/Review/Churn)
   * und speichern. Dedup gegen offene Eintraege. Bei Upsell-Score > 80 wird
   * automatisch ein Task erstellt. Renewals laufen ueber renewalsService.scan.
   */
  async generateForClient(
    clientId: string,
  ): Promise<{ upsell: number; referral: number; review: number; churn: number }> {
    const { supabase } = await getContext();
    const client = await clientsOpsService.getWithStats(clientId);
    if (!client) throw new ServiceError("Kunde nicht gefunden");

    const projects = await projectsService.list({ filter: { client_id: clientId } }).catch(() => []);
    const services = new Set(projects.map((p) => p.project_type));
    const months = client.start_date
      ? Math.max(0, Math.round((Date.now() - new Date(client.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 0;
    const hasDanger = client.warnings.some((w) => w.severity === "danger");

    // ---- Upsell ----
    const upsellTypes: string[] = [];
    if (services.has("website") && !services.has("ads")) upsellTypes.push("meta_ads");
    if (services.has("ads") && !services.has("crm")) upsellTypes.push("crm");
    if (services.has("crm")) upsellTypes.push("automation");
    if (services.has("content") && !services.has("ads")) upsellTypes.push("google_ads");
    if (services.size === 0) upsellTypes.push("website");
    if (services.size > 0 && !services.has("content")) upsellTypes.push("content");

    const baseScore = 50 + (months >= 3 ? 15 : 0) + (client.mrr > 0 ? 15 : 0) + (!hasDanger ? 10 : 0) + (client.status === "active" ? 10 : 0);
    let upsellCreated = 0;
    for (const type of [...new Set(upsellTypes)]) {
      const { count } = await supabase
        .from("upsell_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("opportunity_type", type)
        .eq("status", "open");
      if ((count ?? 0) > 0) continue;
      const score = Math.min(100, baseScore);
      const label = UPSELL_OPPORTUNITY_TYPE_LABELS[type as keyof typeof UPSELL_OPPORTUNITY_TYPE_LABELS] ?? type;
      const { data } = await supabase
        .from("upsell_opportunities")
        .insert({
          client_id: clientId,
          opportunity_type: type,
          score,
          reason: `Kunde nutzt noch kein ${label}.`,
          recommendation: `${label} anbieten, um Wachstum zu beschleunigen.`,
          estimated_value: UPSELL_VALUE[type] ?? null,
          status: "open",
        })
        .select("id")
        .single();
      upsellCreated++;
      if (score > AUTO_TASK_THRESHOLD && data) {
        await tasksService.create({ title: `Upsell: ${label} bei ${client.name}`, client_id: clientId, priority: "high" }).catch(() => {});
      }
    }

    // ---- Referral ----
    let referralCreated = 0;
    if (client.status === "active" && months >= 3 && !hasDanger) {
      const { count } = await supabase
        .from("referral_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "open");
      if ((count ?? 0) === 0) {
        await supabase.from("referral_opportunities").insert({
          client_id: clientId,
          score: Math.min(100, 60 + months * 2),
          reason: "Langjaehriger, zufriedener Kunde - guter Empfehlungsgeber.",
          status: "open",
        });
        referralCreated = 1;
      }
    }

    // ---- Review ----
    let reviewCreated = 0;
    if (client.status === "active" && months >= 2 && !hasDanger) {
      const { count } = await supabase
        .from("review_requests")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .in("status", ["pending", "requested"]);
      if ((count ?? 0) === 0) {
        await supabase.from("review_requests").insert({ client_id: clientId, status: "pending" });
        reviewCreated = 1;
      }
    }

    // ---- Churn ----
    let churnCreated = 0;
    const churnScore = Math.min(100, client.warnings.length * 25 + (client.warnings.some((w) => w.type === "contract_expiring") ? 20 : 0));
    if (churnScore >= 40) {
      await supabase.from("churn_risks").delete().eq("client_id", clientId);
      await supabase.from("churn_risks").insert({
        client_id: clientId,
        score: churnScore,
        reasons: client.warnings.map((w) => w.label).join(", "),
      });
      churnCreated = 1;
    }

    await recordAudit({ action: "growth.scan", entityType: "client", entityId: clientId });
    return { upsell: upsellCreated, referral: referralCreated, review: reviewCreated, churn: churnCreated };
  },

  /** Alle aktiven Kunden scannen. */
  async scanAll(): Promise<{ clients: number }> {
    const clients = await clientsOpsService.listWithStats({ status: "active" }).catch(() => []);
    for (const c of clients) {
      await this.generateForClient(c.id).catch(() => {});
    }
    await renewalsService.scan().catch(() => {});
    return { clients: clients.length };
  },

  async dashboard(): Promise<GrowthDashboard> {
    const [upsell, churn, refRes, renRes, revRes, testRes] = await Promise.all([
      upsellService.list("open"),
      churnService.list(),
      countOpen("referral_opportunities", ["open"]),
      countOpen("renewals", ["pending", "in_progress"]),
      countOpen("review_requests", ["pending", "requested"]),
      countAll("testimonials"),
    ]);
    return {
      upsellCount: upsell.length,
      referralCount: refRes,
      renewalCount: renRes,
      churnCount: churn.length,
      reviewsPending: revRes,
      testimonialsCount: testRes,
      upsellVolume: upsell.reduce((s, u) => s + (u.estimated_value ?? 0), 0),
      topUpsells: [...upsell].sort((a, b) => b.score - a.score).slice(0, 6),
      topChurn: [...churn].sort((a, b) => b.score - a.score).slice(0, 6),
    };
  },

  async timeline(clientId: string): Promise<GrowthTimelineItem[]> {
    const { supabase } = await getContext();
    const [up, rf, rv, rn, ch, ts] = await Promise.all([
      supabase.from("upsell_opportunities").select("opportunity_type,status,score,created_at").eq("client_id", clientId),
      supabase.from("referral_opportunities").select("status,score,created_at").eq("client_id", clientId),
      supabase.from("review_requests").select("status,created_at").eq("client_id", clientId),
      supabase.from("renewals").select("status,renewal_score,created_at").eq("client_id", clientId),
      supabase.from("churn_risks").select("score,created_at").eq("client_id", clientId),
      supabase.from("testimonials").select("type,status,created_at").eq("client_id", clientId),
    ]);
    const items: GrowthTimelineItem[] = [];
    for (const u of (up.data ?? []) as Array<Record<string, unknown>>)
      items.push({ kind: "upsell", label: `Upsell: ${u.opportunity_type ?? ""}`, status: String(u.status), score: u.score as number, created_at: String(u.created_at) });
    for (const r of (rf.data ?? []) as Array<Record<string, unknown>>)
      items.push({ kind: "referral", label: "Empfehlung", status: String(r.status), score: r.score as number, created_at: String(r.created_at) });
    for (const r of (rv.data ?? []) as Array<Record<string, unknown>>)
      items.push({ kind: "review", label: "Bewertung", status: String(r.status), created_at: String(r.created_at) });
    for (const r of (rn.data ?? []) as Array<Record<string, unknown>>)
      items.push({ kind: "renewal", label: "Verlaengerung", status: String(r.status), score: r.renewal_score as number, created_at: String(r.created_at) });
    for (const r of (ch.data ?? []) as Array<Record<string, unknown>>)
      items.push({ kind: "churn", label: "Churn-Risiko", status: "risk", score: r.score as number, created_at: String(r.created_at) });
    for (const r of (ts.data ?? []) as Array<Record<string, unknown>>)
      items.push({ kind: "testimonial", label: `Testimonial (${r.type ?? ""})`, status: String(r.status), created_at: String(r.created_at) });
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countOpen(table: string, statuses: string[]): Promise<number> {
  const { supabase } = await getContext();
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).in("status", statuses);
  return count ?? 0;
}
async function countAll(table: string): Promise<number> {
  const { supabase } = await getContext();
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

async function genericSetStatus(table: string, id: string, status: string): Promise<void> {
  const { supabase } = await getContext();
  const { error } = await supabase.from(table).update({ status }).eq("id", id);
  if (error) throw new ServiceError("Status konnte nicht gesetzt werden", error);
}
async function genericRemove(table: string, id: string): Promise<void> {
  const { supabase } = await getContext();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new ServiceError("Eintrag konnte nicht geloescht werden", error);
}

export const upsellService = {
  async list(status?: string): Promise<UpsellOpportunityWithClient[]> {
    const { supabase } = await getContext();
    let q = supabase.from("upsell_opportunities").select(clientSelect("upsell_opportunities")).order("score", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Upsells konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => withClient<UpsellOpportunityWithClient>(r));
  },
  setStatus: (id: string, status: string) => genericSetStatus("upsell_opportunities", id, status),
  remove: (id: string) => genericRemove("upsell_opportunities", id),
};

export const referralService = {
  async list(): Promise<ReferralOpportunityWithClient[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("referral_opportunities").select(clientSelect("referral_opportunities")).order("score", { ascending: false }).limit(500);
    if (error) throw new ServiceError("Referrals konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => withClient<ReferralOpportunityWithClient>(r));
  },
  setStatus: (id: string, status: string) => genericSetStatus("referral_opportunities", id, status),
  remove: (id: string) => genericRemove("referral_opportunities", id),
};

export const reviewService = {
  async list(): Promise<ReviewRequestWithClient[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("review_requests").select(clientSelect("review_requests")).order("created_at", { ascending: false }).limit(500);
    if (error) throw new ServiceError("Bewertungen konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => withClient<ReviewRequestWithClient>(r));
  },
  async create(input: ReviewRequestCreateInput): Promise<void> {
    const parsed = reviewRequestInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase.from("review_requests").insert(parsed);
    if (error) throw new ServiceError("Bewertungsanfrage konnte nicht erstellt werden", error);
  },
  setStatus: (id: string, status: string) => genericSetStatus("review_requests", id, status),
  remove: (id: string) => genericRemove("review_requests", id),
};

export const renewalsService = {
  async list(): Promise<RenewalWithClient[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("renewals").select(clientSelect("renewals")).order("created_at", { ascending: false }).limit(500);
    if (error) throw new ServiceError("Verlaengerungen konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => withClient<RenewalWithClient>(r));
  },
  /** Vertraege mit Ende in <= 90 Tagen erfassen + bewerten. */
  async scan(): Promise<number> {
    const { supabase } = await getContext();
    const today = new Date().toISOString().slice(0, 10);
    const in90 = new Date(); in90.setDate(in90.getDate() + 90);
    const in90Iso = in90.toISOString().slice(0, 10);
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id, client_id, end_date, status")
      .is("deleted_at", null)
      .eq("status", "active")
      .gte("end_date", today)
      .lte("end_date", in90Iso);
    let created = 0;
    for (const c of (contracts ?? []) as Array<{ id: string; client_id: string; end_date: string }>) {
      const { count } = await supabase.from("renewals").select("id", { count: "exact", head: true }).eq("contract_id", c.id).in("status", ["pending", "in_progress"]);
      if ((count ?? 0) > 0) continue;
      const stats = await clientsOpsService.getWithStats(c.client_id).catch(() => null);
      const healthy = stats ? !stats.warnings.some((w) => w.severity === "danger") : true;
      const probability = healthy ? 75 : 40;
      await supabase.from("renewals").insert({
        contract_id: c.id,
        client_id: c.client_id,
        renewal_score: probability,
        renewal_probability: probability,
        status: "pending",
      });
      created++;
    }
    return created;
  },
  setStatus: (id: string, status: string) => genericSetStatus("renewals", id, status),
  remove: (id: string) => genericRemove("renewals", id),
};

export const churnService = {
  async list(): Promise<ChurnRiskWithClient[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("churn_risks").select(clientSelect("churn_risks")).order("score", { ascending: false }).limit(500);
    if (error) throw new ServiceError("Churn-Risiken konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => withClient<ChurnRiskWithClient>(r));
  },
  remove: (id: string) => genericRemove("churn_risks", id),
};

export const testimonialsService = {
  async list(): Promise<TestimonialWithClient[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("testimonials").select(clientSelect("testimonials")).order("created_at", { ascending: false }).limit(500);
    if (error) throw new ServiceError("Testimonials konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => withClient<TestimonialWithClient>(r));
  },
  async create(input: TestimonialCreateInput): Promise<void> {
    const parsed = testimonialInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase.from("testimonials").insert(parsed);
    if (error) throw new ServiceError("Testimonial konnte nicht erstellt werden", error);
  },
  async update(id: string, input: TestimonialUpdateInput): Promise<void> {
    const parsed = testimonialUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase.from("testimonials").update(parsed).eq("id", id);
    if (error) throw new ServiceError("Testimonial konnte nicht aktualisiert werden", error);
  },
  setStatus: (id: string, status: string) => genericSetStatus("testimonials", id, status),
  remove: (id: string) => genericRemove("testimonials", id),
};
