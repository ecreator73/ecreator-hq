import { getContext, ServiceError } from "./_helpers";
import { salesDashboardService } from "./sales-dashboard.service";
import { clientsOpsService } from "./clients-ops.service";
import { financeService } from "./finance.service";
import { executiveService } from "./executive.service";
import { websiteAuditsService } from "./website-audits.service";
import { outreachMessagesService } from "./outreach-messages.service";
import { proposalsService } from "./proposals.service";
import { leadCompaniesService } from "./lead-companies.service";
import { leadsService } from "./leads.service";
import { tasksService } from "./tasks.service";
import {
  growthService,
  upsellService,
  reviewService,
  referralService,
  renewalsService,
  churnService,
} from "./growth.service";
import { recommendationPriorityRank, GROWTH_PIPELINE_STEPS } from "@/config/catalog";
import { stageFromLeadStatus } from "@/lib/growth-engine";
import { formatCHF } from "@/lib/utils";
import {
  revenueJourneyInsertSchema,
  revenueJourneyUpdateSchema,
  growthRecommendationInsertSchema,
  orchestrationInsertSchema,
  orchestrationUpdateSchema,
  growthAlertInsertSchema,
  type RevenueJourneyCreateInput,
  type RevenueJourneyUpdateInput,
  type GrowthRecommendationCreateInput,
  type OrchestrationCreateInput,
  type OrchestrationUpdateInput,
  type GrowthAlertCreateInput,
} from "@/lib/validation/growth-engine";
import type {
  RevenueJourney,
  RevenueJourneyWithRefs,
  GrowthRecommendation,
  AutomationOrchestration,
  GrowthAlert,
  GrowthEngineDashboard,
  GrowthPipelineStepCount,
  PipelineValue,
  GrowthBriefing,
  GrowthBriefingSection,
  GrowthWeeklyReport,
  AssistantAnswer,
} from "@/types/entities";

/* ===========================================================================
 * Phase 17 - Autonomous Growth Engine
 *
 * Uebergeordnete Orchestrierungsschicht. Verbindet alle Module zu einem Funnel
 * und schlaegt naechste beste Schritte vor. Die Engine erzeugt Aufgaben,
 * Erinnerungen und Alerts - sie versendet NIE ungefragt E-Mails, Verträge
 * oder Rechnungen. Der Mensch bleibt Entscheider.
 * ======================================================================== */

const OPEN_PROPOSAL_STATUSES = ["draft", "review", "sent"];
const FOLLOWUP_PROPOSAL_DAYS = 5;
const HOT_COMPANY_SCORE = 75;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

async function headCount(
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build?: (q: any) => any,
): Promise<number> {
  const { supabase } = await getContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from(table).select("id", { count: "exact", head: true });
  if (build) q = build(q);
  const { count } = await q;
  return count ?? 0;
}

/** Summe des Verlaengerungswerts auslaufender Verträge (<= 90 Tage), Rappen. */
async function expiringRenewalValue(): Promise<number> {
  const { supabase } = await getContext();
  const { data } = await supabase
    .from("contracts")
    .select("value_monthly, value_total, end_date, status")
    .is("deleted_at", null)
    .eq("status", "active")
    .gte("end_date", todayIso())
    .lte("end_date", isoPlusDays(90));
  return ((data ?? []) as Array<{ value_monthly: number | null; value_total: number | null }>).reduce(
    (s, c) => s + (c.value_total ?? (c.value_monthly ?? 0) * 12),
    0,
  );
}

/* --------------------------------------------------------------------------
 * Embed-Mapping fuer Revenue Journeys
 * ------------------------------------------------------------------------ */
const JOURNEY_SELECT =
  "*, lead:leads!revenue_journeys_lead_id_fkey(id,company_name), client:clients!revenue_journeys_client_id_fkey(id,name), owner:profiles!revenue_journeys_owner_id_fkey(id,full_name)";

function mapJourney(row: Record<string, unknown>): RevenueJourneyWithRefs {
  const { lead, client, owner, ...rest } = row as Record<string, unknown> & {
    lead?: unknown;
    client?: unknown;
    owner?: unknown;
  };
  return {
    ...(rest as object),
    lead: (lead as { id: string; company_name: string } | null) ?? null,
    client: (client as { id: string; name: string } | null) ?? null,
    owner: (owner as { id: string; full_name: string | null } | null) ?? null,
  } as RevenueJourneyWithRefs;
}

/* ===========================================================================
 * growthEngineService - Dashboard, Pipeline, Engine, Briefing, Report, Assistant
 * ======================================================================== */

