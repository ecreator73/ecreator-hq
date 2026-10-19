"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  backfillCalendlyAction,
  connectCalendlyAction,
  connectMetaAdsAction,
  disconnectAction,
  googleOptionsAction,
  metaAccountsAction,
  runSyncAction,
  saveGoogleConfigAction,
  saveMetaAccountAction,
} from "@/app/(app)/marketing/actions";

const btn = "h-8 rounded-md px-3 text-xs font-medium disabled:opacity-40";
const primary = `${btn} bg-neutral-900 text-white hover:bg-neutral-800`;
const secondary = `${btn} border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50`;
const input = "h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = <T,>(fn: () => Promise<{ ok: true; data?: T; message?: string } | { ok: false; error: string }>, onData?: (d: T | undefined) => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg({ ok: true, text: r.message ?? "Erledigt" });
        onData?.(r.data);
        router.refresh();
      } else setMsg({ ok: false, text: r.error });
    });
  const Msg = () => (msg ? <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-rose-700"}`} role="status">{msg.text}</p> : null);
  return { pending, run, Msg };
}

/* ---------------- Google ---------------- */

export function GooglePanel({
  envReady,
  devTokenReady,
  connected,
  email,
  config,
}: {
  envReady: boolean;
  devTokenReady: boolean;
  connected: boolean;
  email: string | null;
  config: { ga4_property_id?: string | null; ads_customer_id?: string | null; ads_login_customer_id?: string | null; gsc_site_url?: string | null };
}) {
  const { pending, run, Msg } = useAction();
  const [opts, setOpts] = useState<null | {
    ga4: Array<{ id: string; name: string; account: string }>;
    ads: Array<{ id: string; name: string; currency: string; timeZone: string; manager: boolean }>;
    gsc: Array<{ siteUrl: string; permission: string }>;
    errors: string[];
  }>(null);
  const [ga4, setGa4] = useState(config.ga4_property_id ?? "");
  const [ads, setAds] = useState(config.ads_customer_id ?? "");
  const [login, setLogin] = useState(config.ads_login_customer_id ?? "");
  const [gsc, setGsc] = useState(config.gsc_site_url ?? "");

  if (!envReady)
    return (
      <p className="text-xs text-neutral-500">
        Für die Verbindung braucht eCreator OS einen Google-OAuth-Client (GOOGLE_OAUTH_CLIENT_ID und GOOGLE_OAUTH_CLIENT_SECRET in Vercel). Anleitung unten.
      </p>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/integrations/google/connect" className={primary + " inline-flex items-center"}>
          {connected ? "Neu verbinden" : "Mit Google verbinden"}
        </a>
        {connected ? (
          <>
            <span className="text-xs text-neutral-500">Verbunden als {email ?? "Google-Konto"}</span>
            <button type="button" className={secondary} disabled={pending} onClick={() => run(googleOptionsAction, (d) => d && setOpts(d))}>
              Properties und Konten laden
            </button>
            <button type="button" className={secondary} disabled={pending} onClick={() => confirm("Google-Verbindung trennen?") && run(() => disconnectAction("google"))}>
              Trennen
            </button>
          </>
        ) : null}
      </div>
      {!devTokenReady ? <p className="text-xs text-amber-700">Google Ads braucht zusätzlich den Developer-Token (GOOGLE_ADS_DEVELOPER_TOKEN, Antrag über ein Verwaltungskonto).</p> : null}
      {opts ? (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const a = opts.ads.find((x) => x.id === ads);
            const g = opts.ga4.find((x) => x.id === ga4);
            run(() =>
              saveGoogleConfigAction({
                ga4_property_id: ga4 || null,
                ga4_property_name: g?.name ?? null,
                ads_customer_id: ads || null,
                ads_customer_name: a?.name ?? null,
                ads_currency: a?.currency || null,
                ads_time_zone: a?.timeZone || null,
                ads_login_customer_id: login.replace(/-/g, "") || null,
                gsc_site_url: gsc || null,
              }),
            );
          }}
        >
          <label className="text-xs text-neutral-500">
            GA4-Property
            <select className={input + " mt-1"} value={ga4} onChange={(e) => setGa4(e.target.value)}>
              <option value="">– keine –</option>
              {opts.ga4.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id}) · {p.account}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-neutral-500">
            Search-Console-Property
            <select className={input + " mt-1"} value={gsc} onChange={(e) => setGsc(e.target.value)}>
              <option value="">– keine –</option>
              {opts.gsc.map((s) => (
                <option key={s.siteUrl} value={s.siteUrl}>
                  {s.siteUrl}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-neutral-500">
            Google-Ads-Konto
            <select className={input + " mt-1"} value={ads} onChange={(e) => setAds(e.target.value)}>
              <option value="">– keines –</option>
              {opts.ads
                .filter((c) => !c.manager)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}) {c.currency}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs text-neutral-500">
            Verwaltungskonto (MCC), optional
            <input className={input + " mt-1"} value={login} onChange={(e) => setLogin(e.target.value)} placeholder="123-456-7890" inputMode="numeric" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={primary} disabled={pending}>
              Auswahl speichern
            </button>
          </div>
          {opts.errors.length ? <p className="text-xs text-amber-700 sm:col-span-2">{opts.errors.join(" · ")}</p> : null}
        </form>
      ) : null}
      <Msg />
    </div>
  );
}

