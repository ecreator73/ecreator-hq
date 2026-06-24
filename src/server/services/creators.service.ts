import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { computeMatchScore } from "@/lib/creator-match";
import {
  creatorInsertSchema,
  creatorUpdateSchema,
  type CreatorCreateInput,
  type CreatorUpdateInput,
} from "@/lib/validation/creators";
import type {
  Creator,
  CreatorWithStats,
  CreatorMatch,
  MatchCriteria,
} from "@/types/entities";

const BOOKABLE = ["qualified", "pool", "active"];
const BOOKED_STATUSES = ["confirmed", "done"];

export interface CreatorFilters {
  status?: string;
  canton?: string;
  creatorType?: string;
  language?: string;
  minScore?: number;
  maxRate?: number;
  search?: string;
}

interface CreatorAux {
  ratingAvg: Map<string, number>;
  ratingCount: Map<string, number>;
  shootCount: Map<string, number>;
  lastBooked: Map<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadAux(supabase: any, ids: string[]): Promise<CreatorAux> {
  const ratingAvg = new Map<string, number>();
  const ratingCount = new Map<string, number>();
  const shootCount = new Map<string, number>();
  const lastBooked = new Map<string, string>();
  if (ids.length === 0)
    return { ratingAvg, ratingCount, shootCount, lastBooked };

  const [ratingsRes, assignRes] = await Promise.all([
    supabase.from("creator_ratings").select("creator_id, overall").in("creator_id", ids),
    supabase
      .from("shoot_assignments")
      .select("creator_id, status, created_at")
      .is("deleted_at", null)
      .in("creator_id", ids),
  ]);

  const sum = new Map<string, number>();
  for (const r of (ratingsRes.data ?? []) as Array<{
    creator_id: string;
    overall: number | null;
  }>) {
    if (r.overall == null) continue;
    sum.set(r.creator_id, (sum.get(r.creator_id) ?? 0) + Number(r.overall));
    ratingCount.set(r.creator_id, (ratingCount.get(r.creator_id) ?? 0) + 1);
  }
  for (const [id, total] of sum) {
    const c = ratingCount.get(id) ?? 1;
    ratingAvg.set(id, Math.round((total / c) * 10) / 10);
  }

  for (const a of (assignRes.data ?? []) as Array<{
    creator_id: string;
    status: string;
    created_at: string;
  }>) {
    if (!BOOKED_STATUSES.includes(a.status)) continue;
    shootCount.set(a.creator_id, (shootCount.get(a.creator_id) ?? 0) + 1);
    const prev = lastBooked.get(a.creator_id);
    if (!prev || a.created_at > prev) lastBooked.set(a.creator_id, a.created_at);
  }

  return { ratingAvg, ratingCount, shootCount, lastBooked };
}

function compose(c: Creator, aux: CreatorAux): CreatorWithStats {
  return {
    ...c,
    rating_avg: aux.ratingAvg.get(c.id) ?? null,
    rating_count: aux.ratingCount.get(c.id) ?? 0,
    shoot_count: aux.shootCount.get(c.id) ?? 0,
    last_booked: aux.lastBooked.get(c.id) ?? null,
  };
}

export const creatorsService = {
  async list(filters: CreatorFilters = {}): Promise<Creator[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("creators")
      .select("*")
      .is("deleted_at", null)
      .order("score", { ascending: false })
      .order("first_name", { ascending: true });
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.canton) q = q.ilike("canton", filters.canton);
    if (filters.creatorType) q = q.contains("creator_types", [filters.creatorType]);
    if (filters.language) q = q.contains("languages", [filters.language]);
    if (filters.minScore != null) q = q.gte("score", filters.minScore);
    if (filters.maxRate != null) q = q.lte("full_day_rate", filters.maxRate);
    if (filters.search) {
      const like = `%${filters.search.trim()}%`;
      q = q.or(
        `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},instagram_handle.ilike.${like},city.ilike.${like}`,
      );
    }
    const { data, error } = await q.limit(1000);
    if (error) throw new ServiceError("Creator konnten nicht geladen werden", error);
    return (data ?? []) as unknown as Creator[];
  },

  async listWithStats(filters: CreatorFilters = {}): Promise<CreatorWithStats[]> {
    const { supabase } = await getContext();
    const creators = await this.list(filters);
    if (creators.length === 0) return [];
    const aux = await loadAux(supabase, creators.map((c) => c.id));
    return creators.map((c) => compose(c, aux));
  },

