import { getContext, ServiceError } from "./_helpers";
import { clientsService } from "./clients.service";
import { recordAudit } from "@/lib/activity";
import { computeLeadScore } from "@/lib/lead-score";
import {
  leadInsertSchema,
  leadUpdateSchema,
  type LeadCreateInput,
  type LeadUpdateInput,
} from "@/lib/validation/leads";
import type { Client, LeadWithRelations } from "@/types/entities";

const LEAD_SELECT = `
  id, org_id, company_name, contact_name, email, phone, website, industry,
  company_size, city, country, source, lead_score, estimated_value, currency,
  status_id, owner_id, notes, next_action_date, created_by, updated_by,
  deleted_at, created_at, updated_at,
  status:statuses!leads_status_id_fkey(key,label,color),
  owner:profiles!leads_owner_id_fkey(id,full_name)
`;

type AnyClient = Awaited<ReturnType<typeof getContext>>["supabase"];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function resolveLeadStatus(supabase: AnyClient): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("statuses")
    .select("id,key")
    .eq("entity_type", "lead");
  return new Map(
    ((data ?? []) as Array<{ id: string; key: string }>).map((s) => [s.key, s.id]),
  );
}

function mapLead(row: Record<string, unknown>): LeadWithRelations {
  const { status, owner, ...rest } = row as Record<string, unknown> & {
    status?: unknown;
    owner?: unknown;
  };
  return {
    ...(rest as object),
    status: (status as LeadWithRelations["status"]) ?? null,
    owner: (owner as LeadWithRelations["owner"]) ?? null,
  } as LeadWithRelations;
}

/** Abschluss-Status ohne Follow-up-Pflicht. */
const TERMINAL_LEAD_STATUSES = ["abgeschlossen", "absage", "fehleintrag", "andere"];

function enforceFollowup(status: string, nextAction: unknown): void {
  if (TERMINAL_LEAD_STATUSES.includes(status)) return;
  if (!nextAction) {
    throw new ServiceError(
      "Bitte ein naechstes Follow-up-Datum setzen (oder einen Abschluss-Status waehlen).",
    );
  }
}

async function logSalesActivity(
  supabase: AnyClient,
  leadId: string,
  type: string,
  subject: string,
  body: string | null,
): Promise<void> {
  try {
    await supabase
      .from("sales_activities")
      .insert({ lead_id: leadId, type, subject, body });
  } catch {
    // best effort
  }
}

export interface LeadFilters {
  status?: string;
  excludeStatus?: string[];
  owner_id?: string;
  source?: string;
  industry?: string;
  scoreMin?: number;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
  overdue?: boolean;
}

export interface LeadListResult {
  rows: LeadWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

async function applyLeadFilters(
  reg: Map<string, string>,
  filters: LeadFilters,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
) {
  let q = query.is("deleted_at", null);
  if (filters.status) {
    const id = reg.get(filters.status);
    if (id) q = q.eq("status_id", id);
  }
  if (filters.excludeStatus?.length) {
    const ids = filters.excludeStatus.map((k) => reg.get(k)).filter(Boolean) as string[];
    if (ids.length) q = q.not("status_id", "in", `(${ids.join(",")})`);
  }
  if (filters.owner_id) q = q.eq("owner_id", filters.owner_id);
  if (filters.source) q = q.eq("source", filters.source);
  if (filters.industry) q = q.eq("industry", filters.industry);
  if (typeof filters.scoreMin === "number") q = q.gte("lead_score", filters.scoreMin);
  if (filters.dueFrom) q = q.gte("next_action_date", filters.dueFrom);
  if (filters.dueTo) q = q.lte("next_action_date", filters.dueTo);
  if (filters.overdue) q = q.lt("next_action_date", todayISO());
  if (filters.search) {
    const like = `%${filters.search.trim()}%`;
    q = q.or(
      [
        `company_name.ilike.${like}`,
        `contact_name.ilike.${like}`,
        `email.ilike.${like}`,
        `phone.ilike.${like}`,
      ].join(","),
    );
  }
  return q;
}

export const leadsService = {
  async list(
    filters: LeadFilters = {},
    params: { page?: number; pageSize?: number; sort?: { column: string; ascending?: boolean } } = {},
  ): Promise<LeadListResult> {
    const { supabase } = await getContext();
    const reg = await resolveLeadStatus(supabase);
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
    const sort = params.sort ?? { column: "lead_score", ascending: false };
    let query = supabase
      .from("leads")
      .select(LEAD_SELECT, { count: "exact" })
      .order(sort.column, { ascending: sort.ascending ?? false });
    query = await applyLeadFilters(reg, filters, query);
    query = query.range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) throw new ServiceError("Leads konnten nicht geladen werden", error);
    return {
      rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapLead),
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async board(filters: LeadFilters = {}): Promise<LeadWithRelations[]> {
    const { supabase } = await getContext();
    const reg = await resolveLeadStatus(supabase);
    let query = supabase
      .from("leads")
      .select(LEAD_SELECT)
      .order("lead_score", { ascending: false });
    query = await applyLeadFilters(reg, filters, query);
    query = query.limit(500);
    const { data, error } = await query;
    if (error) throw new ServiceError("Pipeline konnte nicht geladen werden", error);
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapLead);
  },