/* ---------------- Calendly ---------------- */

export function CalendlyPanel({ connected, name }: { connected: boolean; name: string | null }) {
  const { pending, run, Msg } = useAction();
  const [token, setToken] = useState("");
  return (
    <div className="space-y-3">
      {connected ? <p className="text-xs text-neutral-500">Verbunden als {name ?? "Calendly"}. Webhook für Buchung, Absage und Verschiebung ist registriert.</p> : null}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => connectCalendlyAction(token), () => setToken(""));
        }}
      >
        <label className="min-w-[240px] flex-1 text-xs text-neutral-500">
          Personal Access Token
          <input type="password" autoComplete="off" className={input + " mt-1"} value={token} onChange={(e) => setToken(e.target.value)} placeholder={connected ? "Neues Token (optional)" : "Token aus Calendly → Integrationen → API"} />
        </label>
        <button type="submit" className={primary} disabled={pending || token.trim().length < 20}>
          {connected ? "Token ersetzen" : "Verbinden und Webhook registrieren"}
        </button>
      </form>
      {connected ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondary} disabled={pending} onClick={() => run(() => backfillCalendlyAction(90))}>
            Buchungen der letzten 90 Tage nachladen
          </button>
          <button type="button" className={secondary} disabled={pending} onClick={() => confirm("Calendly trennen? Der Webhook bleibt in Calendly bestehen, wird aber abgewiesen.") && run(() => disconnectAction("calendly"))}>
            Trennen
          </button>
        </div>
      ) : null}
      <Msg />
    </div>
  );
}

/* ---------------- Meta Ads ---------------- */

export function MetaAdsPanel({ connected, accountId }: { connected: boolean; accountId: string | null }) {
  const { pending, run, Msg } = useAction();
  const [token, setToken] = useState("");
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; currency: string; timeZone: string }> | null>(null);
  const [sel, setSel] = useState(accountId ?? "");
  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => connectMetaAdsAction(token), (d) => {
            setToken("");
            if (d) setAccounts(d);
          });
        }}
      >
        <label className="min-w-[240px] flex-1 text-xs text-neutral-500">
          System-User-Token (ads_read)
          <input type="password" autoComplete="off" className={input + " mt-1"} value={token} onChange={(e) => setToken(e.target.value)} placeholder={connected ? "Neues Token (optional)" : "Token aus dem Business Manager"} />
        </label>
        <button type="submit" className={primary} disabled={pending || token.trim().length < 20}>
          {connected ? "Token ersetzen" : "Verbinden"}
        </button>
        {connected ? (
          <button type="button" className={secondary} disabled={pending} onClick={() => run(metaAccountsAction, (d) => d && setAccounts(d))}>
            Werbekonten laden
          </button>
        ) : null}
      </form>
      {accounts ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[240px] flex-1 text-xs text-neutral-500">
            Werbekonto
            <select className={input + " mt-1"} value={sel} onChange={(e) => setSel(e.target.value)}>
              <option value="">– wählen –</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.id}) {a.currency}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={primary}
            disabled={pending || !sel}
            onClick={() => {
              const a = accounts.find((x) => x.id === sel);
              if (a) run(() => saveMetaAccountAction(a));
            }}
          >
            Speichern
          </button>
        </div>
      ) : null}
      {connected ? (
        <button type="button" className={secondary} disabled={pending} onClick={() => confirm("Meta Ads trennen?") && run(() => disconnectAction("meta_ads"))}>
          Trennen
        </button>
      ) : null}
      <Msg />
    </div>
  );
}

/* ---------------- Abgleich ---------------- */

export function SyncButtons() {
  const { pending, run, Msg } = useAction();
  const [result, setResult] = useState<string | null>(null);
  const go = (p: "all" | "ga4" | "google_ads" | "gsc" | "meta_ads", days?: number) =>
    run(() => runSyncAction(p, days), (d) =>
      setResult(
        (d ?? [])
          .map((r) => `${r.provider}: ${r.status === "ok" ? `${r.rows} Zeilen` : r.status === "skipped" ? `übersprungen (${r.message})` : `Fehler (${r.message})`}`)
          .join(" · "),
      ),
    );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={pending} onClick={() => go("all")}>
          {pending ? "Synchronisiert…" : "Jetzt synchronisieren"}
        </button>
        <button type="button" className={secondary} disabled={pending} onClick={() => confirm("90 Tage nachladen? Das kann einige Minuten dauern.") && go("all", 90)}>
          Backfill 90 Tage
        </button>
      </div>
      {result ? <p className="text-xs text-neutral-600">{result}</p> : null}
      <Msg />
    </div>
  );
}
