import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { leadsService } from "./leads.service";
import { invoicesService } from "./invoices.service";
import { pricingItemsService } from "./pricing.service";
import { aiRunsService } from "./ai.service";
import { PROPOSAL_TEMPLATES, PROPOSAL_TYPE_LABELS } from "@/config/catalog";
import {
  proposalInsertSchema,
  proposalUpdateSchema,
  proposalItemInsertSchema,
  proposalGenerateSchema,
  type ProposalCreateInput,
  type ProposalUpdateInput,
  type ProposalItemCreateInput,
  type ProposalGenerateInput,
} from "@/lib/validation/proposals";
import type {
  Proposal,
  ProposalWithRelations,
  ProposalDetail,
  ProposalItem,
  ProposalDashboard,
} from "@/types/entities";

const SELECT = `
  *,
  lead:leads!proposals_lead_id_fkey(id,company_name),
  client:clients!proposals_client_id_fkey(id,name)
`;

export interface ProposalFilters {
  status?: string;
  proposalType?: string;
  search?: string;
}

function mapRow(row: Record<string, unknown>): ProposalWithRelations {
  const { lead, client, ...rest } = row as Record<string, unknown> & { lead?: unknown; client?: unknown };
  return {
    ...(rest as object),
    lead: (lead as ProposalWithRelations["lead"]) ?? null,
    client: (client as ProposalWithRelations["client"]) ?? null,
  } as ProposalWithRelations;
}

export const proposalItemsService = {
  async listByProposal(proposalId: string): Promise<ProposalItem[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("order_index", { ascending: true });
    if (error) throw new ServiceError("Positionen konnten nicht geladen werden", error);
    return (data ?? []) as unknown as ProposalItem[];
  },
  async add(input: ProposalItemCreateInput): Promise<ProposalItem> {
    const parsed = proposalItemInsertSchema.parse(input);
    const total = Math.round((parsed.quantity ?? 1) * (parsed.unit_price ?? 0));
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("proposal_items")
      .insert({ ...parsed, total_price: total })
      .select("*")
      .single();
    if (error) throw new ServiceError("Position konnte nicht erstellt werden", error);
    await proposalsService.recomputeTotals(parsed.proposal_id);
    return data as unknown as ProposalItem;
  },
  async remove(id: string, proposalId: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("proposal_items").delete().eq("id", id);
    if (error) throw new ServiceError("Position konnte nicht geloescht werden", error);
    await proposalsService.recomputeTotals(proposalId);
  },
};

