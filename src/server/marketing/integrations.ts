import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret, hasCredentialsKey } from "@/lib/crypto";
import { ORG, type Admin } from "./crm";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Zugaenge der Marketing-Integrationen in der bestehenden Tabelle
 * `ad_integrations` (eine Zeile pro Anbieter). Secrets NUR verschluesselt
 * (`credentials_encrypted`, AES-256-GCM via CREDENTIALS_SECRET); `config`
 * enthaelt ausschliesslich unkritische Einstellungen (IDs, Namen).
 */

export type MarketingProvider = "google" | "calendly" | "meta_ads";

export interface GoogleCredentials {
  refresh_token?: string;
  access_token?: string;
  expires_at?: number; // epoch ms
  scope?: string;
}
export interface GoogleConfig {
  email?: string | null;
  ga4_property_id?: string | null;
  ga4_property_name?: string | null;
  ads_customer_id?: string | null;
  ads_customer_name?: string | null;
  ads_login_customer_id?: string | null;
  ads_currency?: string | null;
  ads_time_zone?: string | null;
  gsc_site_url?: string | null;
  scopes?: string[];
}
export interface CalendlyCredentials {
  token?: string;
  signing_key?: string;
}
export interface CalendlyConfig {
  user_uri?: string | null;
  user_name?: string | null;
  organization_uri?: string | null;
  webhook_uri?: string | null;
  webhook_url?: string | null;
}
export interface MetaAdsCredentials {
  token?: string;
}
export interface MetaAdsConfig {
  ad_account_id?: string | null;
  ad_account_name?: string | null;
  currency?: string | null;
  time_zone?: string | null;
}

export interface IntegrationRow<C = Record<string, unknown>> {
  provider: MarketingProvider;
  status: string; // disconnected/connected/error
  account_name: string | null;
  config: C;
  has_credentials: boolean;
  webhook_verified: boolean;
  webhook_last_event_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  updated_at: string | null;
}

function admin(): Admin {
  return createAdminClient();
}

async function raw(db: Admin, provider: MarketingProvider): Promise<any | null> {
  const { data } = await db.from("ad_integrations").select("*").eq("provider", provider).maybeSingle();
  return data ?? null;
}

export async function getIntegration<C = Record<string, unknown>>(provider: MarketingProvider): Promise<IntegrationRow<C> | null> {
  const row = await raw(admin(), provider);
  if (!row) return null;
  return {
    provider,
    status: row.status,
    account_name: row.account_name,
    config: (row.config ?? {}) as C,
    has_credentials: Boolean(row.credentials_encrypted),
    webhook_verified: Boolean(row.webhook_verified),
    webhook_last_event_at: row.webhook_last_event_at,
    last_sync_at: row.last_sync_at,
    last_error: row.last_error,
    updated_at: row.updated_at,
  };
}

export async function getCredentials<T>(provider: MarketingProvider, db: Admin = admin()): Promise<T | null> {
  const row = await raw(db, provider);
  if (!row?.credentials_encrypted || !hasCredentialsKey()) return null;
  try {
    return JSON.parse(decryptSecret(row.credentials_encrypted)) as T;
  } catch {
    return null;
  }
}

export async function saveIntegration(
  provider: MarketingProvider,
  patch: {
    status?: string;
    account_name?: string | null;
    config?: Record<string, unknown>;
    credentials?: Record<string, unknown> | null;
    webhook_verified?: boolean;
    last_error?: string | null;
    last_sync_at?: string | null;
  },
  db: Admin = admin(),
): Promise<void> {
  const row = await raw(db, provider);
  const update: Record<string, unknown> = { org_id: ORG, provider };
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.account_name !== undefined) update.account_name = patch.account_name;
  if (patch.config !== undefined) update.config = { ...(row?.config ?? {}), ...patch.config };
  if (patch.credentials !== undefined) {
    update.credentials_encrypted = patch.credentials ? encryptSecret(JSON.stringify(patch.credentials)) : null;
  }
  if (patch.webhook_verified !== undefined) update.webhook_verified = patch.webhook_verified;
  if (patch.last_error !== undefined) update.last_error = patch.last_error;
  if (patch.last_sync_at !== undefined) update.last_sync_at = patch.last_sync_at;
  if (!row && update.status === undefined) update.status = "disconnected";
  const { error } = await db.from("ad_integrations").upsert(update, { onConflict: "org_id,provider" });
  if (error) throw new Error(`Integration speichern: ${error.message}`);
}

export async function touchWebhook(provider: MarketingProvider, db: Admin = admin()): Promise<void> {
  await db.from("ad_integrations").update({ webhook_last_event_at: new Date().toISOString() }).eq("provider", provider);
}

/** Google-OAuth-Client aus der Server-Umgebung (nie im Browser). */
export function googleEnv(): { clientId: string; clientSecret: string; developerToken: string | null } | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || null };
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://ecreator-hq.vercel.app").replace(/\/$/, "");
}
