import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { leadCompaniesService } from "./lead-companies.service";
import {
  computeAuditScores,
  buildFindings,
  buildAuditOpportunities,
  buildSummary,
} from "@/lib/website-audit";
import { auditInsertSchema, type AuditCreateInput } from "@/lib/validation/website-audit";
import type {
  WebsiteAudit,
  WebsiteAuditWithRelations,
  WebsiteAuditDetail,
  AuditFinding,
  AuditOpportunity,
  AuditDashboard,
  WebsiteScan,
} from "@/types/entities";

const SELECT = `*, company:lead_companies!website_audits_lead_company_id_fkey(id,name)`;

export interface AuditFilters {
  minScore?: number;
  maxScore?: number;
  search?: string;
}

function mapRow(row: Record<string, unknown>): WebsiteAuditWithRelations {
  const { company, ...rest } = row as Record<string, unknown> & { company?: unknown };
  return { ...(rest as object), company: (company as WebsiteAuditWithRelations["company"]) ?? null } as WebsiteAuditWithRelations;
}

function scoreColumns(scan: WebsiteScan) {
  const s = computeAuditScores(scan);
  return {
    design_score: s.design,
    conversion_score: s.conversion,
    seo_score: s.seo,
    trust_score: s.trust,
    performance_score: s.performance,
    mobile_score: s.mobile,
    content_score: s.content,
    tracking_score: s.tracking,
    overall_score: s.overall,
  };
}

async function loadScan(
  leadCompanyId: string | null | undefined,
): Promise<{ scan: WebsiteScan; url: string | null; label: string }> {
  if (!leadCompanyId) return { scan: {}, url: null, label: "Die Website" };
  const company = await leadCompaniesService.getWithStats(leadCompanyId).catch(() => null);
  if (!company) return { scan: {}, url: null, label: "Die Website" };
  return { scan: (company.website_scan ?? {}) as WebsiteScan, url: company.website, label: company.name };
}

export const websiteAuditsService = {
  async list(filters: AuditFilters = {}): Promise<WebsiteAuditWithRelations[]> {
    const { supabase } = await getContext();
    let q = supabase.from("website_audits").select(SELECT).is("deleted_at", null).order("created_at", { ascending: false });
    if (filters.minScore != null) q = q.gte("overall_score", filters.minScore);
    if (filters.maxScore != null) q = q.lte("overall_score", filters.maxScore);
    if (filters.search) q = q.ilike("url", `%${filters.search.trim()}%`);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Audits konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapRow);
  },

  async getDetail(id: string): Promise<WebsiteAuditDetail | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("website_audits").select(SELECT).eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) throw new ServiceError("Audit konnte nicht geladen werden", error);
    if (!data) return null;
    const audit = mapRow(data as Record<string, unknown>);
    const [findingsRes, oppsRes] = await Promise.all([
      supabase.from("audit_findings").select("*").eq("audit_id", id).order("severity", { ascending: true }),
      supabase.from("audit_opportunities").select("*").eq("audit_id", id).order("score", { ascending: false }),
    ]);
    return {
      ...audit,
      findings: (findingsRes.data ?? []) as unknown as AuditFinding[],
      opportunities: (oppsRes.data ?? []) as unknown as AuditOpportunity[],
    };
  },

  async create(input: AuditCreateInput): Promise<WebsiteAudit> {
    const parsed = auditInsertSchema.parse(input);
    const { scan, url, label } = await loadScan(parsed.lead_company_id);
    const scoresCols = scoreColumns(scan);
    const computed = computeAuditScores(scan);
    const findings = buildFindings(computed);
    const opportunities = buildAuditOpportunities(computed);
    const summary = buildSummary(computed, findings, opportunities, label);

    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("website_audits")
      .insert({
        lead_company_id: parsed.lead_company_id ?? null,
        url: parsed.url ?? url,
        status: "generated",
        ...scoresCols,
        executive_summary: summary.executive_summary,
        top_problems: summary.top_problems,
        quick_wins: summary.quick_wins,
        sales_opportunity: summary.sales_opportunity,
        generated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw new ServiceError("Audit konnte nicht erstellt werden", error);
    const audit = data as unknown as WebsiteAudit;

    if (findings.length) {
      await supabase.from("audit_findings").insert(findings.map((fd) => ({ ...fd, audit_id: audit.id })));
    }
    if (opportunities.length) {
      await supabase.from("audit_opportunities").insert(opportunities.map((o) => ({ ...o, audit_id: audit.id })));
    }
    await recordAudit({ action: "create", entityType: "website_audit", entityId: audit.id, newValues: audit });
    return audit;
  },

  /** Audit neu generieren (Scan erneut auswerten). */
  async generate(id: string): Promise<WebsiteAudit> {
    const { supabase } = await getContext();
    const existing = await this.getDetail(id);
    if (!existing) throw new ServiceError("Audit nicht gefunden");
    const { scan, label } = await loadScan(existing.lead_company_id);
    const computed = computeAuditScores(scan);
    const findings = buildFindings(computed);
    const opportunities = buildAuditOpportunities(computed);
    const summary = buildSummary(computed, findings, opportunities, label || existing.url || "Die Website");

    const { data, error } = await supabase
      .from("website_audits")
      .update({
        ...scoreColumns(scan),
        status: "generated",
        executive_summary: summary.executive_summary,
        top_problems: summary.top_problems,
        quick_wins: summary.quick_wins,
        sales_opportunity: summary.sales_opportunity,
        generated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new ServiceError("Audit konnte nicht generiert werden", error);

    await supabase.from("audit_findings").delete().eq("audit_id", id);
    await supabase.from("audit_opportunities").delete().eq("audit_id", id);
    if (findings.length) await supabase.from("audit_findings").insert(findings.map((fd) => ({ ...fd, audit_id: id })));
    if (opportunities.length) await supabase.from("audit_opportunities").insert(opportunities.map((o) => ({ ...o, audit_id: id })));
    return data as unknown as WebsiteAudit;
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("website_audits")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Audit konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "website_audit", entityId: id });
  },

  async dashboard(): Promise<AuditDashboard> {
    const all = await this.list({});
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoIso = weekAgo.toISOString();
    const scores = all.map((a) => a.overall_score);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return {
      newThisWeek: all.filter((a) => a.created_at >= weekAgoIso).length,
      total: all.length,
      avgScore,
      weakSites: all.filter((a) => a.overall_score < 60).length,
      hotChances: all.filter((a) => a.overall_score < 50).length,
      topOpportunities: [...all].sort((a, b) => a.overall_score - b.overall_score).slice(0, 8),
    };
  },
};