export const growthEngineService = {
  /** Growth-Dashboard: offene Posten je Funnel-Stufe + KPI-Widgets. */
  async dashboard(): Promise<GrowthEngineDashboard> {
    const [
      sales,
      clientsDash,
      fin,
      exec,
      leadEng,
      growth,
      auditsList,
      drafts,
      proposalsList,
      openRecs,
      openAlertsList,
      renewalValue,
      openContracts,
    ] = await Promise.all([
      salesDashboardService.summary().catch(() => null),
      clientsOpsService.dashboard().catch(() => null),
      financeService.summary().catch(() => null),
      executiveService.dashboard().catch(() => null),
      leadCompaniesService.dashboard().catch(() => null),
      growthService.dashboard().catch(() => null),
      websiteAuditsService.list().catch(() => []),
      outreachMessagesService.list({ status: "draft" }).catch(() => []),
      proposalsService.list({}).catch(() => []),
      growthRecommendationsService.list({ status: "open" }).catch(() => []),
      growthAlertsService.list(false).catch(() => []),
      expiringRenewalValue().catch(() => 0),
      headCount("contracts", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).eq("status", "draft").is("deleted_at", null),
      ).catch(() => 0),
    ]);

    const openProposals = proposalsList.filter((p) =>
      OPEN_PROPOSAL_STATUSES.includes(p.status),
    );
    const proposalValue = openProposals.reduce(
      (s, p) => s + (p.amount ?? 0) + (p.setup_fee ?? 0),
      0,
    );
    const leadValue = sales?.pipelineValue ?? 0;
    const upsellValue = growth?.upsellVolume ?? 0;

    const pipeline: PipelineValue = {
      leadValue,
      proposalValue,
      renewalValue,
      upsellValue,
      total: leadValue + proposalValue + renewalValue + upsellValue,
    };

    return {
      newLeads: sales?.newLeads ?? 0,
      hotOpportunities: leadEng?.hotCount ?? 0,
      openAudits: auditsList.filter((a) => a.status === "draft").length,
      outreachDrafts: drafts.length,
      followupsDue: (sales?.followupsToday ?? 0) + (sales?.followupsOverdue ?? 0),
      openOffers: (sales?.openOffers ?? 0) + openProposals.length,
      openContracts,
      clientsNoContact: clientsDash?.noContact ?? exec?.clients.noContact ?? 0,
      upsellChances: growth?.upsellCount ?? 0,
      reviewsPending: growth?.reviewsPending ?? 0,
      openRecommendations: openRecs.length,
      openAlerts: openAlertsList.length,
      kpis: {
        pipelineValue: leadValue + proposalValue,
        forecast: fin?.forecast3Months ?? 0,
        upsellValue,
        referralPotential: growth?.referralCount ?? 0,
        renewalPotential: renewalValue,
        churnRisk: exec?.clients.churnRisk ?? growth?.churnCount ?? 0,
      },
      pipeline,
    };
  },

  /** Funnel-Visualisierung: die elf Schritte mit Anzahl. */
  async pipelineSteps(): Promise<GrowthPipelineStepCount[]> {
    const counts = await Promise.all([
      headCount("lead_companies", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).is("deleted_at", null),
      ),
      headCount("lead_companies", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).is("deleted_at", null).not("last_analyzed_at", "is", null),
      ),
      headCount("website_audits", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).is("deleted_at", null),
      ),
      headCount("outreach_messages", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).is("deleted_at", null),
      ),
      headCount("outreach_messages", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).is("deleted_at", null).in("status", ["replied", "positive"]),
      ),
      headCount("booked_meetings"),
      headCount("proposals", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).is("deleted_at", null),
      ),
      headCount("contracts", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).is("deleted_at", null),
      ),
      headCount("clients", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).is("deleted_at", null),
      ),
      headCount("upsell_opportunities"),
      headCount("referral_opportunities"),
    ]).catch(() => [] as number[]);

    return GROWTH_PIPELINE_STEPS.map((step, i) => ({
      key: step.key,
      label: step.label,
      count: counts[i] ?? 0,
    }));
  },

  /** Command Center: die maximal 10 wichtigsten offenen Empfehlungen heute. */
  async commandCenter(limit = 10): Promise<GrowthRecommendation[]> {
    const recs = await growthRecommendationsService
      .list({ status: "open" })
      .catch(() => [] as GrowthRecommendation[]);
    return [...recs]
      .sort((a, b) => {
        const pr = recommendationPriorityRank(a.priority) - recommendationPriorityRank(b.priority);
        if (pr !== 0) return pr;
        return (b.estimated_value ?? 0) - (a.estimated_value ?? 0);
      })
      .slice(0, limit);
  },

  /**
   * Recommendation-Engine: scannt den gesamten Funnel und erzeugt priorisierte
   * Empfehlungen (dedupliziert gegen offene). Bei kritischer Prioritaet werden
   * zusaetzlich eine Aufgabe und ein Growth-Alert erzeugt. KEIN Versand.
   */
  async generateRecommendations(): Promise<{ created: number; tasks: number; alerts: number }> {
    const { supabase } = await getContext();

    const [
      activeClients,
      upsells,
      reviews,
      referrals,
      renewals,
      churns,
      proposalsList,
      auditsList,
      outreachPositive,
      hotCompanies,
      existingRecs,
      existingAlerts,
    ] = await Promise.all([
      clientsOpsService.listWithStats({ status: "active" }).catch(() => []),
      upsellService.list("open").catch(() => []),
      reviewService.list().catch(() => []),
      referralService.list().catch(() => []),
      renewalsService.list().catch(() => []),
      churnService.list().catch(() => []),
      proposalsService.list({}).catch(() => []),
      websiteAuditsService.list().catch(() => []),
      outreachMessagesService.list({ status: "positive" }).catch(() => []),
      leadCompaniesService.list({ minScore: HOT_COMPANY_SCORE }).catch(() => []),
      growthRecommendationsService.list({ status: "open" }).catch(() => []),
      growthAlertsService.list(false).catch(() => []),
    ]);

    type Candidate = {
      entity_type: string;
      entity_id: string | null;
      title: string;
      recommendation: string;
      reason: string;
      priority: string;
      estimated_value: number | null;
      href: string | null;
      client_id?: string | null;
    };
    const candidates: Candidate[] = [];

    // Churn -> kritisch
    for (const c of churns.filter((x) => x.score >= 60)) {
      candidates.push({
        entity_type: "client",
        entity_id: c.client_id,
        title: `Churn-Risiko: ${c.client?.name ?? "Kunde"}`,
        recommendation: "Churn-Risiko bearbeiten - Gespraech suchen, Mehrwert zeigen.",
        reason: c.reasons ?? "Erhoehtes Abwanderungsrisiko.",
        priority: "critical",
        estimated_value: null,
        href: `/clients/${c.client_id}`,
        client_id: c.client_id,
      });
    }
    // Verlaengerungen -> hoch (kritisch bei niedriger Wahrscheinlichkeit)
    for (const r of renewals.filter((x) => ["pending", "in_progress"].includes(x.status))) {
      candidates.push({
        entity_type: "renewal",
        entity_id: r.id,
        title: `Verlaengerung vorbereiten: ${r.client?.name ?? "Kunde"}`,
        recommendation: "Verlaengerung vorbereiten - Termin mit dem Kunden ansetzen.",
        reason: `Vertrag laeuft aus. Wahrscheinlichkeit ${r.renewal_probability}%.`,
        priority: r.renewal_probability < 50 ? "critical" : "high",
        estimated_value: null,
        href: "/clients/growth/renewals",
        client_id: r.client_id,
      });
    }
    // Offene Angebote ohne Antwort -> Follow-Up
    for (const p of proposalsList.filter((x) => x.status === "sent")) {
      const age = daysSince(p.created_at);
      if (age < FOLLOWUP_PROPOSAL_DAYS) continue;
      candidates.push({
        entity_type: "proposal",
        entity_id: p.id,
        title: `Follow-Up: ${p.title}`,
        recommendation: "Follow-Up senden - beim Entscheider nachfassen.",
        reason: `Angebot seit ${age} Tagen ohne Antwort.`,
        priority: age >= 10 ? "critical" : "high",
        estimated_value: p.amount ?? null,
        href: `/sales/proposals/${p.id}`,
        client_id: p.client_id,
      });
    }
    // Positiver Kontakt ohne Termin -> Termin buchen
    for (const m of outreachPositive) {
      candidates.push({
        entity_type: "outreach",
        entity_id: m.id,
        title: `Termin buchen: ${m.lead?.company_name ?? "Lead"}`,
        recommendation: "Positiver Kontakt - jetzt einen Termin buchen.",
        reason: "Lead hat positiv reagiert.",
        priority: "high",
        estimated_value: null,
        href: "/sales/outreach/inbox",
      });
    }
    // Audit-Entwurf -> generieren & Outreach vorbereiten
    for (const a of auditsList.filter((x) => x.status === "draft")) {
      candidates.push({
        entity_type: "audit",
        entity_id: a.id,
        title: `Audit fertigstellen: ${a.company?.name ?? a.url ?? "Lead"}`,
        recommendation: "Audit generieren und daraus den Outreach vorbereiten.",
        reason: "Audit-Entwurf noch nicht generiert.",
        priority: "medium",
        estimated_value: null,
        href: `/sales/audits/${a.id}`,
      });
    }
    // Heisse Lead-Companies -> Audit erstellen
    for (const lc of hotCompanies.filter((x) => !x.handed_over).slice(0, 25)) {
      candidates.push({
        entity_type: "lead_company",
        entity_id: lc.id,
        title: `Website-Audit: ${lc.name}`,
        recommendation: "Heisse Opportunity - Website-Audit erstellen und ansprechen.",
        reason: `Opportunity-Score ${lc.overall_score}.`,
        priority: "medium",
        estimated_value: null,
        href: `/sales/lead-engine/${lc.id}`,
      });
    }
    // Bestandskunden: Kontakt- und Reporting-Luecken
    for (const c of activeClients) {
      if (c.warnings.some((w) => w.type === "no_contact")) {
        candidates.push({
          entity_type: "client",
          entity_id: c.id,
          title: `Kontakt aufnehmen: ${c.name}`,
          recommendation: "Kunde proaktiv kontaktieren.",
          reason: "Kein Kontakt seit ueber 30 Tagen.",
          priority: "high",
          estimated_value: null,
          href: `/clients/${c.id}`,
          client_id: c.id,
        });
      }
      if (c.warnings.some((w) => w.type === "no_reporting")) {
        candidates.push({
          entity_type: "client",
          entity_id: c.id,
          title: `Reporting-Call planen: ${c.name}`,
          recommendation: "Reporting-Call ansetzen.",
          reason: "Kein Reporting-Call geplant.",
          priority: "medium",
          estimated_value: null,
          href: `/clients/${c.id}`,
          client_id: c.id,
        });
      }
    }
    // Upsell-Chancen
    for (const u of upsells.filter((x) => x.score >= 70)) {
      candidates.push({
        entity_type: "client",
        entity_id: u.client_id,
        title: `Upsell anbieten: ${u.client?.name ?? "Kunde"}`,
        recommendation: u.recommendation ?? "Upsell besprechen.",
        reason: u.reason ?? `Upsell-Score ${u.score}.`,
        priority: "high",
        estimated_value: u.estimated_value ?? null,
        href: "/clients/growth/upsell",
        client_id: u.client_id,
      });
    }
    // Bewertungen anfragen
    for (const r of reviews.filter((x) => ["pending", "requested"].includes(x.status))) {
      candidates.push({
        entity_type: "client",
        entity_id: r.client_id,
        title: `Bewertung anfragen: ${r.client?.name ?? "Kunde"}`,
        recommendation: "Bewertungsanfrage versenden.",
        reason: "Zufriedener Kunde - Bewertung einholen.",
        priority: "low",
        estimated_value: null,
        href: "/clients/growth/reviews",
        client_id: r.client_id,
      });
    }
    // Empfehlungen anfragen
    for (const r of referrals.filter((x) => x.status === "open")) {
      candidates.push({
        entity_type: "client",
        entity_id: r.client_id,
        title: `Empfehlung anfragen: ${r.client?.name ?? "Kunde"}`,
        recommendation: "Empfehlung erbitten.",
        reason: r.reason ?? "Guter Empfehlungsgeber.",
        priority: "medium",
        estimated_value: null,
        href: "/clients/growth/reviews",
        client_id: r.client_id,
      });
    }

    // Dedup gegen offene Empfehlungen (entity_type + entity_id + title).
    const seen = new Set(
      existingRecs.map((r) => `${r.entity_type}|${r.entity_id ?? ""}|${r.title}`),
    );
    const fresh = candidates.filter(
      (c) => !seen.has(`${c.entity_type}|${c.entity_id ?? ""}|${c.title}`),
    );
    if (fresh.length === 0) return { created: 0, tasks: 0, alerts: 0 };

    const { error } = await supabase.from("growth_recommendations").insert(
      fresh.map((c) => ({
        entity_type: c.entity_type,
        entity_id: c.entity_id,
        title: c.title,
        recommendation: c.recommendation,
        reason: c.reason,
        priority: c.priority,
        estimated_value: c.estimated_value,
        href: c.href,
        status: "open",
      })),
    );
    if (error) throw new ServiceError("Empfehlungen konnten nicht erstellt werden", error);

    // Automatische Aufgaben + Alerts nur fuer NEUE kritische Empfehlungen.
    const alertTitles = new Set(existingAlerts.map((a) => a.title));
    let tasks = 0;
    let alerts = 0;
    for (const c of fresh.filter((x) => x.priority === "critical")) {
      try {
        await tasksService.create({
          title: c.title,
          priority: "urgent",
          ...(c.client_id ? { client_id: c.client_id } : {}),
        });
        tasks += 1;
      } catch {
        /* Aufgabe optional - Scan nicht abbrechen. */
      }
      if (!alertTitles.has(c.title)) {
        alertTitles.add(c.title);
        const { error: alertErr } = await supabase.from("growth_alerts").insert({
          severity: "critical",
          title: c.title,
          description: c.reason,
          entity_type: c.entity_type,
          entity_id: c.entity_id,
        });
        if (!alertErr) alerts += 1;
      }
    }

    return { created: fresh.length, tasks, alerts };
  },

  /** Taegliches Growth-Briefing (offene Posten je Funnel-Stufe mit Beispielen). */
  async dailyBriefing(): Promise<GrowthBriefing> {
    const [board, proposalsList, activeClients, upsells, hotCompanies, expContracts] =
      await Promise.all([
        leadsService.board({}).catch(() => []),
        proposalsService.list({}).catch(() => []),
        clientsOpsService.listWithStats({ status: "active" }).catch(() => []),
        upsellService.list("open").catch(() => []),
        leadCompaniesService.list({ minScore: HOT_COMPANY_SCORE }).catch(() => []),
        expiringContracts().catch(() => []),
      ]);

    const newLeads = board.filter((l) => l.status?.key === "new");
    const overdue = board.filter(
      (l) => l.next_action_date && l.next_action_date < todayIso(),
    );
    const sentProposals = proposalsList.filter((p) => p.status === "sent");
    const noContact = activeClients.filter((c) =>
      c.warnings.some((w) => w.type === "no_contact"),
    );

    const sections: GrowthBriefingSection[] = [
      sec("new_leads", "Neue Leads", newLeads.map((l) => l.company_name), "/sales/leads"),
      sec("hot", "Heisse Opportunities", hotCompanies.map((c) => c.name), "/sales/lead-engine"),
      sec("followups", "Faellige Follow-Ups", overdue.map((l) => l.company_name), "/sales/followups"),
      sec("offers", "Angebote ohne Antwort", sentProposals.map((p) => p.title), "/sales/proposals"),
      sec("no_contact", "Kunden ohne Kontakt", noContact.map((c) => c.name), "/clients/list"),
      sec("upsell", "Upsell-Chancen", upsells.map((u) => u.client?.name ?? "Kunde"), "/clients/growth/upsell"),
      sec(
        "renewals",
        "Verträge laufen aus",
        expContracts.map((c) => c.clientName ?? c.title),
        "/clients/growth/renewals",
      ),
    ];

    const total = sections.reduce((s, x) => s + x.count, 0);
    return {
      headline:
        total > 0
          ? `${total} offene Aktionen heute im Funnel.`
          : "Heute keine offenen Funnel-Aktionen.",
      sections,
    };
  },

  /** Woechentlicher Executive/Growth-Report. */
  async weeklyReport(): Promise<GrowthWeeklyReport> {
    const [sales, clientsDash, fin, growth, exec] = await Promise.all([
      salesDashboardService.summary().catch(() => null),
      clientsOpsService.dashboard().catch(() => null),
      financeService.summary().catch(() => null),
      growthService.dashboard().catch(() => null),
      executiveService.dashboard().catch(() => null),
    ]);

    const risks: string[] = [];
    if ((clientsDash?.contractsExpiring ?? 0) > 0)
      risks.push(`${clientsDash?.contractsExpiring} Verträge laufen bald aus.`);
    if ((exec?.clients.churnRisk ?? 0) > 0)
      risks.push(`${exec?.clients.churnRisk} Kunden mit Churn-Risiko.`);
    if ((clientsDash?.noContact ?? 0) > 0)
      risks.push(`${clientsDash?.noContact} Kunden ohne aktuellen Kontakt.`);

    const opportunities: string[] = [];
    if ((growth?.upsellCount ?? 0) > 0)
      opportunities.push(`${growth?.upsellCount} Upsell-Chancen (${formatCHF(growth?.upsellVolume ?? 0)}).`);
    if ((growth?.referralCount ?? 0) > 0)
      opportunities.push(`${growth?.referralCount} Empfehlungs-Chancen offen.`);
    if ((sales?.hotLeads ?? 0) > 0)
      opportunities.push(`${sales?.hotLeads} heisse Leads im Sales-Funnel.`);

    return {
      headline: "Wochenrueckblick Growth & Revenue",
      sales: [
        { label: "Neue Leads", value: String(sales?.newLeads ?? 0) },
        { label: "Pipeline", value: formatCHF(sales?.pipelineValue ?? 0) },
        { label: "Offene Angebote", value: String(sales?.openOffers ?? 0) },
        { label: "Win-Rate", value: `${sales?.winRate ?? 0}%` },
      ],
      clients: [
        { label: "Aktive Kunden", value: String(exec?.clients.active ?? 0) },
        { label: "Ohne Kontakt", value: String(clientsDash?.noContact ?? 0) },
        { label: "Churn-Risiko", value: String(exec?.clients.churnRisk ?? 0) },
        { label: "Reporting (Woche)", value: String(clientsDash?.reportingThisWeek ?? 0) },
      ],
      revenue: [
        { label: "MRR", value: formatCHF(fin?.mrr ?? 0) },
        { label: "ARR", value: formatCHF(fin?.arr ?? 0) },
        { label: "Umsatz Monat", value: formatCHF(fin?.monthRevenue ?? 0) },
        { label: "Forecast 3 Mt.", value: formatCHF(fin?.forecast3Months ?? 0) },
      ],
      highlights: opportunities,
      risks,
      opportunities,
    };
  },

  /** AI-Assistant: datenbasierte Antwort auf eine (kanonische) Frage. */
  async assistant(query: string): Promise<AssistantAnswer> {
    const q = query.toLowerCase();
    const wants = (...keys: string[]) => keys.some((k) => q.includes(k));

    // Welche Leads sollte Fabian heute anrufen?
    if (wants("anrufen", "leads", "fabian", "call")) {
      const board = await leadsService.board({}).catch(() => []);
      const hot = board
        .filter((l) => l.lead_score >= 70 && ["new", "contacted", "interested"].includes(l.status?.key ?? ""))
        .sort((a, b) => b.lead_score - a.lead_score)
        .slice(0, 8);
      return {
        question: query,
        summary:
          hot.length > 0
            ? `${hot.length} heisse Leads mit hoher Prioritaet zum Anrufen.`
            : "Aktuell keine heissen Leads mit Anruf-Prioritaet.",
        items: hot.map((l) => ({
          title: l.company_name,
          subtitle: l.contact_name ?? l.phone ?? undefined,
          badge: `Score ${l.lead_score}`,
          href: `/sales/leads/${l.id}`,
        })),
      };
    }

    // Welche Kunden haben Upsell-Potenzial?
    if (wants("upsell", "potenzial", "mehr umsatz")) {
      const ups = await upsellService.list("open").catch(() => []);
      const top = [...ups].sort((a, b) => b.score - a.score).slice(0, 8);
      return {
        question: query,
        summary:
          top.length > 0
            ? `${top.length} Kunden mit Upsell-Potenzial.`
            : "Keine offenen Upsell-Chancen - jetzt einen Scan starten.",
        items: top.map((u) => ({
          title: u.client?.name ?? "Kunde",
          subtitle: u.recommendation ?? undefined,
          badge: u.estimated_value ? formatCHF(u.estimated_value) : `Score ${u.score}`,
          href: "/clients/growth/upsell",
        })),
      };
    }

    // Welche Verträge laufen bald aus?
    if (wants("vertrag", "vertraege", "renewal", "verlaeng", "laufen")) {
      const cs = await expiringContracts().catch(() => []);
      return {
        question: query,
        summary:
          cs.length > 0
            ? `${cs.length} Verträge laufen in den naechsten 90 Tagen aus.`
            : "Keine Verträge laufen in den naechsten 90 Tagen aus.",
        items: cs.map((c) => ({
          title: c.clientName ?? c.title,
          subtitle: c.title,
          badge: c.endDate ?? undefined,
          href: c.clientId ? `/clients/${c.clientId}` : "/finance",
        })),
      };
    }

    // Welche Projekte sind kritisch?
    if (wants("projekt", "kritisch", "risiko", "project")) {
      const health = await executiveService.projectHealth().catch(() => []);
      const crit = health.filter((h) => ["risk", "critical"].includes(h.status.key));
      return {
        question: query,
        summary:
          crit.length > 0
            ? `${crit.length} Projekte brauchen Aufmerksamkeit.`
            : "Keine kritischen Projekte - alles im gruenen Bereich.",
        items: crit.map((h) => ({
          title: h.name,
          subtitle: h.issues.join(", ") || undefined,
          badge: h.status.label,
          href: "/executive/health",
        })),
      };
    }

    return {
      question: query,
      summary:
        "Frage nicht erkannt. Nutze eine der Standardfragen (Leads anrufen, Upsell-Potenzial, auslaufende Verträge, kritische Projekte).",
      items: [],
    };
  },
};

