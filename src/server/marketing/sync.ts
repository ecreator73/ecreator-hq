import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysStr, zurichToday } from "@/lib/marketing/range";
import { logMarketingActivity, type Admin } from "./crm";
import {
  getCredentials,
  getIntegration,
  googleEnv,
  saveIntegration,
  type GoogleConfig,
  type MetaAdsConfig,
  type MetaAdsCredentials,
} from "./integrations";
import { ProviderError } from "./providers/http";
import { syncGa4 } from "./providers/ga4";
import { syncGoogleAds } from "./providers/google-ads";
import { syncGsc } from "./providers/gsc";
import { syncMetaAds } from "./providers/meta-ads";

/**
 * Hintergrund-Abgleich (Vercel Cron, taeglich) und manueller Abgleich.
 * Nie waehrend oeffentlicher Seitenaufrufe. Inkrementell: die letzten Tage
 * werden erneut geladen (Plattformen korrigieren Werte nachtraeglich);
 * Backfill ueber `days`. Upserts sind idempotent. Jeder Lauf wird in
 * mi_sync_runs protokolliert, Fehler zusaetzlich in der Live-Aktivitaet.
 */

export type SyncProvider = "ga4" | "google_ads" | "gsc" | "meta_ads";
export const SYNC_PROVIDERS: SyncProvider[] = ["ga4", "google_ads", "gsc", "meta_ads"];

/** Standard-Fenster: Tage rueckwirkend (inkl. Verzug der Quelle). */
const DEFAULT_DAYS: Record<SyncProvider, number> = { ga4: 4, google_ads: 7, gsc: 7, meta_ads: 7 };
/** Quellen mit Verzug: Ende des Fensters. */
const END_OFFSET: Record<SyncProvider, number> = { ga4: 0, google_ads: 0, gsc: -2, meta_ads: 0 };

export interface SyncOutcome {
  provider: SyncProvider;
  status: "ok" | "error" | "skipped";
  rows: number;
  message?: string;
}

async function readyConfig(provider: SyncProvider): Promise<{ ok: true; run: (db: Admin, from: string, to: string) => Promise<number> } | { ok: false; reason: string }> {
  if (provider === "meta_ads") {
    const integ = await getIntegration<MetaAdsConfig>("meta_ads");
    const creds = await getCredentials<MetaAdsCredentials>("meta_ads");
    if (!integ || !creds?.token) return { ok: false, reason: "Meta Ads nicht verbunden" };
    if (!integ.config.ad_account_id) return { ok: false, reason: "Kein Werbekonto gewaehlt" };
    return {
      ok: true,
      run: (db, from, to) =>
        syncMetaAds(db, { token: creds.token!, accountId: integ.config.ad_account_id!, currency: integ.config.currency }, from, to),
    };
  }
  const google = await getIntegration<GoogleConfig>("google");
  if (!google?.has_credentials || !googleEnv()) return { ok: false, reason: "Google nicht verbunden" };
  const c = google.config;
  if (provider === "ga4") {
    if (!c.ga4_property_id) return { ok: false, reason: "Keine GA4-Property gewaehlt" };
    return { ok: true, run: (db, from, to) => syncGa4(db, c.ga4_property_id!, from, to) };
  }
  if (provider === "gsc") {
    if (!c.gsc_site_url) return { ok: false, reason: "Keine Search-Console-Property gewaehlt" };
    return { ok: true, run: (db, from, to) => syncGsc(db, c.gsc_site_url!, from, to) };
  }
  if (!googleEnv()?.developerToken) return { ok: false, reason: "Google-Ads-Developer-Token fehlt" };
  if (!c.ads_customer_id) return { ok: false, reason: "Kein Google-Ads-Konto gewaehlt" };
  return {
    ok: true,
    run: (db, from, to) =>
      syncGoogleAds(db, { customerId: c.ads_customer_id!, loginCustomerId: c.ads_login_customer_id, currency: c.ads_currency }, from, to),
  };
}

export async function runSync(provider: SyncProvider, opts: { days?: number; triggeredBy?: "cron" | "manual" } = {}): Promise<SyncOutcome> {
  const db = createAdminClient();
  const ready = await readyConfig(provider);
  if (!ready.ok) return { provider, status: "skipped", rows: 0, message: ready.reason };

  const days = Math.min(Math.max(opts.days ?? DEFAULT_DAYS[provider], 1), 400);
  const to = addDaysStr(zurichToday(), END_OFFSET[provider]);
  const from = addDaysStr(to, -(days - 1));
  const { data: run } = await db
    .from("mi_sync_runs")
    .insert({ provider, date_from: from, date_to: to, triggered_by: opts.triggeredBy ?? "cron" })
    .select("id")
    .single();
  const runId = (run as { id: string } | null)?.id;
  const integration = provider === "meta_ads" ? "meta_ads" : "google";

  try {
    // Grosse Backfills in 31-Tage-Stuecken (Rate Limits, Zeitlimit der Funktion).
    let rows = 0;
    for (let start = from; start <= to; start = addDaysStr(start, 31)) {
      const end = addDaysStr(start, 30) < to ? addDaysStr(start, 30) : to;
      rows += await ready.run(db, start, end);
    }
    const finished = new Date().toISOString();
    if (runId) await db.from("mi_sync_runs").update({ status: "ok", finished_at: finished, rows_upserted: rows }).eq("id", runId);
    await saveIntegration(integration, { status: "connected", last_sync_at: finished, last_error: null }, db);
    return { provider, status: "ok", rows };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : "Fehler").slice(0, 500);
    if (runId) await db.from("mi_sync_runs").update({ status: "error", finished_at: new Date().toISOString(), error: msg }).eq("id", runId);
    await saveIntegration(integration, { last_error: `${provider}: ${msg}`, ...(e instanceof ProviderError && e.authError ? { status: "error" } : {}) }, db);
    await logMarketingActivity(db, { type: "integration_error", severity: "error", source: provider, title: `Abgleich fehlgeschlagen: ${provider}`, detail: msg });
    return { provider, status: "error", rows: 0, message: msg };
  }
}

export async function runAllSyncs(triggeredBy: "cron" | "manual" = "cron"): Promise<SyncOutcome[]> {
  const out: SyncOutcome[] = [];
  for (const p of SYNC_PROVIDERS) out.push(await runSync(p, { triggeredBy }));
  return out;
}
