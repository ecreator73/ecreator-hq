"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Webhook, PlugZap, Unplug, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import {
  loadFormsAction,
  saveFormsAction,
  subscribeWebhooksAction,
  syncHistoricalAction,
  disconnectMetaAction,
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
  const [forms, setForms] = useState<FormItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set((connection?.config.forms ?? []).map((f) => f.id)),
  );

  const connected = connection?.status === "connected";

  function run(fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>, okText: string) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setMsg({ tone: "err", text: r.error ?? "Fehler" });
      else { setMsg({ tone: "ok", text: okText }); router.refresh(); }
    });
  }

  function loadForms() {
    setMsg(null);
    start(async () => {
      const r = await loadFormsAction();
      if (!r.ok) setMsg({ tone: "err", text: r.error });
      else setForms(r.data ?? []);
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

              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => run(subscribeWebhooksAction, "Webhook abonniert.")} pending={pending} icon={Webhook}>Webhook abonnieren</Btn>
                <Btn onClick={() => run(syncHistoricalAction, "Synchronisation gestartet.")} pending={pending} icon={RefreshCw}>Leads synchronisieren</Btn>
                <Btn onClick={() => run(disconnectMetaAction, "Verbindung getrennt.")} pending={pending} icon={Unplug} variant="ghost">Trennen</Btn>
              </div>
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
