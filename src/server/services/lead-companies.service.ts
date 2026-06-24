import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { leadsService } from "./leads.service";
import { computeScores, buildOpportunities } from "@/lib/lead-opportunity-score";
import {
  leadCompanyInsertSchema,
  leadCompanyUpdateSchema,
  type LeadCompanyCreateInput,
  type LeadCompanyUpdateInput,
} from "@/lib/validation/lead-engine";
import type {
  LeadCompany,
  LeadCompanyWithStats,
  LeadOpportunity,
  LeadEngineDashboard,
  WebsiteScan,
} from "@/types/entities";

const SELECT = `*, source:lead_sources!lead_companies_source_id_fkey(id,name)`;

export interface LeadCompanyFilters {
  canton?: string;
  industry?: string;
  minScore?: number;
  opportunityType?: string;
  watchlistStatus?: string;
  handedOver?: boolean;
  search?: string;
}

/** Domain aus einer URL/Website normalisieren (fuer Dublettenerkennung). */
export function normalizeDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  let host = website.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "").replace(/^www\./, "");
  host = host.split("/")[0]!.split("?")[0]!.split("#")[0]!;
  return host || null;
}

function scoreColumns(scan: WebsiteScan) {
  const s = computeScores(scan);
  return {
    website_score: s.website,
    ads_score: s.ads,
    content_score: s.content,
    recruiting_score: s.recruiting,
    crm_score: s.crm,
    overall_score: s.overall,
  };
}

function mapRow(row: Record<string, unknown>): LeadCompanyWithStats {
  const { source, opportunity_count, ...rest } = row as Record<string, unknown> & {
    source?: unknown;
    opportunity_count?: number;
  };
  return {
    ...(rest as object),
    source: (source as LeadCompanyWithStats["source"]) ?? null,
    opportunity_count: opportunity_count ?? 0,
  } as LeadCompanyWithStats;
}