  async getById(id: string): Promise<Creator | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("creators")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Creator konnte nicht geladen werden", error);
    return (data as unknown as Creator) ?? null;
  },

  async getWithStats(id: string): Promise<CreatorWithStats | null> {
    const { supabase } = await getContext();
    const c = await this.getById(id);
    if (!c) return null;
    const aux = await loadAux(supabase, [id]);
    return compose(c, aux);
  },

  async create(input: CreatorCreateInput): Promise<Creator> {
    const parsed = creatorInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("creators")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Creator konnte nicht erstellt werden", error);
    const row = data as unknown as Creator;
    await recordAudit({ action: "create", entityType: "creator", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: CreatorUpdateInput): Promise<Creator> {
    const parsed = creatorUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("creators")
      .update(parsed)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw new ServiceError("Creator konnte nicht aktualisiert werden", error);
    const row = data as unknown as Creator;
    await recordAudit({ action: "update", entityType: "creator", entityId: id, newValues: row });
    return row;
  },

  async setStatus(id: string, status: string): Promise<Creator> {
    return this.update(id, { status: status as CreatorUpdateInput["status"] });
  },

  /** Pipeline-Move (Statuswechsel) - Alias zu setStatus. */
  async move(id: string, status: string): Promise<Creator> {
    return this.setStatus(id, status);
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("creators")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Creator konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "creator", entityId: id });
  },

  /** CSV-Import: validiert + erstellt zeilenweise; sammelt Fehler. */
  async bulkCreate(
    rows: CreatorCreateInput[],
  ): Promise<{ created: number; errors: { row: number; error: string }[] }> {
    let created = 0;
    const errors: { row: number; error: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        await this.create(rows[i]!);
        created++;
      } catch (e) {
        errors.push({ row: i + 1, error: e instanceof Error ? e.message : "Fehler" });
      }
    }
    return { created, errors };
  },

  async dashboard(): Promise<{
    total: number;
    active: number;
    pool: number;
    newCount: number;
    avgDayRate: number | null;
    byCanton: { canton: string; count: number }[];
    byType: { type: string; count: number }[];
    topCreators: CreatorWithStats[];
    recentlyBooked: CreatorWithStats[];
  }> {
    const all = await this.listWithStats({});
    const active = all.filter((c) => c.status === "active");
    const poolish = all.filter((c) => ["pool", "active"].includes(c.status));
    const rates = poolish.map((c) => c.full_day_rate).filter((r): r is number => r != null);
    const avgDayRate = rates.length
      ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length)
      : null;

    const cantonMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    for (const c of all) {
      if (c.canton) cantonMap.set(c.canton, (cantonMap.get(c.canton) ?? 0) + 1);
      for (const t of c.creator_types) typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    }
    const byCanton = Array.from(cantonMap, ([canton, count]) => ({ canton, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const byType = Array.from(typeMap, ([type, count]) => ({ type, count })).sort(
      (a, b) => b.count - a.count,
    );

    const topCreators = [...all].sort((a, b) => b.score - a.score).slice(0, 5);
    const recentlyBooked = all
      .filter((c) => c.last_booked)
      .sort((a, b) => (b.last_booked ?? "").localeCompare(a.last_booked ?? ""))
      .slice(0, 5);

    return {
      total: all.length,
      active: active.length,
      pool: all.filter((c) => c.status === "pool").length,
      newCount: all.filter((c) => c.status === "new").length,
      avgDayRate,
      byCanton,
      byType,
      topCreators,
      recentlyBooked,
    };
  },

  async reporting(): Promise<{
    total: number;
    active: number;
    avgDayRate: number | null;
    topPerformers: CreatorWithStats[];
    mostBooked: CreatorWithStats[];
  }> {
    const all = await this.listWithStats({});
    const rates = all.map((c) => c.full_day_rate).filter((r): r is number => r != null);
    const avgDayRate = rates.length
      ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length)
      : null;
    const topPerformers = all
      .filter((c) => c.rating_avg != null)
      .sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0))
      .slice(0, 10);
    const mostBooked = [...all]
      .sort((a, b) => b.shoot_count - a.shoot_count)
      .filter((c) => c.shoot_count > 0)
      .slice(0, 10);
    return {
      total: all.length,
      active: all.filter((c) => c.status === "active").length,
      avgDayRate,
      topPerformers,
      mostBooked,
    };
  },

  /** Matching-Engine: passende Creator zu Shooting-Kriterien (0-100, sortiert). */
  async match(criteria: MatchCriteria, limit = 20): Promise<CreatorMatch[]> {
    const { supabase } = await getContext();
    const candidates = await this.listWithStats({});
    const pool = candidates.filter((c) => BOOKABLE.includes(c.status));
    if (pool.length === 0) return [];

    // Verfuegbarkeit fuer das Zieldatum aufloesen
    const availability = new Map<
      string,
      "available" | "limited" | "unavailable"
    >();
    if (criteria.date) {
      const { data } = await supabase
        .from("creator_availability")
        .select("creator_id, start_date, end_date, availability_type")
        .in("creator_id", pool.map((c) => c.id))
        .lte("start_date", criteria.date);
      for (const a of (data ?? []) as Array<{
        creator_id: string;
        start_date: string;
        end_date: string | null;
        availability_type: string;
      }>) {
        if (a.end_date && a.end_date < criteria.date) continue;
        const cur = availability.get(a.creator_id);
        const t = a.availability_type as "available" | "limited" | "unavailable";
        // Praezedenz: unavailable > available > limited
        if (
          t === "unavailable" ||
          (t === "available" && cur !== "unavailable") ||
          (t === "limited" && cur == null)
        ) {
          availability.set(a.creator_id, t);
        }
      }
    }

    const matches: CreatorMatch[] = pool.map((creator) => {
      const { total, breakdown } = computeMatchScore(creator, criteria, {
        availabilityType: availability.get(creator.id) ?? null,
      });
      return { creator, matchScore: total, breakdown };
    });

    const filtered =
      criteria.minScore != null
        ? matches.filter((m) => m.creator.score >= (criteria.minScore ?? 0))
        : matches;

    return filtered.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  },
};
