import { cache } from "react";
import { getContext, ServiceError } from "./_helpers";
import { leadsService } from "./leads.service";
import { recordAudit } from "@/lib/activity";
import { renderTemplate, extractVariables } from "@/lib/ai-prompt";
import {
  computeProspectScore,
  followupDateFor,
  isTerminalProspectStatus,
  prospectTemplateVariables,
  LINKEDIN_FOLLOWUP_RULES,
  HOT_PROSPECT_THRESHOLD,
} from "@/lib/linkedin";
import {
  linkedinCampaignInsertSchema,
  linkedinCampaignUpdateSchema,
  linkedinProspectInsertSchema,
  linkedinProspectUpdateSchema,
  linkedinActivityInsertSchema,
  linkedinTemplateInsertSchema,
  linkedinTemplateUpdateSchema,
  linkedinMessageInsertSchema,
  linkedinMessageUpdateSchema,
  linkedinImportRowSchema,
  type LinkedInCampaignCreateInput,
  type LinkedInCampaignUpdateInput,
  type LinkedInProspectCreateInput,
  type LinkedInProspectUpdateInput,
  type LinkedInActivityCreateInput,
  type LinkedInTemplateCreateInput,
  type LinkedInTemplateUpdateInput,
  type LinkedInMessageCreateInput,
  type LinkedInMessageUpdateInput,
  type LinkedInImportRow,
} from "@/lib/validation/linkedin";
import {
  LINKEDIN_TERMINAL_STATUSES,
  type LinkedInProspectStatus,
} from "@/config/catalog";
import type {
  LinkedInCampaign,
  LinkedInProspect,
  LinkedInProspectWithRelations,
  LinkedInActivity,
  LinkedInMessage,
  LinkedInMessageTemplate,
  TaskWithRelations,
} from "@/types/entities";

const PROSPECT_SELECT = `
  *,
  owner:profiles!linkedin_prospects_owner_id_fkey(id,full_name),
  campaign:linkedin_campaigns!linkedin_prospects_campaign_id_fkey(id,name)
`;

const todayISO = () => new Date().toISOString().slice(0, 10);

function mapProspect(row: Record<string, unknown>): LinkedInProspectWithRelations {
  const { owner, campaign, ...rest } = row as Record<string, unknown> & {
    owner?: unknown;
    campaign?: unknown;
  };
  return {
    ...(rest as object),
    owner: (owner as LinkedInProspectWithRelations["owner"]) ?? null,
    campaign: (campaign as LinkedInProspectWithRelations["campaign"]) ?? null,
  } as LinkedInProspectWithRelations;
}

async function logProspectActivity(
  type: string,
  prospectId: string,
  subject: string,
  body?: string | null,
): Promise<void> {
  try {
    const { supabase } = await getContext();
    await supabase
      .from("linkedin_activities")
      .insert({ prospect_id: prospectId, type, subject, body: body ?? null });
    await supabase
      .from("linkedin_prospects")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", prospectId);
  } catch {
    // best effort - Aktivitaetslog darf die Hauptaktion nie blockieren
  }
}

/* ==========================================================================
 * Kampagnen
 * ======================================================================== */

