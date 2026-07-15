"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Webhook, PlugZap, Unplug, CheckCircle2, AlertTriangle, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { MetaDiagnosis } from "@/server/integrations/meta/service";
import {
  loadFormsAction,
  saveFormsAction,
  subscribeWebhooksAction,
  syncHistoricalAction,
  disconnectMetaAction,
  refreshPagesAction,
  diagnoseMetaAction,
} from "@/app/(app)/settings/integrations/meta/actions";

interface Connection {
  status: string;
  account_name: string | null;
  config: { pages?: Array<{ id: string; name: string }>; forms?: Array<{ id: string; name: string; page_id: string }> };
  webhook_verified: boolean;
  webhook_last_event_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
}
interface FormItem { id: string; name: string; page_id: string; page_name: string }
interface EventRow { id: string; received_at: string; signature_valid: boolean | null; external_id: string | null; status: string; error: string | null }

export function MetaConnectionPanel({
  configured,
  connection,
  events,
}: {
  configured: boolean;
  connection: Connection | null;
  events: EventRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [diag, setDiag] = useState<MetaDiagnosis | null>(null);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set((connection?.config.forms ?? []).map((f) => f.id)),
  );

  const connected = connection?.status === "connected";
  const pageCount = connection?.config.pages?.length ?? 0;
  const noPages = connected && pageCount === 0;

  function run(fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>, okText: string) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setMsg({ tone: "err", text: r.error ?? "Fehler" });
      else { setMsg({ tone: "ok", text: okText }); router.refresh(); }
    });
  }

  function refreshPages() {
    setMsg(null);
    start(async () => {
      const r = await refreshPagesAction();
      if (!r.ok) { setMsg({ tone: "err", text: r.error }); return; }
      const count = r.data?.count ?? 0;
      if (count === 0) {
        setMsg({ tone: "err", text: "0 Seiten gefunden. Das verbundene Facebook-Konto gibt keine Seite frei: der Account muss Admin/Editor der werbenden Seite sein und die Seite beim Verbinden ausgewählt werden. Bitte 'Trennen' und neu verbinden." });
      } else {
        setMsg({ tone: "ok", text: `${count} Seite(n) gefunden: ${(r.data?.names ?? []).join(", ")}.` });
      }
      router.refresh();
    });
  }

  function diagnose() {
    setMsg(null);
    start(async () => {
      const r = await diagnoseMetaAction();
      if (!r.ok) { setMsg({ tone: "err", text: r.error }); return; }
      setDiag(r.data ?? null);
    });
  }

  function subscribe() {
    setMsg(null);
    start(async () => {
      const r = await subscribeWebhooksAction();
      if (!r.ok) { setMsg({ tone: "err", text: r.error }); return; }
      const d = r.data ?? { ok: 0, failed: 0, errors: [] };
      if (d.ok === 0) {
        const why = d.errors.length ? ` (${d.errors.join("; ")})` : " — keine verbundene Seite mit Page-Token. Bitte zuerst eine Seite verbinden.";
        setMsg({ tone: "err", text: `Kein Webhook abonniert${why}` });
      } else {
        setMsg({ tone: "ok", text: `Webhook für ${d.ok} Seite(n) abonniert${d.failed ? `, ${d.failed} fehlgeschlagen` : ""}.` });
      }
      router.refresh();
    });
  }

  function loadForms() {
    setMsg(null);
    start(async () => {
      const r = await loadFormsAction();
      if (!r.ok) { setMsg({ tone: "err", text: r.error }); return; }
      const list = r.data ?? [];
      setForms(list);
      if (list.length === 0) {
        setMsg({ tone: "err", text: pageCount === 0
          ? "Keine Formulare: es ist keine Facebook-Seite verbunden (0 Seiten). Erst 'Seiten aktualisieren' bzw. neu verbinden."
          : "Keine Lead-Formulare auf den verbundenen Seiten gefunden (oder fehlende Berechtigung leads_retrieval)." });
      } else {
        setMsg({ tone: "ok", text: `${list.length} Formular(e) gefunden.` });
      }
    });
  }
  function saveForms() {
    const chosen = forms.filter((f) => selected.has(f.id)).map((f) => ({ id: f.id, name: f.name, page_id: f.page_id }));
    run(() => saveFormsAction(chosen), `${chosen.length} Formular(e) gespeichert.`);
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meta (Facebook Lead Ads)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-600">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
            Noch nicht konfiguriert. Hinterlege in Vercel (Production) die Server-Variablen
            <code className="mx-1">META_APP_ID</code>,<code className="mx-1">META_APP_SECRET</code>,
            <code className="mx-1">META_VERIFY_TOKEN</code> (und optional <code>META_GRAPH_VERSION</code>).
          </p>
          <p>Danach erscheint hier der „Mit Facebook verbinden"-Button. Die Schritt-für-Schritt-Anleitung liegt in <code>docs/META-INTEGRATION.md</code>.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {msg ? (
        <p className={cn("rounded-lg border px-3 py-2 text-sm", msg.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
          {msg.text}
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Meta (Facebook Lead Ads)</CardTitle>
          {connected ? <Badge tone="green">Verbunden</Badge> : <Badge tone="neutral">Nicht verbunden</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          {!connected ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">Verbinde dein Facebook-Konto, um Seiten und Lead-Formulare auszuwählen.</p>
              <a href="/api/integrations/meta/connect" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1877F2] px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#166fe0]">
                <PlugZap className="h-4 w-4" /> Mit Facebook verbinden
              </a>
            </div>
          ) : (
            <>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Info label="Konto" value={connection?.account_name ?? "—"} />
                <Info label="Seiten" value={`${connection?.config.pages?.length ?? 0} verbunden`} />
                <Info label="Lead-Formulare aktiv" value={`${connection?.config.forms?.length ?? 0}`} />
                <Info label="Letzte Synchronisation" value={connection?.last_sync_at ? formatDate(connection.last_sync_at) : "—"} />
                <Info label="Webhook" value={connection?.webhook_verified ? "Abonniert" : "Nicht abonniert"} tone={connection?.webhook_verified ? "ok" : "warn"} />
                <Info label="Letztes Event" value={connection?.webhook_last_event_at ? formatDate(connection.webhook_last_event_at) : "—"} />
              </dl>
              {connection?.last_error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{connection.last_error}</p>
              ) : null}

              {noPages ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">0 Facebook-Seiten verbunden — deshalb reagieren „Formulare laden" und „Webhook abonnieren" nicht.</p>
                    <p className="text-amber-700">
                      Klicke „Seiten aktualisieren" (holt Seiten mit dem bestehenden Token). Kommen weiter 0 Seiten, dann gibt dein Facebook-Konto keine Seite frei:
                      der eingeloggte Account muss <strong>Admin/Editor</strong> der werbenden Seite sein, und beim Verbinden muss die Seite <strong>angehakt</strong> werden → „Trennen" und neu verbinden.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Btn onClick={refreshPages} pending={pending} icon={RefreshCw} variant="secondary">Seiten aktualisieren</Btn>
                <Btn onClick={diagnose} pending={pending} icon={Stethoscope} variant="secondary">Diagnose</Btn>
                <Btn onClick={subscribe} pending={pending} icon={Webhook}>Webhook abonnieren</Btn>
                <Btn onClick={() => run(syncHistoricalAction, "Synchronisation gestartet.")} pending={pending} icon={RefreshCw}>Leads synchronisieren</Btn>
                <Btn onClick={() => run(disconnectMetaAction, "Verbindung getrennt.")} pending={pending} icon={Unplug} variant="ghost">Trennen</Btn>
              </div>

              {diag ? <DiagView diag={diag} /> : null}
            </>
          )}
        </CardContent>
      </Card>

      {connected ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Lead-Formulare</CardTitle>
            <Btn onClick={loadForms} pending={pending} icon={RefreshCw} variant="secondary">Formulare laden</Btn>
          </CardHeader>
          <CardContent>
            {forms.length === 0 ? (
              <p className="text-sm text-neutral-500">„Formulare laden" klicken, um die Lead-Formulare deiner Seiten anzuzeigen und auszuwählen.</p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  {forms.map((f) => (
                    <label key={f.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 hover:bg-neutral-50">
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => setSelected((p) => { const n = new Set(p); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; })} className="h-4 w-4 rounded border-neutral-300 text-brand-600" />
                      <span className="flex-1 text-sm font-medium text-neutral-900">{f.name}</span>
                      <span className="text-xs text-neutral-400">{f.page_name}</span>
                    </label>
                  ))}
                </div>
                <Btn onClick={saveForms} pending={pending} icon={CheckCircle2}>Auswahl speichern</Btn>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Webhook-Events (letzte 20)</CardTitle></CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-neutral-400">Noch keine eingehenden Events.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[36rem] text-sm">
                <thead><tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-3 py-2 font-medium">Zeit</th><th className="px-3 py-2 font-medium">Lead ID</th><th className="px-3 py-2 font-medium">Signatur</th><th className="px-3 py-2 font-medium">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-neutral-600">{formatDate(e.received_at)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-neutral-500">{e.external_id ?? "—"}</td>
                      <td className="px-3 py-2">{e.signature_valid ? <Badge tone="green">gültig</Badge> : <Badge tone="red">ungültig</Badge>}</td>
                      <td className="px-3 py-2"><Badge tone={e.status === "processed" ? "green" : e.status === "error" ? "red" : "neutral"}>{e.status}</Badge>{e.error ? <span className="ml-2 text-xs text-red-600">{e.error}</span> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DiagView({ diag }: { diag: MetaDiagnosis }) {
  const perm = (k: string) => diag.permissions.find((p) => p.permission === k)?.status;
  const need = ["pages_show_list", "leads_retrieval", "pages_read_engagement", "pages_manage_metadata"];
  const bizPages = diag.businesses.reduce((n, b) => n + b.ownedPages.length + b.clientPages.length, 0);

  let verdict: { tone: "ok" | "warn" | "err"; text: string };
  if (!diag.hasToken) verdict = { tone: "err", text: "Kein gespeichertes Token — bitte neu verbinden." };
  else if (diag.meError) verdict = { tone: "err", text: `Token ungültig/abgelaufen (${diag.meError}). Bitte 'Trennen' und neu verbinden.` };
  else if (diag.accounts.length > 0) verdict = { tone: "ok", text: `Facebook liefert ${diag.accounts.length} Seite(n). Klicke jetzt 'Seiten aktualisieren', danach Formulare laden und Webhook abonnieren.` };
  else if (perm("pages_show_list") !== "granted") verdict = { tone: "err", text: "Die Berechtigung 'pages_show_list' wurde NICHT erteilt — deshalb 0 Seiten. Beim Verbinden diese Berechtigung zulassen: 'Trennen', dann neu verbinden und im Facebook-Dialog alle Häkchen gesetzt lassen." };
  else if (bizPages > 0) verdict = { tone: "warn", text: "0 Seiten über me/accounts, ABER im Business Manager sind Seiten sichtbar (New Pages Experience). Dein Account braucht eine klassische Seiten-Rolle (Admin) direkt auf der Seite — eine reine Business-Rolle reicht Graph hier nicht." };
  else verdict = { tone: "err", text: "Facebook gibt keine Seite frei. Der eingeloggte Account ist auf keiner Seite Admin/Editor. Bitte mit dem Account verbinden, der Admin der werbenden Seite ist." };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
      <p className={cn("rounded-md px-3 py-2 font-medium",
        verdict.tone === "ok" ? "bg-emerald-100 text-emerald-800" : verdict.tone === "warn" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")}>
        {verdict.text}
      </p>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Konto</p>
        <p className="text-neutral-700">{diag.me ? `${diag.me.name} (${diag.me.id})` : diag.meError ?? "—"}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Berechtigungen</p>
        {diag.permissionsError ? <p className="text-red-600">{diag.permissionsError}</p> : (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {need.map((k) => {
              const s = perm(k);
              return (
                <span key={k} className={cn("rounded-full px-2 py-0.5 text-xs", s === "granted" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                  {k}: {s ?? "fehlt"}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Seiten (me/accounts)</p>
        {diag.accountsError ? <p className="text-red-600">{diag.accountsError}</p> : diag.accounts.length === 0 ? (
          <p className="text-neutral-500">0</p>
        ) : (
          <ul className="list-disc pl-5 text-neutral-700">
            {diag.accounts.map((p) => <li key={p.id}>{p.name} <span className="text-neutral-400">({p.id})</span></li>)}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Business Manager</p>
        {diag.businessesError ? <p className="text-red-600">{diag.businessesError}</p> : diag.businesses.length === 0 ? (
          <p className="text-neutral-500">Keine Businesses sichtbar</p>
        ) : (
          <ul className="space-y-1 text-neutral-700">
            {diag.businesses.map((b) => {
              const all = [...b.ownedPages, ...b.clientPages];
              return (
                <li key={b.id}>
                  <span className="font-medium">{b.name}</span>
                  <span className="text-neutral-400"> — owned: {b.ownedPages.length}, client: {b.clientPages.length}</span>
                  {all.length > 0 ? <span className="text-neutral-500"> ({all.map((p) => p.name).join(", ")})</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className={cn("mt-0.5 text-sm font-medium", tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-neutral-900")}>{value}</dd>
    </div>
  );
}

function Btn({ onClick, pending, icon: Icon, children, variant = "primary" }: { onClick: () => void; pending: boolean; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button type="button" onClick={onClick} disabled={pending} className={cn(
      "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium shadow-sm transition-colors disabled:opacity-50",
      variant === "primary" ? "bg-brand-600 text-white hover:bg-brand-700" : variant === "secondary" ? "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50" : "text-neutral-500 hover:bg-neutral-100",
    )}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}
