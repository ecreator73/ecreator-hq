import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  shootAssignmentInsertSchema,
  shootAssignmentUpdateSchema,
  type ShootAssignmentCreateInput,
  type ShootAssignmentUpdateInput,
} from "@/lib/validation/creators";
import type { ShootAssignmentWithRelations } from "@/types/entities";

const SELECT = `
  *,
  creator:creators!shoot_assignments_creator_id_fkey(id,first_name,last_name),
  shoot:shoots!shoot_assignments_shoot_id_fkey(id,title,shooting_date)
`;

export interface ShootAssignmentFilters {
  shootId?: string;
  creatorId?: string;
  status?: string;
  statusIn?: string[];
}

function mapRow(row: Record<string, unknown>): ShootAssignmentWithRelations {
  const { creator, shoot, ...rest } = row as Record<string, unknown> & {
    creator?: unknown;
    shoot?: unknown;
  };
  return {
    ...(rest as object),
    creator: (creator as ShootAssignmentWithRelations["creator"]) ?? null,
    shoot: (shoot as ShootAssignmentWithRelations["shoot"]) ?? null,
  } as ShootAssignmentWithRelations;
}

export const shootAssignmentsService = {
  async list(
    filters: ShootAssignmentFilters = {},
  ): Promise<ShootAssignmentWithRelations[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("shoot_assignments")
      .select(SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (filters.shootId) q = q.eq("shoot_id", filters.shootId);
    if (filters.creatorId) q = q.eq("creator_id", filters.creatorId);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.statusIn?.length) q = q.in("status", filters.statusIn);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Besetzungen konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapRow);
  },

  async listByShoot(shootId: string): Promise<ShootAssignmentWithRelations[]> {
    return this.list({ shootId });
  },

  async listByCreator(creatorId: string): Promise<ShootAssignmentWithRelations[]> {
    return this.list({ creatorId });
  },

  async create(
    input: ShootAssignmentCreateInput,
  ): Promise<ShootAssignmentWithRelations> {
    const parsed = shootAssignmentInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("shoot_assignments")
      .insert(parsed)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Besetzung konnte nicht erstellt werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "create", entityType: "shoot_assignment", entityId: row.id, newValues: row });
    return row;
  },

  async update(
    id: string,
    input: ShootAssignmentUpdateInput,
  ): Promise<ShootAssignmentWithRelations> {
    const parsed = shootAssignmentUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("shoot_assignments")
      .update(parsed)
      .eq("id", id)
      .is("deleted_at", null)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Besetzung konnte nicht aktualisiert werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "update", entityType: "shoot_assignment", entityId: id, newValues: row });
    return row;
  },

  async setStatus(id: string, status: string): Promise<ShootAssignmentWithRelations> {
    return this.update(id, { status: status as ShootAssignmentUpdateInput["status"] });
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("shoot_assignments")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Besetzung konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "shoot_assignment", entityId: id });
  },
};
