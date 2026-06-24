import type { ZodTypeAny } from "zod";
import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import type { ClientMini, ProfileMini } from "@/types/entities";

/**
 * Generische Service-Fabrik fuer die spezialisierten Produktions-Projektarten
 * (website/ad/crm/content). Alle teilen dieselbe Form: client_id + owner_id +
 * status + Soft-Delete und betten Kunde/Owner per FK-Hint ein. Status wird
 * datenbankseitig gegen die Registry validiert; created_by/updated_by setzen
 * die Stempel-Trigger (stamp_actor / *_stamp_update).
 */

export interface ProductionProjectFilters {
  clientId?: string;
  ownerId?: string;
  status?: string;
  statusIn?: string[];
  search?: string;
}

interface FactoryConfig {
  table: string;
  entityType: string;
  insertSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
}

export interface ProductionProjectService<Row, CreateInput, UpdateInput> {
  list(filters?: ProductionProjectFilters): Promise<Row[]>;
  getById(id: string): Promise<Row | null>;
  create(input: CreateInput): Promise<Row>;
  update(id: string, input: UpdateInput): Promise<Row>;
  setStatus(id: string, status: string): Promise<Row>;
  remove(id: string): Promise<void>;
}

export function createProductionProjectService<
  Row extends {
    id: string;
    client: ClientMini | null;
    owner: ProfileMini | null;
  },
  CreateInput,
  UpdateInput,
>(config: FactoryConfig): ProductionProjectService<Row, CreateInput, UpdateInput> {
  const select = `*, client:clients!${config.table}_client_id_fkey(id,name), owner:profiles!${config.table}_owner_id_fkey(id,full_name)`;

  function mapRow(row: Record<string, unknown>): Row {
    const { client, owner, ...rest } = row as Record<string, unknown> & {
      client?: unknown;
      owner?: unknown;
    };
    return {
      ...(rest as object),
      client: (client as ClientMini) ?? null,
      owner: (owner as ProfileMini) ?? null,
    } as Row;
  }

  const service: ProductionProjectService<Row, CreateInput, UpdateInput> = {
    async list(filters: ProductionProjectFilters = {}): Promise<Row[]> {
      const { supabase } = await getContext();
      let q = supabase
        .from(config.table)
        .select(select)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.ownerId) q = q.eq("owner_id", filters.ownerId);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.statusIn?.length) q = q.in("status", filters.statusIn);
      if (filters.search) q = q.ilike("title", `%${filters.search.trim()}%`);
      const { data, error } = await q.limit(500);
      if (error)
        throw new ServiceError(`${config.table}: Laden fehlgeschlagen`, error);
      return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(
        mapRow,
      );
    },

    async getById(id: string): Promise<Row | null> {
      const { supabase } = await getContext();
      const { data, error } = await supabase
        .from(config.table)
        .select(select)
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error)
        throw new ServiceError(`${config.table}: Laden fehlgeschlagen`, error);
      return data ? mapRow(data as unknown as Record<string, unknown>) : null;
    },

    async create(input: CreateInput): Promise<Row> {
      const parsed = config.insertSchema.parse(input);
      const { supabase } = await getContext();
      const { data, error } = await supabase
        .from(config.table)
        .insert(parsed)
        .select(select)
        .single();
      if (error)
        throw new ServiceError(`${config.table}: Erstellen fehlgeschlagen`, error);
      const row = mapRow(data as unknown as Record<string, unknown>);
      await recordAudit({
        action: "create",
        entityType: config.entityType,
        entityId: row.id,
        newValues: row,
      });
      return row;
    },

    async update(id: string, input: UpdateInput): Promise<Row> {
      const parsed = config.updateSchema.parse(input);
      const { supabase } = await getContext();
      const { data, error } = await supabase
        .from(config.table)
        .update(parsed)
        .eq("id", id)
        .is("deleted_at", null)
        .select(select)
        .single();
      if (error)
        throw new ServiceError(
          `${config.table}: Aktualisieren fehlgeschlagen`,
          error,
        );
      const row = mapRow(data as unknown as Record<string, unknown>);
      await recordAudit({
        action: "update",
        entityType: config.entityType,
        entityId: id,
        newValues: row,
      });
      return row;
    },

    async setStatus(id: string, status: string): Promise<Row> {
      return service.update(id, { status } as unknown as UpdateInput);
    },

    async remove(id: string): Promise<void> {
      const { supabase, userId } = await getContext();
      const { error } = await supabase
        .from(config.table)
        .update({ deleted_at: new Date().toISOString(), updated_by: userId })
        .eq("id", id)
        .is("deleted_at", null);
      if (error)
        throw new ServiceError(`${config.table}: Loeschen fehlgeschlagen`, error);
      await recordAudit({
        action: "delete",
        entityType: config.entityType,
        entityId: id,
      });
    },
  };

  return service;
}
