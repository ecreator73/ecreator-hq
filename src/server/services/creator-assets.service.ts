import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  creatorAssetInsertSchema,
  creatorAssetUpdateSchema,
  type CreatorAssetCreateInput,
  type CreatorAssetUpdateInput,
} from "@/lib/validation/creators";
import type { CreatorAsset } from "@/types/entities";

export const creatorAssetsService = {
  async listByCreator(creatorId: string): Promise<CreatorAsset[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("creator_assets")
      .select("*")
      .eq("creator_id", creatorId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new ServiceError("Portfolio konnte nicht geladen werden", error);
    return (data ?? []) as unknown as CreatorAsset[];
  },

  async create(input: CreatorAssetCreateInput): Promise<CreatorAsset> {
    const parsed = creatorAssetInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("creator_assets")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Portfolio-Eintrag konnte nicht erstellt werden", error);
    const row = data as unknown as CreatorAsset;
    await recordAudit({ action: "create", entityType: "creator_asset", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: CreatorAssetUpdateInput): Promise<CreatorAsset> {
    const parsed = creatorAssetUpdateSchema.parse(input);
    const { supabase, userId } = await getContext();
    const { data, error } = await supabase
      .from("creator_assets")
      .update({ ...parsed, updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw new ServiceError("Portfolio-Eintrag konnte nicht aktualisiert werden", error);
    return data as unknown as CreatorAsset;
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("creator_assets")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Portfolio-Eintrag konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "creator_asset", entityId: id });
  },
};
