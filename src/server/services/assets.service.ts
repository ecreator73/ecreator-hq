import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  assetInsertSchema,
  assetUpdateSchema,
  type AssetCreateInput,
  type AssetUpdateInput,
} from "@/lib/validation/production";
import type { AssetWithRelations } from "@/types/entities";

const SELECT = `
  *,
  client:clients!assets_client_id_fkey(id,name),
  uploader:profiles!assets_uploaded_by_fkey(id,full_name)
`;

export interface AssetFilters {
  clientId?: string;
  projectId?: string;
  category?: string;
  search?: string;
}

function mapRow(row: Record<string, unknown>): AssetWithRelations {
  const { client, uploader, ...rest } = row as Record<string, unknown> & {
    client?: unknown;
    uploader?: unknown;
  };
  return {
    ...(rest as object),
    client: (client as AssetWithRelations["client"]) ?? null,
    uploader: (uploader as AssetWithRelations["uploader"]) ?? null,
  } as AssetWithRelations;
}

export const assetsService = {
  async list(filters: AssetFilters = {}): Promise<AssetWithRelations[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("assets")
      .select(SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (filters.clientId) q = q.eq("client_id", filters.clientId);
    if (filters.projectId) q = q.eq("project_id", filters.projectId);
    if (filters.category) q = q.eq("category", filters.category);
    if (filters.search) q = q.ilike("title", `%${filters.search.trim()}%`);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Assets konnten nicht geladen werden", error);
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapRow);
  },

  async listByClient(clientId: string): Promise<AssetWithRelations[]> {
    return this.list({ clientId });
  },

  async getById(id: string): Promise<AssetWithRelations | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("assets")
      .select(SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Asset konnte nicht geladen werden", error);
    return data ? mapRow(data as Record<string, unknown>) : null;
  },

  async create(input: AssetCreateInput): Promise<AssetWithRelations> {
    const parsed = assetInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("assets")
      .insert(parsed)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Asset konnte nicht erstellt werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "create", entityType: "asset", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: AssetUpdateInput): Promise<AssetWithRelations> {
    const parsed = assetUpdateSchema.parse(input);
    const { supabase, userId } = await getContext();
    const { data, error } = await supabase
      .from("assets")
      .update({ ...parsed, updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Asset konnte nicht aktualisiert werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "update", entityType: "asset", entityId: id, newValues: row });
    return row;
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("assets")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Asset konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "asset", entityId: id });
  },
};
