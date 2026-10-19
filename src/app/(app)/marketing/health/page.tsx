import type { Metadata } from "next";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { PageHead } from "@/components/marketing/page-head";
import { Panel, SchemaMissing, SourceBadge } from "@/components/marketing/ui";
import { DataTable } from "@/components/marketing/data-table";
import { addDaysStr, formatAgo, zurichToday } from "@/lib/marketing/range";
import { fmtInt, fmtPct, ratio } from "@/lib/marketing/format";
import { getSourceStatuses, listActivity, listBookings, listChannelMetrics, listConversions, listSyncRuns, schemaReady } from "@/server/marketing/dashboard.service";
import { SyncButtons } from "@/components/marketing/integration-panels";

export const metadata: Metadata = { title: "Tracking-Gesundheit" };
export const maxDuration = 300;

type Check = { level: "ok" | "warn" | "info"; title: string; detail: string };

export default async function HealthPage() {
  if (!(await schemaReady())) {
    return (
      <>
        <PageHead title="Tracking-Gesundheit" />
        <SchemaMissing />
      </>
    );
  }
  const today = zurichToday();
  const r30 = { from: addDaysStr(today, -29), to: today };
  const [src, conv, allConv, bookings, metrics, runs, rejects] = await Promise.all([
    getSourceStatuses(),
    listConversions(r30),
    listConversions(r30, { includeDuplicates: true }),
    listBookings(r30),
    listChannelMetrics(r30),
    listSyncRuns(40),
    listActivity({ limit: 50, type: "webhook_rejected" }),
  ]);
  const ev = conv ?? [];
  const checks: Check[] = [];
  const unknown = ev.filter((e) => e.channel === "unknown").length;
  checks.push(
    unknown / Math.max(ev.length, 1) > 0.3 && ev.length >= 5
      ? { level: "warn", title: "Viele Anfragen ohne Herkunft", detail: `${fmtInt(unknown)} von ${fmtInt(ev.length)} (${fmtPct(ratio(unknown, ev.length))}) ohne Attribution. Möglich: gesperrter Speicher, Direktaufrufe, Apps.` }
      : { level: "ok", title: "Attribution", detail: `${fmtInt(ev.length - unknown)} von ${fmtInt(ev.length)} Anfragen mit Herkunft (30 Tage).` },
  );
  const gclidNoUtm = ev.filter((e) => e.gclid && !e.utm_campaign).length;
  if (gclidNoUtm) checks.push({ level: "info", title: "Google-Ads-Klicks ohne Kampagnen-UTM", detail: `${fmtInt(gclidNoUtm)} Anfragen mit gclid, aber ohne utm_campaign. Kampagne erst nach Google-Ads-Abgleich zuordenbar (Auto-Tagging).` });
  const fbNoUtm = ev.filter((e) => e.fbclid && !e.utm_source).length;
  if (fbNoUtm) checks.push({ level: "info", title: "fbclid ohne UTM", detail: `${fmtInt(fbNoUtm)} Anfragen: bezahlt oder organisch nicht unterscheidbar. UTM-Parameter in Meta-Anzeigen setzen.` });
  const dups = (allConv ?? []).filter((e) => e.is_duplicate).length;
  checks.push({ level: dups ? "info" : "ok", title: "Dubletten", detail: dups ? `${fmtInt(dups)} doppelte Absendungen erkannt und nicht gezählt.` : "Keine doppelten Absendungen." });
  const noLead = ev.filter((e) => !e.lead_id).length;
  if (noLead) checks.push({ level: "warn", title: "Ereignisse ohne Lead", detail: `${fmtInt(noLead)} Conversion-Ereignisse sind keinem Lead zugeordnet (kaputte Verknüpfung).` });
  const unattrBookings = (bookings ?? []).filter((b) => b.attribution_status === "unattributed").length;
  if (unattrBookings) checks.push({ level: "info", title: "Buchungen ohne Herkunft", detail: `${fmtInt(unattrBookings)} Calendly-Buchungen (vermutlich direkt auf calendly.com).` });
  const otherCur = [...new Set((metrics ?? []).filter((m) => m.currency !== "CHF").map((m) => m.currency))];
  if (otherCur.length) checks.push({ level: "warn", title: "Fremdwährung", detail: `Werbekosten in ${otherCur.join(", ")} werden nicht in CHF umgerechnet.` });
  const lastLead = src.website.lastEventAt;
  if (src.website.state === "connected" && (!lastLead || Date.now() - new Date(lastLead).getTime() > 14 * 86_400_000))
    checks.push({ level: "warn", title: "Kein Website-Lead seit 14 Tagen", detail: lastLead ? `Letzter Eingang ${formatAgo(lastLead)}. Website-Versand prüfen.` : "Noch nie ein Lead eingegangen. Website-Konfiguration prüfen." });
  const recentRejects = (rejects ?? []).filter((r) => Date.now() - new Date(r.occurred_at).getTime() < 7 * 86_400_000).length;
  if (recentRejects) checks.push({ level: "warn", title: "Abgewiesene Webhooks", detail: `${recentRejects} abgewiesene Aufrufe in 7 Tagen (Signatur). Schlüssel prüfen.` });
  for (const s of Object.values(src)) if (s.state === "error") checks.push({ level: "warn", title: `${s.label}: Fehler`, detail: s.lastError ?? s.detail });
  const failed = (runs ?? []).filter((r) => r.status === "error" && Date.now() - new Date(r.started_at).getTime() < 7 * 86_400_000).length;
  if (failed) checks.push({ level: "warn", title: "Fehlgeschlagene Abgleiche", detail: `${failed} Läufe in 7 Tagen mit Fehler.` });

  const runRows = (runs ?? []).map((r) => ({
    id: r.id,
    provider: r.provider,
    started: r.started_at,
    status: r.status === "ok" ? "OK" : r.status === "error" ? "Fehler" : r.status,
    status_color: r.status === "ok" ? "green" : r.status === "error" ? "red" : "gray",
    window: r.date_from && r.date_to ? `${r.date_from} – ${r.date_to}` : null,
    rows: r.rows_upserted,
    by: r.triggered_by === "manual" ? "manuell" : "Cron",
    error: r.error,
  }));

  return (
    <>
      <PageHead title="Tracking-Gesundheit" subtitle="Status aller Quellen, Datenqualität und Abgleich-Läufe (letzte 30 Tage)" sources={Object.values(src)} />
      <div className="space-y-5">
        <Panel title="Quellen">
          <ul className="divide-y divide-neutral-100">
            {Object.values(src).map((s) => (
              <li key={s.key} className="grid gap-1 py-2.5 sm:grid-cols-[180px_1fr_auto] sm:items-center">
                <span className="text-sm font-medium text-neutral-900">{s.label}</span>
                <span className="text-xs text-neutral-500">
                  {s.detail}
                  {s.lastSyncAt ? ` · letzter Sync ${formatAgo(s.lastSyncAt)}` : ""}
                  {s.lastEventAt ? ` · letztes Ereignis ${formatAgo(s.lastEventAt)}` : ""}
                  {s.lastError ? ` · letzter Fehler: ${s.lastError}` : ""}
                </span>
                <SourceBadge status={s} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Datenqualität">
          <ul className="space-y-2">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                {c.level === "ok" ? (
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="OK" />
                ) : c.level === "warn" ? (
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="Warnung" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-label="Hinweis" />
                )}
                <span>
                  <span className="font-medium text-neutral-900">{c.title}</span>
                  <span className="block text-xs text-neutral-500">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Abgleich-Läufe" actions={<SyncButtons />}>
          <DataTable
            columns={[
              { key: "started", label: "Start", format: "datetime" },
              { key: "provider", label: "Quelle" },
              { key: "status", label: "Status", format: "badge" },
              { key: "window", label: "Zeitraum", hideSm: true },
              { key: "rows", label: "Zeilen", format: "int" },
              { key: "by", label: "Auslöser", hideSm: true },
              { key: "error", label: "Fehler" },
            ]}
            rows={runRows}
            defaultSort={{ key: "started", dir: "desc" }}
            empty="Noch keine Abgleich-Läufe (keine Quelle verbunden)"
          />
        </Panel>
      </div>
    </>
  );
}
