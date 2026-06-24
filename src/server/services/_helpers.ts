import type { ZodTypeAny } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logActivity, recordAudit } from "@/lib/activity";

/**
 * Gemeinsame Service-Bausteine. Alle Datenzugriffe der Anwendung laufen ueber
 * diese Schicht - niemals SQL/Supabase-Queries direkt in Komponenten.
 *
 * `createCrudService` kapselt das wiederkehrende CRUD-Muster (inkl. Zod-
 * Validierung, Soft-Delete, Audit- und Activity-Logging) genau EINMAL.
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/** Supabase-Server-Client + aktuelle Nutzer-ID (fuer created_by/updated_by). */
export async function getContext() {
  // Ohne Konfiguration (Demo-Modus) sofort abbrechen, statt langsam fehl-
  // zuschlagende Netzwerk-Requests gegen eine Platzhalter-URL auszuloesen.
  if (!isSupabaseConfigured()) {
    throw new ServiceError("Supabase ist nicht konfiguriert (Demo-Modus).");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/** Deutsche Substantive fuer den Activity-Feed. */
const ENTITY_NOUNS: Record<string, string> = {
  client: "Kunde",
  contact: "Kontakt",
  project: "Projekt",
  file: "Datei",
  meeting: "Meeting",
  contract: "Vertrag",
  offer: "Angebot",
};

export interface ListOptions {
  includeDeleted?: boolean;
  /** Gleichheits-Filter (null filtert auf IS NULL). */
  filter?: Record<string, string | null>;
}

export interface CrudConfig<Row> {
  table: string;
  /** entity_type fuer Audit/Activity (z.B. "client"). */
  entityType: string;
  insertSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  /** Spalten, die beim Erstellen auf die Nutzer-ID gesetzt werden. */
  createStampColumns: string[];
  /** Spalten, die beim Aendern/Loeschen auf die Nutzer-ID gesetzt werden. */
  updateStampColumns: string[];
  /** Wie ein Datensatz im Activity-Feed benannt wird. */
  label: (row: Row) => string;
  /** Standard-Sortierung (Default: created_at desc). */
  defaultOrder?: { column: string; ascending?: boolean };
}

export interface CrudService<Row, CreateInput, UpdateInput> {
  list(options?: ListOptions): Promise<Row[]>;
  getById(id: string): Promise<Row | null>;
  create(input: CreateInput): Promise<Row>;
  update(id: string, input: UpdateInput): Promise<Row>;
  remove(id: string): Promise<void>;
}

export function createCrudService<
  Row extends { id: string },
  CreateInput,
  UpdateInput,
>(config: CrudConfig<Row>): CrudService<Row, CreateInput, UpdateInput> {
  const order = config.defaultOrder ?? { column: "created_at", ascending: false };
  const noun = ENTITY_NOUNS[config.entityType] ?? config.entityType;

  return {
    async list(options: ListOptions = {}): Promise<Row[]> {
      const { supabase } = await getContext();
      let query = supabase
        .from(config.table)
        .select("*")
        .order(order.column, { ascending: order.ascending ?? false });
      if (!options.includeDeleted) query = query.is("deleted_at", null);
      if (options.filter) {
        for (const [key, value] of Object.entries(options.filter)) {
          query = value === null ? query.is(key, null) : query.eq(key, value);
        }
      }
      const { data, error } = await query;
      if (error)
        throw new ServiceError(`${config.table}: Laden fehlgeschlagen`, error);
      return (data ?? []) as unknown as Row[];
    },

    async getById(id: string): Promise<Row | null> {
      const { supabase } = await getContext();
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error)
        throw new ServiceError(`${config.table}: Laden fehlgeschlagen`, error);
      return (data as unknown as Row) ?? null;
    },

    async create(input: CreateInput): Promise<Row> {
      const parsed = config.insertSchema.parse(input);
      const { supabase, userId } = await getContext();
      const stamp: Record<string, unknown> = {};
      for (const col of config.createStampColumns) stamp[col] = userId;

      const { data, error } = await supabase
        .from(config.table)
        .insert({ ...parsed, ...stamp })
        .select("*")
        .single();
      if (error)
        throw new ServiceError(`${config.table}: Erstellen fehlgeschlagen`, error);

      const row = data as unknown as Row;
      await recordAudit({
        action: "create",
        entityType: config.entityType,
        entityId: row.id,
        newValues: row,
      });
      await logActivity({
        action: `${config.entityType}.created`,
        entityType: config.entityType,
        entityId: row.id,
        summary: `${noun} "${config.label(row)}" erstellt`,
      });
      return row;
    },

    async update(id: string, input: UpdateInput): Promise<Row> {
      const parsed = config.updateSchema.parse(input);
      const { supabase, userId } = await getContext();
      const stamp: Record<string, unknown> = {};
      for (const col of config.updateStampColumns) stamp[col] = userId;

      // Alten Stand fuer den Audit-Trail (alt/neu) laden.
      const { data: before } = await supabase
        .from(config.table)
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      const { data, error } = await supabase
        .from(config.table)
        .update({ ...parsed, ...stamp })
        .eq("id", id)
        .is("deleted_at", null)
        .select("*")
        .single();
      if (error)
        throw new ServiceError(
          `${config.table}: Aktualisieren fehlgeschlagen`,
          error,
        );

      const row = data as unknown as Row;
      await recordAudit({
        action: "update",
        entityType: config.entityType,
        entityId: id,
        oldValues: before ?? null,
        newValues: row,
      });
      await logActivity({
        action: `${config.entityType}.updated`,
        entityType: config.entityType,
        entityId: id,
        summary: `${noun} "${config.label(row)}" aktualisiert`,
      });
      return row;
    },

    /** Soft-Delete (setzt deleted_at). Harte Loeschung nur via super_admin/RLS. */
    async remove(id: string): Promise<void> {
      const { supabase, userId } = await getContext();

      // Nur nicht-geloeschte Datensaetze koennen geloescht werden; alten Stand
      // gleichzeitig fuer den Audit-Trail erfassen.
      const { data: before } = await supabase
        .from(config.table)
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!before)
        throw new ServiceError(
          `${config.table}: Datensatz nicht gefunden oder bereits geloescht`,
        );

      const patch: Record<string, unknown> = {
        deleted_at: new Date().toISOString(),
      };
      for (const col of config.updateStampColumns) patch[col] = userId;

      const { error } = await supabase
        .from(config.table)
        .update(patch)
        .eq("id", id)
        .is("deleted_at", null);
      if (error)
        throw new ServiceError(`${config.table}: Loeschen fehlgeschlagen`, error);

      await recordAudit({
        action: "delete",
        entityType: config.entityType,
        entityId: id,
        oldValues: before,
      });
      await logActivity({
        action: `${config.entityType}.deleted`,
        entityType: config.entityType,
        entityId: id,
        summary: `${noun} geloescht`,
      });
    },
  };
}