export const linkedinCampaignsService = {
  async list(): Promise<LinkedInCampaign[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("linkedin_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new ServiceError("Kampagnen konnten nicht geladen werden", error);
    return (data ?? []) as LinkedInCampaign[];
  },

  async create(input: LinkedInCampaignCreateInput): Promise<LinkedInCampaign> {
    const parsed = linkedinCampaignInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("linkedin_campaigns")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Kampagne konnte nicht erstellt werden", error);
    return data as LinkedInCampaign;
  },

  async update(id: string, input: LinkedInCampaignUpdateInput): Promise<void> {
    const parsed = linkedinCampaignUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase.from("linkedin_campaigns").update(parsed).eq("id", id);
    if (error) throw new ServiceError("Kampagne konnte nicht aktualisiert werden", error);
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("linkedin_campaigns")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) throw new ServiceError("Kampagne konnte nicht archiviert werden", error);
  },

  /** Kennzahlen je Kampagne (Prospects, Verbindungen, Antworten, Gewonnen). */
  async stats(): Promise<
    Array<{
      campaign: LinkedInCampaign;
      total: number;
      contacted: number;
      connected: number;
      replied: number;
      meetings: number;
      offers: number;
      won: number;
    }>
  > {
    const { supabase } = await getContext();
    // Kampagnen + Prospect-Status in EINER parallelen Welle.
    const [campRes, prosRes] = await Promise.all([
      supabase.from("linkedin_campaigns").select("*").order("created_at", { ascending: false }),
      supabase
        .from("linkedin_prospects")
        .select("campaign_id, status")
        .is("deleted_at", null),
    ]);
    if (campRes.error) throw new ServiceError("Kampagnen konnten nicht geladen werden", campRes.error);
    const campaigns = (campRes.data ?? []) as LinkedInCampaign[];
    const rows = (prosRes.data ?? []) as Array<{ campaign_id: string | null; status: string }>;

    const CONTACTED = new Set([
      "kontaktanfrage_gesendet", "verbunden", "erste_nachricht_gesendet", "antwort_erhalten",
      "termin_vereinbart", "angebot", "gewonnen", "verloren", "nicht_interessiert", "spaeter_kontaktieren",
    ]);
    const CONNECTED = new Set([
      "verbunden", "erste_nachricht_gesendet", "antwort_erhalten", "termin_vereinbart", "angebot", "gewonnen",
    ]);
    const REPLIED = new Set(["antwort_erhalten", "termin_vereinbart", "angebot", "gewonnen"]);
    const MEETING = new Set(["termin_vereinbart", "angebot", "gewonnen"]);
    const OFFER = new Set(["angebot", "gewonnen"]);

    return campaigns.map((campaign) => {
      const mine = rows.filter((r) => r.campaign_id === campaign.id);
      return {
        campaign,
        total: mine.length,
        contacted: mine.filter((r) => CONTACTED.has(r.status)).length,
        connected: mine.filter((r) => CONNECTED.has(r.status)).length,
        replied: mine.filter((r) => REPLIED.has(r.status)).length,
        meetings: mine.filter((r) => MEETING.has(r.status)).length,
        offers: mine.filter((r) => OFFER.has(r.status)).length,
        won: mine.filter((r) => r.status === "gewonnen").length,
      };
    });
  },
};

/* ==========================================================================
 * Prospects
 * ======================================================================== */

export interface ProspectFilters {
  search?: string;
  status?: string;
  campaign_id?: string;
  owner_id?: string;
  industry?: string;
  location?: string;
  company_size?: string;
  scoreMin?: number;
  includeArchived?: boolean;
}

export interface ProspectListResult {
  rows: LinkedInProspectWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

// NICHT async (Thenable-Gotcha): Builder unveraendert zurueckgeben.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyProspectFilters(filters: ProspectFilters, query: any) {
  let q = query.is("deleted_at", null);
  if (!filters.includeArchived) q = q.is("archived_at", null);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.campaign_id) q = q.eq("campaign_id", filters.campaign_id);
  if (filters.owner_id) q = q.eq("owner_id", filters.owner_id);
  if (filters.industry) q = q.ilike("industry", `%${filters.industry}%`);
  if (filters.location) q = q.ilike("location", `%${filters.location}%`);
  if (filters.company_size) q = q.eq("company_size", filters.company_size);
  if (typeof filters.scoreMin === "number") q = q.gte("lead_score", filters.scoreMin);
  if (filters.search) {
    const like = `%${filters.search.trim()}%`;
    q = q.or(
      [
        `full_name.ilike.${like}`,
        `company_name.ilike.${like}`,
        `industry.ilike.${like}`,
        `location.ilike.${like}`,
      ].join(","),
    );
  }
  return q;
}