export const proposalsService = {
  async list(filters: ProposalFilters = {}): Promise<ProposalWithRelations[]> {
    const { supabase } = await getContext();
    let q = supabase.from("proposals").select(SELECT).is("deleted_at", null).order("created_at", { ascending: false });
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.proposalType) q = q.eq("proposal_type", filters.proposalType);
    if (filters.search) q = q.ilike("title", `%${filters.search.trim()}%`);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Angebote konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapRow);
  },

  async getDetail(id: string): Promise<ProposalDetail | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("proposals").select(SELECT).eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) throw new ServiceError("Angebot konnte nicht geladen werden", error);
    if (!data) return null;
    const proposal = mapRow(data as Record<string, unknown>);
    const items = await proposalItemsService.listByProposal(id);
    // Versionen (gleiche parent-Kette)
    const rootId = proposal.parent_id ?? proposal.id;
    const { data: versionsData } = await supabase
      .from("proposals")
      .select("id, version, status, created_at")
      .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
      .is("deleted_at", null)
      .order("version", { ascending: true });
    return { ...proposal, items, versions: (versionsData ?? []) as ProposalDetail["versions"] };
  },

  async create(input: ProposalCreateInput): Promise<Proposal> {
    const parsed = proposalInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("proposals").insert(parsed).select("*").single();
    if (error) throw new ServiceError("Angebot konnte nicht erstellt werden", error);
    const row = data as unknown as Proposal;
    await recordAudit({ action: "create", entityType: "proposal", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: ProposalUpdateInput): Promise<Proposal> {
    const parsed = proposalUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("proposals").update(parsed).eq("id", id).is("deleted_at", null).select("*").single();
    if (error) throw new ServiceError("Angebot konnte nicht aktualisiert werden", error);
    return data as unknown as Proposal;
  },

  async setStatus(id: string, status: string): Promise<Proposal> {
    return this.update(id, { status: status as ProposalUpdateInput["status"] });
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase.from("proposals").update({ deleted_at: new Date().toISOString(), updated_by: userId }).eq("id", id).is("deleted_at", null);
    if (error) throw new ServiceError("Angebot konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "proposal", entityId: id });
  },

  /** Summen aus den Positionen neu berechnen (amount = einmalig, monthly = wiederkehrend). */
  async recomputeTotals(proposalId: string): Promise<void> {
    const items = await proposalItemsService.listByProposal(proposalId);
    const amount = items.filter((i) => !i.recurring).reduce((s, i) => s + (i.total_price ?? 0), 0);
    const monthly = items.filter((i) => i.recurring).reduce((s, i) => s + (i.total_price ?? 0), 0);
    const { supabase } = await getContext();
    await supabase.from("proposals").update({ amount, monthly_amount: monthly }).eq("id", proposalId);
  },

  /**
   * Vorschlag generieren: erzeugt ein Proposal + Standard-Positionen (aus
   * PROPOSAL_TEMPLATES, Preise aus pricing_items) + Offertentext. Protokolliert
   * einen ai_run. Keine Live-AI in dieser Phase.
   */
  async generate(input: ProposalGenerateInput): Promise<Proposal> {
    const parsed = proposalGenerateSchema.parse(input);
    const lead = parsed.lead_id ? await leadsService.getById(parsed.lead_id).catch(() => null) : null;
    const typeLabel = PROPOSAL_TYPE_LABELS[parsed.proposal_type as keyof typeof PROPOSAL_TYPE_LABELS] ?? parsed.proposal_type;
    const company = lead?.company_name ?? "den Kunden";
    const title = parsed.title?.trim() || `${typeLabel}-Angebot fuer ${company}`;

    const proposal = await this.create({
      title,
      proposal_type: parsed.proposal_type,
      lead_id: parsed.lead_id,
      client_id: parsed.client_id,
      status: "draft",
      situation: `${company} hat aktuell ungenutztes Potenzial im Bereich ${typeLabel}.`,
      goal: parsed.goal?.trim() || `Mehr qualifizierte Anfragen und messbares Wachstum durch ${typeLabel}.`,
      solution: `eCreator setzt ein ${typeLabel}-Paket mit klaren Leistungen, Reporting und laufender Optimierung um.`,
      next_steps: "1. Angebot besprechen  2. Kickoff planen  3. Umsetzung starten",
      payment_terms: "Zahlbar innert 14 Tagen netto.",
      cancellation_terms: "Kuendigungsfrist 1 Monat auf Ende der Mindestlaufzeit.",
    });

    // Standard-Positionen aus Template + Preise aus pricing_items
    const template = PROPOSAL_TEMPLATES[parsed.proposal_type] ?? [];
    const pricing = await pricingItemsService.list(true).catch(() => []);
    for (let i = 0; i < template.length; i++) {
      const t = template[i]!;
      const match = pricing.find((p) => p.name.toLowerCase() === t.title.toLowerCase());
      await proposalItemsService.add({
        proposal_id: proposal.id,
        title: t.title,
        quantity: 1,
        unit_price: match?.unit_price ?? undefined,
        recurring: t.recurring,
        category: t.category as ProposalItemCreateInput["category"],
        order_index: i,
      });
    }

    await aiRunsService.log({
      entity_type: "proposal",
      entity_id: proposal.id,
      status: "success",
      input_data: { proposal_type: parsed.proposal_type, lead_id: parsed.lead_id ?? null },
      output_data: { note: "Vorschlag generiert (Vorschau - keine Live-AI).", title },
      token_usage: 0,
      cost_estimate: 0,
    });
    return this.getById(proposal.id) as Promise<Proposal>;
  },

  async getById(id: string): Promise<Proposal | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("proposals").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) throw new ServiceError("Angebot konnte nicht geladen werden", error);
    return (data as unknown as Proposal) ?? null;
  },

  /** Neue Version eines Angebots erzeugen (Positionen werden mitkopiert). */
  async newVersion(id: string): Promise<Proposal> {
    const detail = await this.getDetail(id);
    if (!detail) throw new ServiceError("Angebot nicht gefunden");
    const rootId = detail.parent_id ?? detail.id;
    const { supabase } = await getContext();
    const { data: maxVer } = await supabase
      .from("proposals")
      .select("version")
      .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((maxVer as { version?: number } | null)?.version ?? detail.version) + 1;

    const { data, error } = await supabase
      .from("proposals")
      .insert({
        lead_id: detail.lead_id,
        client_id: detail.client_id,
        title: detail.title,
        proposal_type: detail.proposal_type,
        status: "draft",
        version: nextVersion,
        parent_id: rootId,
        situation: detail.situation,
        goal: detail.goal,
        solution: detail.solution,
        next_steps: detail.next_steps,
        payment_terms: detail.payment_terms,
        cancellation_terms: detail.cancellation_terms,
        contract_duration_months: detail.contract_duration_months,
      })
      .select("*")
      .single();
    if (error) throw new ServiceError("Neue Version konnte nicht erstellt werden", error);
    const copy = data as unknown as Proposal;
    for (const it of detail.items) {
      await proposalItemsService.add({
        proposal_id: copy.id,
        title: it.title,
        description: it.description ?? undefined,
        quantity: it.quantity,
        unit_price: it.unit_price ?? undefined,
        recurring: it.recurring,
        category: it.category as ProposalItemCreateInput["category"],
        order_index: it.order_index,
      });
    }
    return copy;
  },

  /**
   * Rechnungsentwurf aus einem akzeptierten Angebot erstellen (Finance-
   * Integration). Erfordert Finance-Rechte (RLS auf invoices).
   */
  async createInvoiceDraft(id: string): Promise<{ invoiceId: string }> {
    const proposal = await this.getById(id);
    if (!proposal) throw new ServiceError("Angebot nicht gefunden");
    if (proposal.invoice_id) return { invoiceId: proposal.invoice_id };
    if (!proposal.client_id) throw new ServiceError("Kein Kunde verknuepft - bitte zuerst Kunde zuordnen.");
    const total = (proposal.amount ?? 0) + (proposal.setup_fee ?? 0);
    const invoice = await invoicesService.create({
      client_id: proposal.client_id,
      title: proposal.title,
      amount: total,
      status: "draft",
      notes: `Aus Angebot erstellt (Version ${proposal.version}).`,
    });
    const { supabase } = await getContext();
    await supabase.from("proposals").update({ invoice_id: invoice.id }).eq("id", id);
    return { invoiceId: invoice.id };
  },

  async dashboard(): Promise<ProposalDashboard> {
    const all = await this.list({});
    const by = (s: string) => all.filter((p) => p.status === s).length;
    const accepted = by("accepted");
    const sent = by("sent");
    const rejected = by("rejected");
    const decided = accepted + rejected;
    const volume = all
      .filter((p) => ["sent", "accepted"].includes(p.status))
      .reduce((s, p) => s + (p.amount ?? 0) + (p.setup_fee ?? 0), 0);
    return {
      drafts: by("draft"),
      review: by("review"),
      sent,
      accepted,
      openContracts: accepted,
      volume,
      winRate: decided > 0 ? Math.round((accepted / decided) * 100) : 0,
    };
  },
};