export const leadCompaniesService = {
  async list(filters: LeadCompanyFilters = {}): Promise<LeadCompanyWithStats[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("lead_companies")
      .select(SELECT)
      .is("deleted_at", null)
      .order("overall_score", { ascending: false });
    if (filters.canton) q = q.ilike("canton", filters.canton);
    if (filters.industry) q = q.ilike("industry", `%${filters.industry}%`);
    if (filters.minScore != null) q = q.gte("overall_score", filters.minScore);
    if (filters.watchlistStatus) q = q.eq("watchlist_status", filters.watchlistStatus);
    if (filters.handedOver != null) q = q.eq("handed_over", filters.handedOver);
    if (filters.search) {
      const like = `%${filters.search.trim()}%`;
      q = q.or(`name.ilike.${like},website.ilike.${like},city.ilike.${like},contact_name.ilike.${like}`);
    }
    const { data, error } = await q.limit(1000);
    if (error) throw new ServiceError("Firmen konnten nicht geladen werden", error);
    let rows = ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapRow);

    // Opportunity-Zaehler nachladen
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const { data: opps } = await supabase
        .from("lead_opportunities")
        .select("lead_company_id, opportunity_type")
        .in("lead_company_id", ids);
      const counts = new Map<string, number>();
      for (const o of (opps ?? []) as Array<{ lead_company_id: string }>) {
        counts.set(o.lead_company_id, (counts.get(o.lead_company_id) ?? 0) + 1);
      }
      rows = rows.map((r) => ({ ...r, opportunity_count: counts.get(r.id) ?? 0 }));
      if (filters.opportunityType) {
        const withType = new Set(
          ((opps ?? []) as Array<{ lead_company_id: string; opportunity_type: string }>)
            .filter((o) => o.opportunity_type === filters.opportunityType)
            .map((o) => o.lead_company_id),
        );
        rows = rows.filter((r) => withType.has(r.id));
      }
    }
    return rows;
  },

  async getWithStats(id: string): Promise<LeadCompanyWithStats | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("lead_companies")
      .select(SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Firma konnte nicht geladen werden", error);
    if (!data) return null;
    const row = mapRow(data as Record<string, unknown>);
    const { count } = await supabase
      .from("lead_opportunities")
      .select("id", { count: "exact", head: true })
      .eq("lead_company_id", id);
    return { ...row, opportunity_count: count ?? 0 };
  },

  /** Dublette anhand Domain/E-Mail/Telefon/Name finden. */
  async findDuplicate(fields: {
    domain?: string | null;
    email?: string | null;
    phone?: string | null;
    name?: string | null;
  }): Promise<LeadCompany | null> {
    const { supabase } = await getContext();
    const conds: string[] = [];
    if (fields.domain) conds.push(`domain.eq.${fields.domain}`);
    if (fields.email) conds.push(`email.eq.${fields.email}`);
    if (fields.phone) conds.push(`phone.eq.${fields.phone}`);
    if (fields.name) conds.push(`name.ilike.${fields.name}`);
    if (conds.length === 0) return null;
    const { data } = await supabase
      .from("lead_companies")
      .select("*")
      .is("deleted_at", null)
      .or(conds.join(","))
      .limit(1)
      .maybeSingle();
    return (data as unknown as LeadCompany) ?? null;
  },

  async replaceOpportunities(companyId: string, scan: WebsiteScan): Promise<void> {
    const { supabase } = await getContext();
    await supabase.from("lead_opportunities").delete().eq("lead_company_id", companyId);
    const opps = buildOpportunities(scan);
    if (opps.length > 0) {
      await supabase
        .from("lead_opportunities")
        .insert(opps.map((o) => ({ ...o, lead_company_id: companyId })));
    }
  },

  async create(input: LeadCompanyCreateInput): Promise<LeadCompany> {
    const parsed = leadCompanyInsertSchema.parse(input);
    const domain = normalizeDomain(parsed.website);
    const dup = await this.findDuplicate({
      domain,
      email: parsed.email,
      phone: parsed.phone,
      name: parsed.name,
    });
    if (dup) throw new ServiceError(`Firma existiert bereits (Duplikat: ${dup.name})`);

    const scan = (parsed.website_scan ?? {}) as WebsiteScan;
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("lead_companies")
      .insert({
        ...parsed,
        domain,
        ...scoreColumns(scan),
        last_analyzed_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw new ServiceError("Firma konnte nicht erstellt werden", error);
    const row = data as unknown as LeadCompany;
    await this.replaceOpportunities(row.id, scan);
    await recordAudit({ action: "create", entityType: "lead_company", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: LeadCompanyUpdateInput): Promise<LeadCompany> {
    const parsed = leadCompanyUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const patch: Record<string, unknown> = { ...parsed };
    if (parsed.website !== undefined) patch.domain = normalizeDomain(parsed.website);
    if (parsed.website_scan !== undefined) {
      const scan = (parsed.website_scan ?? {}) as WebsiteScan;
      Object.assign(patch, scoreColumns(scan), { last_analyzed_at: new Date().toISOString() });
    }
    const { data, error } = await supabase
      .from("lead_companies")
      .update(patch)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw new ServiceError("Firma konnte nicht aktualisiert werden", error);
    const row = data as unknown as LeadCompany;
    if (parsed.website_scan !== undefined) {
      await this.replaceOpportunities(id, (parsed.website_scan ?? {}) as WebsiteScan);
    }
    await recordAudit({ action: "update", entityType: "lead_company", entityId: id, newValues: row });
    return row;
  },

  /** Scores + Opportunities aus dem gespeicherten Scan neu berechnen. */
  async recompute(id: string): Promise<LeadCompany> {
    const company = await this.getWithStats(id);
    if (!company) throw new ServiceError("Firma nicht gefunden");
    const scan = (company.website_scan ?? {}) as WebsiteScan;
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("lead_companies")
      .update({ ...scoreColumns(scan), last_analyzed_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new ServiceError("Neuberechnung fehlgeschlagen", error);
    await this.replaceOpportunities(id, scan);
    return data as unknown as LeadCompany;
  },

  async setWatchlistStatus(id: string, status: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("lead_companies")
      .update({ watchlist_status: status })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Status konnte nicht gesetzt werden", error);
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("lead_companies")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Firma konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "lead_company", entityId: id });
  },

  /** An die Sales-Pipeline uebergeben: erzeugt einen Lead (Phase 4, Status Neu). */
  async handover(id: string): Promise<{ leadId: string }> {
    const company = await this.getWithStats(id);
    if (!company) throw new ServiceError("Firma nicht gefunden");
    if (company.handed_over && company.handed_over_lead_id) {
      return { leadId: company.handed_over_lead_id };
    }
    const lead = await leadsService.create({
      company_name: company.name,
      contact_name: company.contact_name ?? undefined,
      email: company.email ?? undefined,
      phone: company.phone ?? undefined,
      website: company.website ?? undefined,
      industry: company.industry ?? undefined,
      city: company.city ?? undefined,
      country: company.country ?? undefined,
      source: "outbound",
      notes: company.notes ?? undefined,
    });
    const { supabase } = await getContext();
    await supabase
      .from("lead_companies")
      .update({
        handed_over: true,
        handed_over_lead_id: lead.id,
        handed_over_at: new Date().toISOString(),
        watchlist_status: "active",
      })
      .eq("id", id);
    await recordAudit({ action: "handover", entityType: "lead_company", entityId: id, newValues: { leadId: lead.id } });
    return { leadId: lead.id };
  },

  /** CSV-Import: zeilenweise erstellen, Dubletten ueberspringen. */
  async bulkImport(
    rows: LeadCompanyCreateInput[],
  ): Promise<{ created: number; skipped: number; errors: { row: number; error: string }[] }> {
    let created = 0;
    let skipped = 0;
    const errors: { row: number; error: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        await this.create(rows[i]!);
        created++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Fehler";
        if (msg.includes("Duplikat")) skipped++;
        else errors.push({ row: i + 1, error: msg });
      }
    }
    return { created, skipped, errors };
  },

  async dashboard(): Promise<LeadEngineDashboard> {
    const all = await this.list({});
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoIso = weekAgo.toISOString();

    const cantonMap = new Map<string, number>();
    const industryMap = new Map<string, number>();
    for (const c of all) {
      if (c.canton) cantonMap.set(c.canton, (cantonMap.get(c.canton) ?? 0) + 1);
      if (c.industry) industryMap.set(c.industry, (industryMap.get(c.industry) ?? 0) + 1);
    }

    return {
      newToday: all.filter((c) => c.created_at.slice(0, 10) === today).length,
      newThisWeek: all.filter((c) => c.created_at >= weekAgoIso).length,
      total: all.length,
      hotCount: all.filter((c) => c.overall_score >= 75).length,
      handedOver: all.filter((c) => c.handed_over).length,
      byCanton: Array.from(cantonMap, ([canton, count]) => ({ canton, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      byIndustry: Array.from(industryMap, ([industry, count]) => ({ industry, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      topOpportunities: [...all].sort((a, b) => b.overall_score - a.overall_score).slice(0, 8),
      websiteOpps: all.filter((c) => c.website_score >= 60).length,
      adsOpps: all.filter((c) => c.ads_score >= 60).length,
      crmOpps: all.filter((c) => c.crm_score >= 60).length,
    };
  },
};

export const leadOpportunitiesService = {
  async listByCompany(companyId: string): Promise<LeadOpportunity[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("lead_opportunities")
      .select("*")
      .eq("lead_company_id", companyId)
      .order("score", { ascending: false });
    if (error) throw new ServiceError("Opportunities konnten nicht geladen werden", error);
    return (data ?? []) as unknown as LeadOpportunity[];
  },
};
