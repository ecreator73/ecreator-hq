import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  approvalInsertSchema,
  approvalUpdateSchema,
  type ApprovalCreateInput,
  type ApprovalUpdateInput,
} from "@/lib/validation/production";
import type { ApprovalWithRelations } from "@/types/entities";

const SELECT = `
  *,
  client:clients!approvals_client_id_fkey(id,name),
  asset:assets!approvals_asset_id_fkey(id,title,file_url)
`;

export interface ApprovalFilters {
  clientId?: string;
  projectId?: string;
  assetId?: string;
  status?: string;
  statusIn?: string[];
}

function mapRow(row: Record<string, unknown>): ApprovalWithRelations {
  const { client, asset, ...rest } = row as Record<string, unknown> & {
    client?: unknown;
    asset?: unknown;
  };
  return {
    ...(rest as object),
    client: (client as ApprovalWithRelations["client"]) ?? null,
    asset: (asset as ApprovalWithRelations["asset"]) ?? null,
  } as ApprovalWithRelations;
}

export const approvalsService = {
  async list(filters: ApprovalFilters = {}): Promise<ApprovalWithRelations[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("approvals")
      .select(SELECT)
      .is("deleted_at", null)
      .order("requested_at", { ascending: false });
    if (filters.clientId) q = q.eq("client_id", filters.clientId);
    if (filters.projectId) q = q.eq("project_id", filters.projectId);
    if (filters.assetId) q = q.eq("asset_id", filters.assetId);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.statusIn?.length) q = q.in("status", filters.statusIn);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Freigaben konnten nicht geladen werden", error);
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapRow);
  },

  async getById(id: string): Promise<ApprovalWithRelations | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("approvals")
      .select(SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Freigabe konnte nicht geladen werden", error);
    return data ? mapRow(data as Record<string, unknown>) : null;
  },

  async create(input: ApprovalCreateInput): Promise<ApprovalWithRelations> {
    const parsed = approvalInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("approvals")
      .insert(parsed)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Freigabe konnte nicht erstellt werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "create", entityType: "approval", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: ApprovalUpdateInput): Promise<ApprovalWithRelations> {
    const parsed = approvalUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("approvals")
      .update(parsed)
      .eq("id", id)
      .is("deleted_at", null)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Freigabe konnte nicht aktualisiert werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "update", entityType: "approval", entityId: id, newValues: row });
    return row;
  },

  /** Status setzen; bei "approved" wird approved_at gesetzt, sonst zurueckgesetzt. */
  async setStatus(id: string, status: string): Promise<ApprovalWithRelations> {
    const approved_at =
      status === "approved" ? new Date().toISOString() : null;
    return this.update(id, {
      status: status as ApprovalUpdateInput["status"],
      approved_at,
    });
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("approvals")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Freigabe konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "approval", entityId: id });
  },
};