function sec(
  key: string,
  label: string,
  names: (string | null | undefined)[],
  href: string,
): GrowthBriefingSection {
  const items = names.filter((n): n is string => !!n);
  return { key, label, count: items.length, items: items.slice(0, 5), href };
}

/** Auslaufende Verträge (<= 90 Tage) mit Kundenname, fuer Briefing/Assistant. */
async function expiringContracts(): Promise<
  { id: string; title: string; endDate: string | null; clientId: string | null; clientName: string | null }[]
> {
  const { supabase } = await getContext();
  const { data } = await supabase
    .from("contracts")
    .select("id, title, end_date, client_id, client:clients!contracts_client_id_fkey(id,name)")
    .is("deleted_at", null)
    .eq("status", "active")
    .gte("end_date", todayIso())
    .lte("end_date", isoPlusDays(90))
    .order("end_date", { ascending: true });
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => {
    const client = r.client as { id: string; name: string } | null;
    return {
      id: String(r.id),
      title: String(r.title ?? "Vertrag"),
      endDate: (r.end_date as string | null) ?? null,
      clientId: (r.client_id as string | null) ?? null,
      clientName: client?.name ?? null,
    };
  });
}

/* ===========================================================================
 * revenueJourneysService
 * ======================================================================== */

/** Naechster empfohlener Schritt je Funnel-Stage (kurzer Text). */
const STAGE_NEXT_ACTION: Record<string, string> = {
  discovery: "Lead analysieren & Audit erstellen",
  audit: "Outreach vorbereiten",
  outreach: "Kontakt herstellen & Termin buchen",
  meeting: "Proposal erstellen",
  proposal: "Follow-Up senden",
  contract: "Onboarding starten",
  client: "Reporting & Upsell vorbereiten",
  expansion: "Upsell anbieten",
  referral: "Empfehlung anfragen",
  renewal: "Verlaengerung vorbereiten",
};

