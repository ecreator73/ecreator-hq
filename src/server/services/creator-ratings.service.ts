import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  creatorRatingInsertSchema,
  type CreatorRatingCreateInput,
} from "@/lib/validation/creators";
import type { CreatorRating } from "@/types/entities";

const SELECT = `*, author:profiles!creator_ratings_created_by_fkey(id,full_name)`;

function mapRow(row: Record<string, unknown>): CreatorRating {
  const { author, ...rest } = row as Record<string, unknown> & { author?: unknown };
  return {
    ...(rest as object),
    author: (author as CreatorRating["author"]) ?? null,
  } as CreatorRating;
}

export const creatorRatingsService = {
  async listByCreator(creatorId: string): Promise<CreatorRating[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("creator_ratings")
      .select(SELECT)
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });
    if (error) throw new ServiceError("Bewertungen konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapRow);
  },

  async create(input: CreatorRatingCreateInput): Promise<CreatorRating> {
    const parsed = creatorRatingInsertSchema.parse(input);
    // Internen Durchschnitt der gesetzten Kriterien (1-5) berechnen.
    const stars = [
      parsed.punctuality,
      parsed.appearance,
      parsed.camera_quality,
      parsed.communication,
      parsed.professionalism,
    ].filter((v): v is number => typeof v === "number");
    const overall = stars.length
      ? Math.round((stars.reduce((s, v) => s + v, 0) / stars.length) * 100) / 100
      : null;

    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("creator_ratings")
      .insert({ ...parsed, overall })
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Bewertung konnte nicht gespeichert werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "create", entityType: "creator_rating", entityId: row.id, newValues: row });
    return row;
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("creator_ratings").delete().eq("id", id);
    if (error) throw new ServiceError("Bewertung konnte nicht geloescht werden", error);
  },
};