  async getById(id: string): Promise<LeadWithRelations | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Lead konnte nicht geladen werden", error);
    return data ? mapLead(data as Record<string, unknown>) : null;
  },

  async create(input: LeadCreateInput): Promise<LeadWithRelations> {
    const parsed = leadInsertSchema.parse(input);
    const { supabase } = await getContext();
    const reg = await resolveLeadStatus(supabase);

    const status = parsed.status ?? "neu";
    enforceFollowup(status, parsed.next_action_date);
    const score = computeLeadScore({
      status,
      estimated_value: parsed.estimated_value ?? null,
      company_size: parsed.company_size ?? null,
      next_action_date: (parsed.next_action_date as string | null) ?? null,
    });

    const { status: _s, ...fields } = parsed;
    const payload: Record<string, unknown> = { ...fields, lead_score: score };
    if (parsed.status) {
      const sid = reg.get(parsed.status);
      if (!sid) throw new ServiceError("Unbekannter Lead-Status");
      payload.status_id = sid;
    }

    const { data, error } = await supabase
      .from("leads")
      .insert(payload)
      .select(LEAD_SELECT)
      .single();
    if (error) throw new ServiceError("Lead konnte nicht erstellt werden", error);

    const lead = mapLead(data as Record<string, unknown>);
    await logSalesActivity(supabase, lead.id, "note", "Lead erstellt", null);
    await recordAudit({ action: "create", entityType: "lead", entityId: lead.id, newValues: lead });
    return lead;
  },

  async update(id: string, input: LeadUpdateInput): Promise<LeadWithRelations> {
    const parsed = leadUpdateSchema.parse(input);
    const { supabase, userId } = await getContext();
    const reg = await resolveLeadStatus(supabase);
    const before = await this.getById(id);
    if (!before) throw new ServiceError("Lead nicht gefunden");

    const effStatus = parsed.status ?? before.status?.key ?? "neu";
    const effNext =
      parsed.next_action_date !== undefined
        ? parsed.next_action_date
        : before.next_action_date;
    enforceFollowup(effStatus, effNext);
    const effValue =
      parsed.estimated_value !== undefined ? parsed.estimated_value : before.estimated_value;
    const effSize =
      parsed.company_size !== undefined ? parsed.company_size : before.company_size;
    const score = computeLeadScore({
      status: effStatus,
      estimated_value: effValue ?? null,
      company_size: (effSize as string | null) ?? null,
      next_action_date: (effNext as string | null) ?? null,
    });

    const { status: _s, ...fields } = parsed;
    const payload: Record<string, unknown> = { ...fields, lead_score: score, updated_by: userId };
    if (parsed.status !== undefined) {
      const sid = reg.get(parsed.status);
      if (!sid) throw new ServiceError("Unbekannter Lead-Status");
      payload.status_id = sid;
    }

    const { data, error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null)
      .select(LEAD_SELECT)
      .single();
    if (error) throw new ServiceError("Lead konnte nicht aktualisiert werden", error);

    const after = mapLead(data as Record<string, unknown>);
    if (parsed.status && before.status?.key !== after.status?.key) {
      await logSalesActivity(
        supabase,
        id,
        "note",
        `Status: ${before.status?.label ?? "-"} -> ${after.status?.label ?? "-"}`,
        null,
      );
    }
    await recordAudit({ action: "update", entityType: "lead", entityId: id, oldValues: before, newValues: after });
    return after;
  },

  /** Pipeline-Drag&Drop: Status setzen, Score neu berechnen, Follow-up sichern. */
  async move(id: string, statusKey: string): Promise<LeadWithRelations> {
    const { supabase, userId } = await getContext();
    const reg = await resolveLeadStatus(supabase);
    const sid = reg.get(statusKey);
    if (!sid) throw new ServiceError("Unbekannter Lead-Status");
    const before = await this.getById(id);

    const patch: Record<string, unknown> = { status_id: sid, updated_by: userId };
    let nextAction = before?.next_action_date ?? null;
    if (!TERMINAL_LEAD_STATUSES.includes(statusKey) && !nextAction) {
      nextAction = tomorrowISO();
      patch.next_action_date = nextAction;
    }
    patch.lead_score = computeLeadScore({
      status: statusKey,
      estimated_value: before?.estimated_value ?? null,
      company_size: (before?.company_size as string | null) ?? null,
      next_action_date: nextAction,
    });

    const { data, error } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", id)
      .is("deleted_at", null)
      .select(LEAD_SELECT)
      .single();
    if (error) throw new ServiceError("Lead konnte nicht verschoben werden", error);

    const after = mapLead(data as Record<string, unknown>);
    if (before && before.status?.key !== after.status?.key) {
      await logSalesActivity(
        supabase,
        id,
        "note",
        `Status: ${before.status?.label ?? "-"} -> ${after.status?.label ?? "-"}`,
        null,
      );
    }
    return after;
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const before = await this.getById(id);
    if (!before) throw new ServiceError("Lead nicht gefunden oder bereits geloescht");
    const { error } = await supabase
      .from("leads")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Lead konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "lead", entityId: id, oldValues: before });
  },

  /** Lead gewinnen -> Kunde erstellen + Lead auf "won". */
  async convertToClient(id: string): Promise<Client> {
    const { supabase } = await getContext();
    const lead = await this.getById(id);
    if (!lead) throw new ServiceError("Lead nicht gefunden");

    const client = await clientsService.create({
      name: lead.company_name,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
      website: lead.website ?? undefined,
      industry: lead.industry ?? undefined,
      city: lead.city ?? undefined,
      country: lead.country ?? undefined,
      account_manager_id: lead.owner_id ?? undefined,
      status: "onboarding",
      notes: lead.notes ?? undefined,
    });

    await this.move(id, "abgeschlossen");
    await logSalesActivity(
      supabase,
      id,
      "note",
      `Konvertiert zu Kunde: ${client.name}`,
      null,
    );
    return client;
  },
};