export const revenueJourneysService = {
  async list(): Promise<RevenueJourneyWithRefs[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("revenue_journeys")
      .select(JOURNEY_SELECT)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new ServiceError("Revenue Journeys konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapJourney);
  },

  async create(input: RevenueJourneyCreateInput): Promise<RevenueJourney> {
    const parsed = revenueJourneyInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("revenue_journeys")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Revenue Journey konnte nicht erstellt werden", error);
    return data as RevenueJourney;
  },

  async update(id: string, input: RevenueJourneyUpdateInput): Promise<void> {
    const parsed = revenueJourneyUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase.from("revenue_journeys").update(parsed).eq("id", id);
    if (error) throw new ServiceError("Revenue Journey konnte nicht aktualisiert werden", error);
  },

  async setStage(id: string, stage: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("revenue_journeys")
      .update({ current_stage: stage, next_recommended_action: STAGE_NEXT_ACTION[stage] ?? null })
      .eq("id", id);
    if (error) throw new ServiceError("Stage konnte nicht gesetzt werden", error);
  },

  async setStatus(id: string, status: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("revenue_journeys").update({ status }).eq("id", id);
    if (error) throw new ServiceError("Status konnte nicht gesetzt werden", error);
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("revenue_journeys").delete().eq("id", id);
    if (error) throw new ServiceError("Revenue Journey konnte nicht geloescht werden", error);
  },

  /**
   * Journeys aus dem Funnel synchronisieren: je aktivem Lead und je Kunde eine
   * Journey (dedupliziert ueber lead_id/client_id). Stages werden aus dem Status
   * abgeleitet. Idempotent - aktualisiert vorhandene Eintraege.
   */
  async sync(): Promise<{ created: number; updated: number }> {
    const { supabase } = await getContext();
    const [board, clients] = await Promise.all([
      leadsService.board({}).catch(() => []),
      clientsOpsService.listWithStats({}).catch(() => []),
    ]);

    const { data: existing } = await supabase
      .from("revenue_journeys")
      .select("id, lead_id, client_id");
    const byLead = new Map<string, string>();
    const byClient = new Map<string, string>();
    for (const e of (existing ?? []) as Array<{ id: string; lead_id: string | null; client_id: string | null }>) {
      if (e.lead_id) byLead.set(e.lead_id, e.id);
      if (e.client_id) byClient.set(e.client_id, e.id);
    }

    let created = 0;
    let updated = 0;
    const inserts: Record<string, unknown>[] = [];

    for (const l of board) {
      const stage = stageFromLeadStatus(l.status?.key ?? null);
      const status = l.status?.key === "won" ? "won" : l.status?.key === "lost" ? "lost" : "active";
      const payload = {
        lead_id: l.id,
        current_stage: stage,
        next_recommended_action: STAGE_NEXT_ACTION[stage] ?? null,
        estimated_value: l.estimated_value,
        owner_id: l.owner_id,
        status,
      };
      const existingId = byLead.get(l.id);
      if (existingId) {
        await supabase.from("revenue_journeys").update(payload).eq("id", existingId);
        updated += 1;
      } else {
        inserts.push(payload);
      }
    }

    for (const c of clients) {
      const contractExpiring = c.warnings.some((w) => w.type === "contract_expiring");
      const stage = contractExpiring ? "renewal" : c.status === "active" ? "client" : "client";
      const payload = {
        client_id: c.id,
        current_stage: stage,
        next_recommended_action: STAGE_NEXT_ACTION[stage] ?? null,
        estimated_value: c.mrr,
        owner_id: c.account_manager_id,
        status: c.status === "ended" ? "lost" : "active",
      };
      const existingId = byClient.get(c.id);
      if (existingId) {
        await supabase.from("revenue_journeys").update(payload).eq("id", existingId);
        updated += 1;
      } else {
        inserts.push(payload);
      }
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from("revenue_journeys").insert(inserts);
      if (error) throw new ServiceError("Journeys konnten nicht synchronisiert werden", error);
      created = inserts.length;
    }
    return { created, updated };
  },
};

/* ===========================================================================
 * growthRecommendationsService
 * ======================================================================== */

export const growthRecommendationsService = {
  async list(filters: { status?: string; priority?: string; entityType?: string } = {}): Promise<GrowthRecommendation[]> {
    const { supabase } = await getContext();
    let q = supabase.from("growth_recommendations").select("*").order("created_at", { ascending: false });
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.priority) q = q.eq("priority", filters.priority);
    if (filters.entityType) q = q.eq("entity_type", filters.entityType);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Empfehlungen konnten nicht geladen werden", error);
    return (data ?? []) as GrowthRecommendation[];
  },

  async create(input: GrowthRecommendationCreateInput): Promise<void> {
    const parsed = growthRecommendationInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase.from("growth_recommendations").insert(parsed);
    if (error) throw new ServiceError("Empfehlung konnte nicht erstellt werden", error);
  },

  async setStatus(id: string, status: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("growth_recommendations").update({ status }).eq("id", id);
    if (error) throw new ServiceError("Status konnte nicht gesetzt werden", error);
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("growth_recommendations").delete().eq("id", id);
    if (error) throw new ServiceError("Empfehlung konnte nicht geloescht werden", error);
  },
};

