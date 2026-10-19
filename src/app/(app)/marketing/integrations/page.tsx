import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Note, Panel, SchemaMissing, SourceBadge } from "@/components/marketing/ui";
import { CalendlyPanel, GooglePanel, MetaAdsPanel, SyncButtons } from "@/components/marketing/integration-panels";
import { formatAgo } from "@/lib/marketing/range";
import { hasCredentialsKey } from "@/lib/crypto";
import { getSourceStatuses, schemaReady } from "@/server/marketing/dashboard.service";
import { appBaseUrl, getIntegration, googleEnv, type CalendlyConfig, type GoogleConfig, type MetaAdsConfig } from "@/server/marketing/integrations";
import { googleRedirectUri } from "@/server/marketing/providers/google";
import { one, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Integrationen" };
export const maxDuration = 300;

export default async function IntegrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  if (!(await schemaReady())) return <SchemaMissing />;
  const [src, google, calendly, meta] = await Promise.all([
    getSourceStatuses(),
    getIntegration<GoogleConfig>("google"),
    getIntegration<CalendlyConfig>("calendly"),
    getIntegration<MetaAdsConfig>("meta_ads"),
  ]);
  const env = googleEnv();
  const error = one(sp.error);
  const connected = one(sp.connected);
  const gConnected = Boolean(google?.has_credentials && google.status !== "disconnected");

  return (
    <>
      <PageHead title="Integrationen" subtitle="Offizielle Anbindungen, nur Lesezugriff. Zugangsdaten liegen verschlüsselt auf dem Server, nie im Browser." />
      <div className="space-y-5">
        {error ? <Note tone="warning">Verbindung fehlgeschlagen: {error}</Note> : null}
        {connected ? <Note>Verbunden. Bitte jetzt Property und Konten wählen.</Note> : null}
        {!hasCredentialsKey() ? <Note tone="warning">CREDENTIALS_SECRET fehlt: Zugangsdaten können nicht gespeichert werden.</Note> : null}

        <Panel title="Status">
          <ul className="divide-y divide-neutral-100">
            {Object.values(src).map((s) => (
              <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{s.label}</p>
                  <p className="text-xs text-neutral-500">{s.detail}</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                  {s.lastSyncAt ? <span>Sync {formatAgo(s.lastSyncAt)}</span> : null}
                  {s.lastEventAt ? <span>Ereignis {formatAgo(s.lastEventAt)}</span> : null}
                  <SourceBadge status={s} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <SyncButtons />
            <p className="mt-2 text-[11px] text-neutral-400">Automatischer Abgleich täglich 04:30 UTC (Vercel Cron). Nicht verbundene Quellen werden übersprungen.</p>
          </div>
        </Panel>

        <Panel title="Google (GA4, Google Ads, Search Console)" description="Ein Google-Konto mit Lesezugriff. OAuth-Bereiche: analytics.readonly, webmasters.readonly, adwords.">
          <GooglePanel
            envReady={Boolean(env)}
            devTokenReady={Boolean(env?.developerToken)}
            connected={gConnected}
            email={google?.account_name ?? null}
            config={google?.config ?? {}}
          />
          <details className="mt-4 text-xs text-neutral-600">
            <summary className="cursor-pointer font-medium text-neutral-700">Einrichtung</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Google Cloud: OAuth-Client «Webanwendung» anlegen, APIs aktivieren: Google Analytics Data API, Google Analytics Admin API, Google Ads API, Search Console API.</li>
              <li>Autorisierte Weiterleitungs-URI: <code className="rounded bg-neutral-100 px-1">{googleRedirectUri()}</code></li>
              <li>In Vercel (ecreator-hq) setzen: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, für Ads zusätzlich GOOGLE_ADS_DEVELOPER_TOKEN (optional GOOGLE_ADS_LOGIN_CUSTOMER_ID).</li>
              <li>GA4-Property für www.ecreator.ch anlegen (existiert noch nicht) und dem Google-Konto Leserechte geben; Search Console-Property bestätigen.</li>
              <li>Hier «Mit Google verbinden», danach Property, Konto 204-916-5141 und Site wählen.</li>
            </ol>
          </details>
        </Panel>

        <Panel title="Calendly" description="Webhook für Buchung, Absage, Verschiebung (Signaturprüfung). Webhooks brauchen Calendly «Standard» oder höher.">
          <CalendlyPanel connected={Boolean(calendly?.has_credentials && calendly.status !== "disconnected")} name={calendly?.account_name ?? null} />
          <p className="mt-3 text-[11px] text-neutral-400">
            Webhook-Adresse: <code className="rounded bg-neutral-100 px-1">{appBaseUrl()}/api/webhooks/calendly</code> · wird beim Verbinden automatisch mit eigenem Signing Key registriert.
          </p>
        </Panel>

        <Panel title="Meta Ads" description="Nur Kosten und Leistung (ads_read). Kein Pixel auf der Website. Nur nötig, falls Meta Ads geschaltet werden.">
          <MetaAdsPanel connected={Boolean(meta?.has_credentials && meta.status !== "disconnected")} accountId={meta?.config.ad_account_id ?? null} />
          <details className="mt-4 text-xs text-neutral-600">
            <summary className="cursor-pointer font-medium text-neutral-700">Einrichtung</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Business Manager → Systembenutzer anlegen, dem Werbekonto mit Rolle «Analyst» zuweisen.</li>
              <li>Token mit Berechtigung ads_read erzeugen und hier einfügen (wird verschlüsselt gespeichert).</li>
              <li>Werbekonto wählen. Optional META_APP_SECRET setzen (appsecret_proof).</li>
            </ol>
          </details>
        </Panel>

        <Panel title="Website-Formulare" description="www.ecreator.ch sendet jeden Lead nach erfolgreichem Versand signiert an eCreator OS.">
          <ul className="space-y-1 text-xs text-neutral-600">
            <li>Eingang: <code className="rounded bg-neutral-100 px-1">{appBaseUrl()}/api/webhooks/website-lead</code> (HMAC-SHA256, 5 Minuten Toleranz)</li>
            <li>Gemeinsamer Schlüssel WEBSITE_LEAD_SECRET in beiden Vercel-Projekten (ecreator-website und ecreator-hq), auf der Website zusätzlich ECREATOR_OS_LEAD_URL.</li>
            <li>Übergang: Die Website sendet weiter an das Lovable-CRM (LEAD_WEBHOOK_URL). Wird diese Variable entfernt, wird eCreator OS automatisch zum einzigen Ziel.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
