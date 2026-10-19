"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { LEADERSHIP_ROLES } from "@/config/navigation";
import { recordAudit } from "@/lib/activity";
import { hasCredentialsKey } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  appBaseUrl,
  getCredentials,
  getIntegration,
  saveIntegration,
  type CalendlyConfig,
  type CalendlyCredentials,
  type GoogleConfig,
  type MetaAdsCredentials,
} from "@/server/marketing/integrations";
import { backfillCalendly, calendlyMe, ensureCalendlyWebhook, newSigningKey } from "@/server/marketing/providers/calendly";
import { listGa4Properties } from "@/server/marketing/providers/ga4";
import { listAdsCustomers } from "@/server/marketing/providers/google-ads";
import { listGscSites } from "@/server/marketing/providers/gsc";
import { listMetaAdAccounts } from "@/server/marketing/providers/meta-ads";
import { runSync, SYNC_PROVIDERS, type SyncOutcome, type SyncProvider } from "@/server/marketing/sync";

/**
 * Einstellungen der Marketing-Integrationen. Nur Leitung (super_admin/ceo/cso),
 * serverseitig geprueft. Tokens werden nie zurueck an den Browser gegeben.
 * Server Actions sind durch Next.js gegen CSRF geschuetzt (Origin-Pruefung).
 */

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Unbekannter Fehler" });
const done = () => revalidatePath("/marketing", "layout");

function needKey() {
  if (!hasCredentialsKey()) throw new Error("CREDENTIALS_SECRET fehlt - Zugangsdaten koennen nicht verschluesselt gespeichert werden.");
}

/* ---------------- Calendly ---------------- */

export async function connectCalendlyAction(token: string): Promise<ActionResult> {
  try {
    await requireRole(LEADERSHIP_ROLES);
    needKey();
    const t = z.string().trim().min(20).max(2000).parse(token);
    const me = await calendlyMe(t);
    const signing = newSigningKey();
    const url = `${appBaseUrl()}/api/webhooks/calendly`;
    const hook = await ensureCalendlyWebhook(t, me, url, signing);
    await saveIntegration("calendly", {
      status: "connected",
      account_name: me.name,
      credentials: { token: t, signing_key: signing },
      config: { user_uri: me.uri, user_name: me.name, organization_uri: me.organization, webhook_uri: hook.uri, webhook_url: url },
      webhook_verified: true,
      last_error: null,
    });
    await recordAudit({ action: "integration.connect", entityType: "marketing", newValues: { provider: "calendly", scope: hook.scope } });
    done();
    return { ok: true, message: `Verbunden (${me.name}), Webhook aktiv (${hook.scope === "organization" ? "Organisation" : "Benutzer"}).` };
  } catch (e) {
    return fail(e);
  }
}

export async function backfillCalendlyAction(days: number): Promise<ActionResult> {
  try {
    await requireRole(LEADERSHIP_ROLES);
    const creds = await getCredentials<CalendlyCredentials>("calendly");
    const integ = await getIntegration<CalendlyConfig>("calendly");
    if (!creds?.token || !integ?.config.organization_uri || !integ.config.user_uri) throw new Error("Calendly ist nicht verbunden.");
    const n = await backfillCalendly(createAdminClient(), creds.token, { uri: integ.config.user_uri, organization: integ.config.organization_uri }, Math.min(Math.max(days, 1), 365));
    await saveIntegration("calendly", { last_sync_at: new Date().toISOString(), last_error: null });
    done();
    return { ok: true, message: `${n} Teilnehmer abgeglichen (keine Dubletten).` };
  } catch (e) {
    await saveIntegration("calendly", { last_error: e instanceof Error ? e.message.slice(0, 300) : "Fehler" }).catch(() => null);
    return fail(e);
  }
}

