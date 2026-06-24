import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { encryptSecret } from "@/lib/crypto";
import {
  integrationInsertSchema,
  integrationUpdateSchema,
  webhookInsertSchema,
  webhookUpdateSchema,
  type IntegrationCreateInput,
  type IntegrationUpdateInput,
  type WebhookCreateInput,
  type WebhookUpdateInput,
} from "@/lib/validation/ai";
import type { IntegrationSafe, Webhook } from "@/types/entities";

interface IntegrationRow {
  id: string;
  name: string;
  provider: string | null;
  status: string;
  config: Record<string, unknown>;
  encrypted_credentials: string | null;
  created_at: string;
  updated_at: string;
}

/** UI-sichere Projektion: encrypted_credentials wird NIE zurueckgegeben. */
function toSafe(row: IntegrationRow): IntegrationSafe {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    status: row.status,
    config: row.config ?? {},
    has_credentials: Boolean(row.encrypted_credentials),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Audit-/Activity-sichere Felder (ohne jegliche Secrets). */
function auditSafe(row: IntegrationRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    status: row.status,
    has_credentials: Boolean(row.encrypted_credentials),
  };
}

export const integrationsService = {
  async list(): Promise<IntegrationSafe[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("integrations")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new ServiceError("Integrationen konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as IntegrationRow[]).map(toSafe);
  },

  async getById(id: string): Promise<IntegrationSafe | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ServiceError("Integration konnte nicht geladen werden", error);
    return data ? toSafe(data as unknown as IntegrationRow) : null;
  },

  async create(input: IntegrationCreateInput): Promise<IntegrationSafe> {
    const parsed = integrationInsertSchema.parse(input);
    const { credentials, ...rest } = parsed;
    const { supabase } = await getContext();
    const payload: Record<string, unknown> = { ...rest };
    if (credentials) payload.encrypted_credentials = encryptSecret(credentials);
    const { data, error } = await supabase
      .from("integrations")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new ServiceError("Integration konnte nicht erstellt werden", error);
    const row = data as unknown as IntegrationRow;
    await recordAudit({ action: "create", entityType: "integration", entityId: row.id, newValues: auditSafe(row) });
    return toSafe(row);
  },

  async update(id: string, input: IntegrationUpdateInput): Promise<IntegrationSafe> {
    const parsed = integrationUpdateSchema.parse(input);
    const { credentials, ...rest } = parsed;
    const { supabase } = await getContext();
    const payload: Record<string, unknown> = { ...rest };
    // Nur neu verschluesseln, wenn ein neues Secret uebergeben wurde.
    if (credentials) payload.encrypted_credentials = encryptSecret(credentials);
    const { data, error } = await supabase
      .from("integrations")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new ServiceError("Integration konnte nicht aktualisiert werden", error);
    const row = data as unknown as IntegrationRow;
    await recordAudit({ action: "update", entityType: "integration", entityId: id, newValues: auditSafe(row) });
    return toSafe(row);
  },

  async setStatus(id: string, status: string): Promise<IntegrationSafe> {
    return this.update(id, { status });
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("integrations").delete().eq("id", id);
    if (error) throw new ServiceError("Integration konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "integration", entityId: id });
  },
};

export const webhooksService = {
  async list(): Promise<Webhook[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("webhooks")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new ServiceError("Webhooks konnten nicht geladen werden", error);
    return (data ?? []) as unknown as Webhook[];
  },

  async create(input: WebhookCreateInput): Promise<Webhook> {
    const parsed = webhookInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("webhooks")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Webhook konnte nicht erstellt werden", error);
    const row = data as unknown as Webhook;
    await recordAudit({ action: "create", entityType: "webhook", entityId: row.id, newValues: { id: row.id, name: row.name, provider: row.provider } });
    return row;
  },

  async update(id: string, input: WebhookUpdateInput): Promise<Webhook> {
    const parsed = webhookUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("webhooks")
      .update(parsed)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new ServiceError("Webhook konnte nicht aktualisiert werden", error);
    const row = data as unknown as Webhook;
    await recordAudit({ action: "update", entityType: "webhook", entityId: id, newValues: { id: row.id, name: row.name, provider: row.provider } });
    return row;
  },

  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("webhooks").delete().eq("id", id);
    if (error) throw new ServiceError("Webhook konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "webhook", entityId: id });
  },
};