export const linkedinProspectsService = {
  async list(
    filters: ProspectFilters = {},
    params: { page?: number; pageSize?: number; sort?: { column: string; ascending?: boolean } } = {},
  ): Promise<ProspectListResult> {
    const { supabase } = await getContext();
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
    const sort = params.sort ?? { column: "lead_score", ascending: false };
    let query = supabase
      .from("linkedin_prospects")
      .select(PROSPECT_SELECT, { count: "exact" })
      .order(sort.column, { ascending: sort.ascending ?? false });
    query = applyProspectFilters(filters, query);
    query = query.range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) throw new ServiceError("Prospects konnten nicht geladen werden", error);
    return {
      rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapProspect),
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  /** Pipeline-Ansicht: alle aktiven Prospects (fuer Kanban nach Status). */
  async board(filters: ProspectFilters = {}): Promise<LinkedInProspectWithRelations[]> {
    const { supabase } = await getContext();
    let query = supabase
      .from("linkedin_prospects")
      .select(PROSPECT_SELECT)
      .order("lead_score", { ascending: false });
    query = applyProspectFilters(filters, query);
    query = query.limit(500);
    const { data, error } = await query;
    if (error) throw new ServiceError("Pipeline konnte nicht geladen werden", error);
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapProspect);
  },

  async getById(id: string): Promise<LinkedInProspectWithRelations | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("linkedin_prospects")
      .select(PROSPECT_SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Prospect konnte nicht geladen werden", error);
    return data ? mapProspect(data as Record<string, unknown>) : null;
  },

  async create(input: LinkedInProspectCreateInput): Promise<LinkedInProspectWithRelations> {
    const parsed = linkedinProspectInsertSchema.parse(input);
    const { supabase, userId } = await getContext();
    const status = (parsed.status ?? "neu") as LinkedInProspectStatus;
    const next_followup_date = parsed.next_followup_date ?? followupDateFor(status);
    const lead_score = computeProspectScore({ ...parsed, status, priority: parsed.priority ?? "medium" });

    const { data, error } = await supabase
      .from("linkedin_prospects")
      .insert({ ...parsed, status, next_followup_date, lead_score, owner_id: parsed.owner_id ?? userId })
      .select(PROSPECT_SELECT)
      .single();
    if (error) throw new ServiceError("Prospect konnte nicht erstellt werden", error);
    const prospect = mapProspect(data as Record<string, unknown>);
    await logProspectActivity("system", prospect.id, "Prospect erstellt");
    return prospect;
  },

  async update(id: string, input: LinkedInProspectUpdateInput): Promise<void> {
    const parsed = linkedinProspectUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const existing = await this.getById(id);
    if (!existing) throw new ServiceError("Prospect nicht gefunden");

    // Score aus dem effektiven Zustand neu berechnen
    const eff = { ...existing, ...parsed };
    const lead_score = computeProspectScore({
      ...eff,
      status: (eff.status ?? existing.status) as string,
      priority: (eff.priority ?? existing.priority) as string,
    });

    const { error } = await supabase
      .from("linkedin_prospects")
      .update({ ...parsed, lead_score })
      .eq("id", id);
    if (error) throw new ServiceError("Prospect konnte nicht aktualisiert werden", error);
    // Historie: alle Aenderungen revisionssicher protokollieren
    await recordAudit({
      action: "update",
      entityType: "linkedin_prospect",
      entityId: id,
      oldValues: existing,
      newValues: parsed,
    });
  },

  /**
   * Statuswechsel: setzt Status + automatisches Follow-up (Datum + Aufgabe)
   * nach den Regeln (3 Tage nach Kontaktanfrage, 7 Tage nach 1. Nachricht, ...).
   */
  async move(id: string, status: LinkedInProspectStatus): Promise<void> {
    const { supabase } = await getContext();
    const existing = await this.getById(id);
    if (!existing) throw new ServiceError("Prospect nicht gefunden");
    if (existing.status === status) return;

    const terminal = isTerminalProspectStatus(status);
    const next_followup_date = terminal ? null : followupDateFor(status);
    const lead_score = computeProspectScore({ ...existing, status, priority: existing.priority });

    const { error } = await supabase
      .from("linkedin_prospects")
      .update({ status, next_followup_date, lead_score })
      .eq("id", id);
    if (error) throw new ServiceError("Status konnte nicht geaendert werden", error);

    await logProspectActivity(
      "status",
      id,
      `Status: ${existing.status} → ${status}`,
    );

    // Automatische Follow-up-Aufgabe nach Regelwerk
    const rule = LINKEDIN_FOLLOWUP_RULES[status];
    if (rule && next_followup_date) {
      try {
        await supabase.from("tasks").insert({
          title: `${rule.taskTitle}: ${existing.full_name}`,
          due_date: next_followup_date,
          linkedin_prospect_id: id,
          assigned_to: existing.owner_id,
        });
      } catch {
        // Aufgabe ist Komfort - Statuswechsel bleibt gueltig
      }
    }
    await recordAudit({
      action: "status_change",
      entityType: "linkedin_prospect",
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status },
    });
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("linkedin_prospects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new ServiceError("Prospect konnte nicht geloescht werden", error);
  },

  /**
   * CRM-Integration: Prospect -> Lead (Quelle: LinkedIn). Alle Daten werden
   * uebernommen, der Prospect bleibt ARCHIVIERT erhalten (klare Trennung).
   */
  async convertToLead(id: string): Promise<{ leadId: string }> {
    const existing = await this.getById(id);
    if (!existing) throw new ServiceError("Prospect nicht gefunden");
    if (existing.converted_lead_id) {
      return { leadId: existing.converted_lead_id };
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const notesParts = [
      existing.notes_md,
      existing.company_description ? `Unternehmen: ${existing.company_description}` : null,
      existing.possible_problems ? `Moegliche Probleme: ${existing.possible_problems}` : null,
      existing.linkedin_url ? `LinkedIn: ${existing.linkedin_url}` : null,
      existing.position ? `Position: ${existing.position}` : null,
    ].filter(Boolean);

    const lead = await leadsService.create({
      company_name: existing.company_name ?? existing.full_name,
      contact_name: existing.full_name,
      email: existing.email ?? undefined,
      phone: existing.phone ?? undefined,
      website: existing.website ?? undefined,
      industry: existing.industry ?? undefined,
      city: existing.location ?? undefined,
      source: "linkedin",
      status: "neu",
      owner_id: existing.owner_id ?? undefined,
      next_action_date: tomorrow.toISOString().slice(0, 10),
      notes: notesParts.length ? notesParts.join("\n\n") : undefined,
    });

    const { supabase } = await getContext();
    const { error } = await supabase
      .from("linkedin_prospects")
      .update({ converted_lead_id: lead.id, archived_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new ServiceError("Prospect konnte nicht archiviert werden", error);

    await logProspectActivity("system", id, "In Lead umgewandelt", `Lead-ID: ${lead.id}`);
    await recordAudit({
      action: "convert_to_lead",
      entityType: "linkedin_prospect",
      entityId: id,
      newValues: { lead_id: lead.id },
    });
    return { leadId: lead.id };
  },

  /** CSV-Import: dedupliziert nach LinkedIn-URL, sonst Name+Firma. */
  async bulkImport(
    rows: LinkedInImportRow[],
    opts: { campaign_id?: string | null } = {},
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    const { supabase, userId } = await getContext();
    const { data: existingRows } = await supabase
      .from("linkedin_prospects")
      .select("full_name, company_name, linkedin_url")
      .is("deleted_at", null);
    const byUrl = new Set(
      ((existingRows ?? []) as Array<{ linkedin_url: string | null }>)
        .map((r) => r.linkedin_url?.toLowerCase().replace(/\/+$/, ""))
        .filter(Boolean) as string[],
    );
    const byNameCompany = new Set(
      ((existingRows ?? []) as Array<{ full_name: string; company_name: string | null }>).map(
        (r) => `${r.full_name.toLowerCase()}|${(r.company_name ?? "").toLowerCase()}`,
      ),
    );

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const raw of rows) {
      const check = linkedinImportRowSchema.safeParse(raw);
      if (!check.success) {
        errors.push(`${raw.full_name ?? "?"}: ${check.error.issues[0]?.message ?? "ungueltig"}`);
        continue;
      }
      const row = check.data;
      const urlKey = row.linkedin_url?.toLowerCase().replace(/\/+$/, "");
      const nameKey = `${row.full_name.toLowerCase()}|${(row.company_name ?? "").toLowerCase()}`;
      if ((urlKey && byUrl.has(urlKey)) || byNameCompany.has(nameKey)) {
        skipped++;
        continue;
      }
      const { error } = await supabase.from("linkedin_prospects").insert({
        ...row,
        status: "neu",
        campaign_id: opts.campaign_id ?? null,
        owner_id: userId,
        next_followup_date: followupDateFor("neu"),
        lead_score: computeProspectScore({ ...row, status: "neu", priority: "medium" }),
      });
      if (error) {
        errors.push(`${row.full_name}: ${error.message}`);
        continue;
      }
      if (urlKey) byUrl.add(urlKey);
      byNameCompany.add(nameKey);
      created++;
    }
    return { created, skipped, errors };
  },

  /** Aufgaben zu einem Prospect (offene zuerst). */
  async tasks(prospectId: string): Promise<TaskWithRelations[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("tasks")
      .select("*, status:statuses!tasks_status_id_fkey(key,label,color)")
      .eq("linkedin_prospect_id", prospectId)
      .is("deleted_at", null)
      .order("due_date", { ascending: true })
      .limit(100);
    if (error) throw new ServiceError("Aufgaben konnten nicht geladen werden", error);
    return (data ?? []) as unknown as TaskWithRelations[];
  },
};

/* ==========================================================================
 * Aktivitaeten
 * ======================================================================== */

export const linkedinActivitiesService = {
  async listByProspect(prospectId: string, limit = 100): Promise<LinkedInActivity[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("linkedin_activities")
      .select("*, author:profiles!linkedin_activities_created_by_fkey(id,full_name)")
      .eq("prospect_id", prospectId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw new ServiceError("Aktivitaeten konnten nicht geladen werden", error);
    return (data ?? []) as unknown as LinkedInActivity[];
  },

  async create(input: LinkedInActivityCreateInput): Promise<void> {
    const parsed = linkedinActivityInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase.from("linkedin_activities").insert(parsed);
    if (error) throw new ServiceError("Aktivitaet konnte nicht erstellt werden", error);
    await supabase
      .from("linkedin_prospects")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", parsed.prospect_id);
  },
};

/* ==========================================================================
 * Nachrichten-Vorlagen + Nachrichten (KEIN automatischer Versand)
 * ======================================================================== */

export const linkedinTemplatesService = {
  async list(): Promise<LinkedInMessageTemplate[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("linkedin_message_templates")
      .select("*")
      .order("category", { ascending: true });
    if (error) throw new ServiceError("Vorlagen konnten nicht geladen werden", error);
    return (data ?? []) as LinkedInMessageTemplate[];
  },

  async create(input: LinkedInTemplateCreateInput): Promise<void> {
    const parsed = linkedinTemplateInsertSchema.parse(input);
    const { supabase } = await getContext();
    const variables = extractVariables(parsed.body ?? "");
    const { error } = await supabase
      .from("linkedin_message_templates")
      .insert({ ...parsed, variables });
    if (error) throw new ServiceError("Vorlage konnte nicht erstellt werden", error);
  },

  async update(id: string, input: LinkedInTemplateUpdateInput): Promise<void> {
    const parsed = linkedinTemplateUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const patch: Record<string, unknown> = { ...parsed };
    if (parsed.body !== undefined) patch.variables = extractVariables(parsed.body ?? "");
    const { error } = await supabase.from("linkedin_message_templates").update(patch).eq("id", id);
    if (error) throw new ServiceError("Vorlage konnte nicht aktualisiert werden", error);
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("linkedin_message_templates")
      .update({ active: false })
      .eq("id", id);
    if (error) throw new ServiceError("Vorlage konnte nicht deaktiviert werden", error);
  },
};

export const linkedinMessagesService = {
  async listByProspect(prospectId: string): Promise<LinkedInMessage[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("linkedin_messages")
      .select("*")
      .eq("prospect_id", prospectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new ServiceError("Nachrichten konnten nicht geladen werden", error);
    return (data ?? []) as LinkedInMessage[];
  },

  /**
   * Vorlage mit echten Prospect-Daten personalisieren -> ENTWURF.
   * Fabian prueft und versendet selbst ueber LinkedIn (kein Auto-Versand).
   */
  async personalize(prospectId: string, templateId: string): Promise<{ draftId: string; body: string; missing: string[] }> {
    const { supabase } = await getContext();
    const [prospect, tplRes] = await Promise.all([
      linkedinProspectsService.getById(prospectId),
      supabase.from("linkedin_message_templates").select("*").eq("id", templateId).maybeSingle(),
    ]);
    if (!prospect) throw new ServiceError("Prospect nicht gefunden");
    const tpl = tplRes.data as LinkedInMessageTemplate | null;
    if (!tpl) throw new ServiceError("Vorlage nicht gefunden");

    const vars = prospectTemplateVariables(prospect);
    const { text, missing } = renderTemplate(tpl.body, vars, { keepMissing: true });

    const { data, error } = await supabase
      .from("linkedin_messages")
      .insert({ prospect_id: prospectId, template_id: templateId, direction: "out", status: "draft", body: text })
      .select("id")
      .single();
    if (error) throw new ServiceError("Entwurf konnte nicht gespeichert werden", error);
    return { draftId: data.id as string, body: text, missing };
  },

  async create(input: LinkedInMessageCreateInput): Promise<void> {
    const parsed = linkedinMessageInsertSchema.parse(input);
    const { supabase } = await getContext();
    const status = parsed.status ?? "draft";
    const { error } = await supabase.from("linkedin_messages").insert({
      ...parsed,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });
    if (error) throw new ServiceError("Nachricht konnte nicht gespeichert werden", error);
    if (status !== "draft") {
      await logProspectActivity(
        status === "sent" ? "nachricht" : "antwort",
        parsed.prospect_id,
        status === "sent" ? "Nachricht gesendet (manuell via LinkedIn)" : "Antwort erhalten",
        parsed.body,
      );
    }
  },

  /** Entwurf bearbeiten oder als gesendet/erhalten markieren. */
  async update(id: string, input: LinkedInMessageUpdateInput): Promise<void> {
    const parsed = linkedinMessageUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data: existing } = await supabase
      .from("linkedin_messages")
      .select("id, prospect_id, status, body")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new ServiceError("Nachricht nicht gefunden");

    const patch: Record<string, unknown> = { ...parsed };
    if (parsed.status === "sent" && existing.status !== "sent") {
      patch.sent_at = new Date().toISOString();
    }
    const { error } = await supabase.from("linkedin_messages").update(patch).eq("id", id);
    if (error) throw new ServiceError("Nachricht konnte nicht aktualisiert werden", error);

    if (parsed.status === "sent" && existing.status !== "sent") {
      await logProspectActivity(
        "nachricht",
        existing.prospect_id as string,
        "Nachricht gesendet (manuell via LinkedIn)",
        (parsed.body ?? existing.body) as string,
      );
    }
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("linkedin_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new ServiceError("Nachricht konnte nicht geloescht werden", error);
  },
};

/* ==========================================================================
 * Dashboard + Statistiken
 * ======================================================================== */

export interface LinkedInDashboardData {
  contactToday: LinkedInProspectWithRelations[];
  followups: { overdue: number; today: number; week: number };
  newReplies: LinkedInProspectWithRelations[];
  newProspects7d: number;
  hotProspects: number;
  pipeline: Array<{ status: LinkedInProspectStatus; count: number }>;
  topCampaigns: Array<{ name: string; count: number; won: number }>;
}

/** Request-weit dedupliziert: aktive Prospects einmal laden, mehrfach nutzen. */
const loadActiveProspects = cache(async (): Promise<LinkedInProspectWithRelations[]> => {
  const { supabase } = await getContext();
  const { data, error } = await supabase
    .from("linkedin_prospects")
    .select(PROSPECT_SELECT)
    .is("deleted_at", null)
    .is("archived_at", null)
    .limit(2000);
  if (error) throw new ServiceError("Prospects konnten nicht geladen werden", error);
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapProspect);
});

export const linkedinDashboardService = {
  async dashboard(): Promise<LinkedInDashboardData> {
    const all = await loadActiveProspects();
    const today = todayISO();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const week = in7.toISOString().slice(0, 10);
    const since7 = new Date();
    since7.setDate(since7.getDate() - 7);
    const active = all.filter((p) => !isTerminalProspectStatus(p.status));

    const contactToday = active
      .filter((p) => p.next_followup_date && p.next_followup_date <= today)
      .sort((a, b) => (a.next_followup_date ?? "").localeCompare(b.next_followup_date ?? ""))
      .slice(0, 10);

    const pipelineMap = new Map<string, number>();
    for (const p of active) pipelineMap.set(p.status, (pipelineMap.get(p.status) ?? 0) + 1);

    const campMap = new Map<string, { count: number; won: number }>();
    for (const p of all) {
      const name = p.campaign?.name;
      if (!name) continue;
      const e = campMap.get(name) ?? { count: 0, won: 0 };
      e.count++;
      if (p.status === "gewonnen") e.won++;
      campMap.set(name, e);
    }

    return {
      contactToday,
      followups: {
        overdue: active.filter((p) => p.next_followup_date && p.next_followup_date < today).length,
        today: active.filter((p) => p.next_followup_date === today).length,
        week: active.filter(
          (p) => p.next_followup_date && p.next_followup_date > today && p.next_followup_date <= week,
        ).length,
      },
      newReplies: active
        .filter((p) => p.status === "antwort_erhalten")
        .sort((a, b) => (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? ""))
        .slice(0, 8),
      newProspects7d: all.filter((p) => p.created_at >= since7.toISOString()).length,
      hotProspects: active.filter((p) => p.lead_score >= HOT_PROSPECT_THRESHOLD).length,
      pipeline: (
        [...pipelineMap.entries()] as Array<[LinkedInProspectStatus, number]>
      ).map(([status, count]) => ({ status, count })),
      topCampaigns: [...campMap.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  },

  /** Follow-up-Listen (Heute / Diese Woche / Ueberfaellig) mit Prospects. */
  async followups(): Promise<{
    overdue: LinkedInProspectWithRelations[];
    today: LinkedInProspectWithRelations[];
    week: LinkedInProspectWithRelations[];
  }> {
    const all = await loadActiveProspects();
    const today = todayISO();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const week = in7.toISOString().slice(0, 10);
    const active = all.filter((p) => !isTerminalProspectStatus(p.status) && p.next_followup_date);
    const sortByDate = (a: LinkedInProspectWithRelations, b: LinkedInProspectWithRelations) =>
      (a.next_followup_date ?? "").localeCompare(b.next_followup_date ?? "");
    return {
      overdue: active.filter((p) => p.next_followup_date! < today).sort(sortByDate),
      today: active.filter((p) => p.next_followup_date === today).sort(sortByDate),
      week: active
        .filter((p) => p.next_followup_date! > today && p.next_followup_date! <= week)
        .sort(sortByDate),
    };
  },

  /** Gesamt-Kennzahlen (Statistiken-Seite). */
  async stats(): Promise<{
    total: number;
    new7d: number;
    contactRequests: number;
    connected: number;
    replyRate: number;
    meetings: number;
    offers: number;
    won: number;
    pipeline: Array<{ status: LinkedInProspectStatus; count: number }>;
  }> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("linkedin_prospects")
      .select("status, created_at")
      .is("deleted_at", null);
    if (error) throw new ServiceError("Statistiken konnten nicht geladen werden", error);
    const rows = (data ?? []) as Array<{ status: LinkedInProspectStatus; created_at: string }>;
    const since7 = new Date();
    since7.setDate(since7.getDate() - 7);

    const inSet = (keys: string[]) => rows.filter((r) => keys.includes(r.status)).length;
    const contacted = inSet([
      "kontaktanfrage_gesendet", "verbunden", "erste_nachricht_gesendet", "antwort_erhalten",
      "termin_vereinbart", "angebot", "gewonnen", "verloren", "nicht_interessiert", "spaeter_kontaktieren",
    ]);
    const messaged = inSet([
      "erste_nachricht_gesendet", "antwort_erhalten", "termin_vereinbart", "angebot", "gewonnen",
    ]);
    const replied = inSet(["antwort_erhalten", "termin_vereinbart", "angebot", "gewonnen"]);

    const pipelineMap = new Map<LinkedInProspectStatus, number>();
    for (const r of rows) {
      if ((LINKEDIN_TERMINAL_STATUSES as readonly string[]).includes(r.status)) continue;
      pipelineMap.set(r.status, (pipelineMap.get(r.status) ?? 0) + 1);
    }

    return {
      total: rows.length,
      new7d: rows.filter((r) => r.created_at >= since7.toISOString()).length,
      contactRequests: contacted,
      connected: inSet([
        "verbunden", "erste_nachricht_gesendet", "antwort_erhalten", "termin_vereinbart", "angebot", "gewonnen",
      ]),
      replyRate: messaged > 0 ? Math.round((replied / messaged) * 100) : 0,
      meetings: inSet(["termin_vereinbart", "angebot", "gewonnen"]),
      offers: inSet(["angebot", "gewonnen"]),
      won: inSet(["gewonnen"]),
      pipeline: [...pipelineMap.entries()].map(([status, count]) => ({ status, count })),
    };
  },
};