export async function disconnectAction(provider: "google" | "calendly" | "meta_ads"): Promise<ActionResult> {
  try {
    await requireRole(LEADERSHIP_ROLES);
    await saveIntegration(provider, { status: "disconnected", credentials: null, webhook_verified: false });
    await recordAudit({ action: "integration.disconnect", entityType: "marketing", newValues: { provider } });
    done();
    return { ok: true, message: "Getrennt. Bereits gespeicherte Daten bleiben erhalten." };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- Google ---------------- */

export async function googleOptionsAction(): Promise<
  ActionResult<{
    ga4: Array<{ id: string; name: string; account: string }>;
    ads: Array<{ id: string; name: string; currency: string; timeZone: string; manager: boolean }>;
    gsc: Array<{ siteUrl: string; permission: string }>;
    errors: string[];
  }>
> {
  try {
    await requireRole(LEADERSHIP_ROLES);
    const errors: string[] = [];
    const msg = (e: unknown) => (e instanceof Error ? e.message : "Fehler");
    const [ga4, ads, gsc] = await Promise.all([
      listGa4Properties().catch((e) => (errors.push(`GA4: ${msg(e)}`), [])),
      listAdsCustomers().catch((e) => (errors.push(`Google Ads: ${msg(e)}`), [])),
      listGscSites().catch((e) => (errors.push(`Search Console: ${msg(e)}`), [])),
    ]);
    return { ok: true, data: { ga4, ads, gsc, errors } };
  } catch (e) {
    return fail(e);
  }
}

const googleCfg = z.object({
  ga4_property_id: z.string().regex(/^\d{4,20}$/).nullable().optional(),
  ga4_property_name: z.string().max(200).nullable().optional(),
  ads_customer_id: z.string().regex(/^\d{10}$/).nullable().optional(),
  ads_customer_name: z.string().max(200).nullable().optional(),
  ads_login_customer_id: z.string().regex(/^\d{10}$/).nullable().optional(),
  ads_currency: z.string().max(5).nullable().optional(),
  ads_time_zone: z.string().max(60).nullable().optional(),
  gsc_site_url: z.string().max(300).nullable().optional(),
});

export async function saveGoogleConfigAction(input: z.input<typeof googleCfg>): Promise<ActionResult> {
  try {
    await requireRole(LEADERSHIP_ROLES);
    const cfg = googleCfg.parse(input) as Partial<GoogleConfig>;
    await saveIntegration("google", { config: cfg as Record<string, unknown> });
    await recordAudit({ action: "integration.configure", entityType: "marketing", newValues: { provider: "google", ...cfg } });
    done();
    return { ok: true, message: "Gespeichert. Der erste Abgleich läuft mit «Jetzt synchronisieren» oder nachts automatisch." };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- Meta Ads ---------------- */

export async function connectMetaAdsAction(token: string): Promise<ActionResult<Array<{ id: string; name: string; currency: string; timeZone: string }>>> {
  try {
    await requireRole(LEADERSHIP_ROLES);
    needKey();
    const t = z.string().trim().min(20).max(1000).parse(token);
    const accounts = await listMetaAdAccounts(t);
    await saveIntegration("meta_ads", { status: "connected", credentials: { token: t } satisfies MetaAdsCredentials, last_error: null });
    await recordAudit({ action: "integration.connect", entityType: "marketing", newValues: { provider: "meta_ads", accounts: accounts.length } });
    done();
    return { ok: true, data: accounts, message: `${accounts.length} Werbekonto(en) gefunden.` };
  } catch (e) {
    return fail(e);
  }
}

export async function metaAccountsAction(): Promise<ActionResult<Array<{ id: string; name: string; currency: string; timeZone: string }>>> {
  try {
    await requireRole(LEADERSHIP_ROLES);
    const creds = await getCredentials<MetaAdsCredentials>("meta_ads");
    if (!creds?.token) throw new Error("Meta Ads ist nicht verbunden.");
    return { ok: true, data: await listMetaAdAccounts(creds.token) };
  } catch (e) {
    return fail(e);
  }
}

export async function saveMetaAccountAction(a: { id: string; name: string; currency: string; timeZone: string }): Promise<ActionResult> {
  try {
    await requireRole(LEADERSHIP_ROLES);
    const v = z.object({ id: z.string().regex(/^\d{3,25}$/), name: z.string().max(200), currency: z.string().max(5), timeZone: z.string().max(60) }).parse(a);
    await saveIntegration("meta_ads", { account_name: v.name, config: { ad_account_id: v.id, ad_account_name: v.name, currency: v.currency, time_zone: v.timeZone } });
    done();
    return { ok: true, message: "Werbekonto gespeichert." };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- Abgleich ---------------- */

export async function runSyncAction(provider: SyncProvider | "all", days?: number): Promise<ActionResult<SyncOutcome[]>> {
  try {
    await requireRole(LEADERSHIP_ROLES);
    const list = provider === "all" ? SYNC_PROVIDERS : [provider];
    const out: SyncOutcome[] = [];
    for (const p of list) out.push(await runSync(p, { triggeredBy: "manual", days }));
    await recordAudit({ action: "integration.sync", entityType: "marketing", newValues: { provider, days: days ?? null } });
    done();
    return { ok: true, data: out };
  } catch (e) {
    return fail(e);
  }
}
