import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  shootInsertSchema,
  shootUpdateSchema,
  type ShootCreateInput,
  type ShootUpdateInput,
} from "@/lib/validation/production";
import type { ShootWithRelations } from "@/types/entities";

const SELECT = `
  *,
  client:clients!shoots_client_id_fkey(id,name),
  content_project:content_projects!shoots_content_project_id_fkey(id,title)
`;

export interface ShootFilters {
  clientId?: string;
  status?: string;
  statusIn?: string[];
  contentProjectId?: string;
  from?: string;
  to?: string;
  upcoming?: boolean;
}

function mapRow(row: Record<string, unknown>): ShootWithRelations {
  const { client, content_project, ...rest } = row as Record<string, unknown> & {
    client?: unknown;
    content_project?: unknown;
  };
  return {
    ...(rest as object),
    client: (client as ShootWithRelations["client"]) ?? null,
    content_project:
      (content_project as ShootWithRelations["content_project"]) ?? null,
  } as ShootWithRelations;
}

export const shootsService = {
  async list(filters: ShootFilters = {}): Promise<ShootWithRelations[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("shoots")
      .select(SELECT)
      .is("deleted_at", null)
      .order("shooting_date", { ascending: true });
    if (filters.clientId) q = q.eq("client_id", filters.clientId);
    if (filters.contentProjectId)
      q = q.eq("content_project_id", filters.contentProjectId);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.statusIn?.length) q = q.in("status", filters.statusIn);
    if (filters.from) q = q.gte("shooting_date", filters.from);
    if (filters.to) q = q.lte("shooting_date", filters.to);
    if (filters.upcoming) q = q.gte("shooting_date", new Date().toISOString());
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Shootings konnten nicht geladen werden", error);
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapRow);
  },

  async listByClient(clientId: string): Promise<ShootWithRelations[]> {
    return this.list({ clientId });
  },

  async getById(id: string): Promise<ShootWithRelations | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("shoots")
      .select(SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Shooting konnte nicht geladen werden", error);
    return data ? mapRow(data as Record<string, unknown>) : null;
  },

  async create(input: ShootCreateInput): Promise<ShootWithRelations> {
    const parsed = shootInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("shoots")
      .insert(parsed)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Shooting konnte nicht erstellt werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "create", entityType: "shoot", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: ShootUpdateInput): Promise<ShootWithRelations> {
    const parsed = shootUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("shoots")
      .update(parsed)
      .eq("id", id)
      .is("deleted_at", null)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Shooting konnte nicht aktualisiert werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "update", entityType: "shoot", entityId: id, newValues: row });
    return row;
  },

  async setStatus(id: string, status: string): Promise<ShootWithRelations> {
    return this.update(id, { status: status as ShootUpdateInput["status"] });
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("shoots")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Shooting konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "shoot", entityId: id });
  },
};
