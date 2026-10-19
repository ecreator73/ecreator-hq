import type { Metadata } from "next";
import { PageHead } from "@/components/marketing/page-head";
import { Note, Panel } from "@/components/marketing/ui";
import { CHANNELS } from "@/lib/marketing/channels";
import { hasCredentialsKey } from "@/lib/crypto";
import { googleEnv } from "@/server/marketing/integrations";

export const metadata: Metadata = { title: "Einstellungen" };

const yes = (b: boolean) => (b ? "gesetzt" : "fehlt");

export default function MarketingSettingsPage() {
  const env = googleEnv();
  const rows: Array<[string, string]> = [
    ["WEBSITE_LEAD_SECRET (Lead-Eingang)", yes(Boolean(process.env.WEBSITE_LEAD_SECRET))],
    ["CREDENTIALS_SECRET (Verschlüsselung)", yes(hasCredentialsKey())],
    ["CRON_SECRET (täglicher Abgleich)", yes(Boolean(process.env.CRON_SECRET))],
    ["GOOGLE_OAUTH_CLIENT_ID / SECRET", yes(Boolean(env))],
    ["GOOGLE_ADS_DEVELOPER_TOKEN", yes(Boolean(env?.developerToken))],
    ["META_APP_SECRET (optional)", yes(Boolean(process.env.META_APP_SECRET))],
    ["Google-Ads-API-Version", process.env.GOOGLE_ADS_API_VERSION || "v24 (Standard)"],
    ["Meta-Graph-Version", process.env.META_GRAPH_VERSION || "v23.0 (Standard)"],
  ];
  return (
    <>
      <PageHead title="Einstellungen" subtitle="Regeln, Konfiguration und Datenschutz des Marketing-Dashboards" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Grundeinstellungen">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Zeitzone</dt><dd>Europe/Zurich</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Währung</dt><dd>CHF (Fremdwährungen werden gemeldet, nicht umgerechnet)</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Datumsformat</dt><dd>TT.MM.JJJJ</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Zugriff</dt><dd>Super Admin, CEO, CSO (serverseitig + RLS)</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Dubletten-Fenster</dt><dd>10 Minuten (gleicher Inhalt)</dd></div>
          </dl>
        </Panel>
        <Panel title="Server-Konfiguration" description="Nur Status, keine Werte">
          <dl className="space-y-1.5 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-neutral-500">{k}</dt>
                <dd className={v === "fehlt" ? "text-amber-700" : "text-neutral-900"}>{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Kanalklassifizierung" description="Reihenfolge: Klick-IDs → UTM → Referrer → Direct / Unknown">
          <ul className="space-y-1 text-xs text-neutral-700">
            <li>gclid / gbraid / wbraid → Google Ads · msclkid → Microsoft Ads · ttclid → TikTok · li_fat_id → LinkedIn</li>
            <li>utm_medium cpc/ppc/paid/paid_social/display … → bezahlt nach utm_source (Google, Meta, TikTok, LinkedIn, Microsoft, sonst «Sonstige bezahlt»)</li>
            <li>fbclid ohne UTM → «Facebook/Instagram (bezahlt oder organisch)» (nicht unterscheidbar)</li>
            <li>Referrer Google → Google Organic · Bing/DuckDuckGo/… → Andere Suchmaschinen · Facebook/Instagram → organisch · sonst Referral</li>
            <li>Einstiegsseite ohne Herkunft → Direct · gar keine Angaben → Unknown / Unattributed</li>
          </ul>
          <p className="mt-2 text-[11px] text-neutral-400">{CHANNELS.length} Kanäle. Bezahlter Traffic wird nie als Organic oder Direct gezählt.</p>
        </Panel>
        <Panel title="Datenschutz (DSG)">
          <ul className="space-y-1 text-xs text-neutral-700">
            <li><strong>Was:</strong> Kontaktangaben aus Formularen/Buchungen, Herkunft (UTM, Einstiegsseite, Referrer, Klick-IDs), Formularangaben.</li>
            <li><strong>Wozu:</strong> Bearbeitung der Anfrage und Messung, welche Kanäle Anfragen bringen.</li>
            <li><strong>Wo:</strong> Supabase (EU, Frankfurt), Vercel fra1. Keine Fingerprints, keine Cookies, kein Cross-Site-Tracking.</li>
            <li><strong>Wie lange:</strong> Leads bis Ende der Geschäftsbeziehung bzw. Löschbegehren; Klick-IDs/Formular-Rohdaten 24 Monate; Protokolle 12 Monate.</li>
            <li><strong>Wer:</strong> Super Admin, CEO, CSO; Vertrieb sieht Leads im CRM.</li>
            <li><strong>Löschung:</strong> auf Anfrage durch Super Admin (Lead, Kontakt, Ereignisse).</li>
          </ul>
        </Panel>
      </div>
      <div className="mt-5">
        <Note tone="warning">Empfehlung: Mehrstufige Anmeldung (MFA) für alle Konten mit Marketing-Zugriff aktivieren. eCreator OS hat derzeit kein MFA (Supabase Auth unterstützt TOTP).</Note>
      </div>
    </>
  );
}