/* ===========================================================================
 * orchestrationsService
 * ======================================================================== */

export const orchestrationsService = {
  async list(): Promise<AutomationOrchestration[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("automation_orchestrations")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new ServiceError("Orchestrierungen konnten nicht geladen werden", error);
    return (data ?? []) as AutomationOrchestration[];
  },

  async create(input: OrchestrationCreateInput): Promise<void> {
    const parsed = orchestrationInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase.from("automation_orchestrations").insert(parsed);
    if (error) throw new ServiceError("Orchestrierung konnte nicht erstellt werden", error);
  },

  async update(id: string, input: OrchestrationUpdateInput): Promise<void> {
    const parsed = orchestrationUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase.from("automation_orchestrations").update(parsed).eq("id", id);
    if (error) throw new ServiceError("Orchestrierung konnte nicht aktualisiert werden", error);
  },

  async setStatus(id: string, status: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("automation_orchestrations").update({ status }).eq("id", id);
    if (error) throw new ServiceError("Status konnte nicht gesetzt werden", error);
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("automation_orchestrations").delete().eq("id", id);
    if (error) throw new ServiceError("Orchestrierung konnte nicht geloescht werden", error);
  },
};

/* ===========================================================================
 * growthAlertsService
 * ======================================================================== */

export const growthAlertsService = {
  async list(resolved = false): Promise<GrowthAlert[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("growth_alerts")
      .select("*")
      .eq("resolved", resolved)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new ServiceError("Growth-Alerts konnten nicht geladen werden", error);
    return (data ?? []) as GrowthAlert[];
  },

  async create(input: GrowthAlertCreateInput): Promise<void> {
    const parsed = growthAlertInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase.from("growth_alerts").insert(parsed);
    if (error) throw new ServiceError("Growth-Alert konnte nicht erstellt werden", error);
  },

  async resolve(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("growth_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new ServiceError("Growth-Alert konnte nicht aufgeloest werden", error);
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("growth_alerts").delete().eq("id", id);
    if (error) throw new ServiceError("Growth-Alert konnte nicht geloescht werden", error);
  },
};
