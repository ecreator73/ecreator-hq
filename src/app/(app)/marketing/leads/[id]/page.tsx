import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, Note } from "@/components/marketing/ui";
import { LeadControls } from "@/components/marketing/lead-controls";
import { CONFIDENCE_LABELS, channelLabel } from "@/lib/marketing/channels";
import { formLabel } from "@/lib/marketing/forms";
import { formatDateTime } from "@/lib/marketing/range";
import { getMarketingLead } from "@/server/marketing/dashboard.service";
import { teamService } from "@/server/services";

export const metadata: Metadata = { title: "Lead" };

/* eslint-disable @typescript-eslint/no-explicit-any */

function Field({ label, value, href }: { label: string; value: React.ReactNode; href?: string | null }) {
  const empty = value == null || value === "";
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="min-w-0 break-words text-neutral-900">
        {empty ? (
          <span className="text-neutral-400">–</span>
        ) : href ? (
          <a href={href} className="hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

const BOOKING_STATUS: Record<string, string> = { active: "Aktiv", canceled: "Abgesagt", rescheduled: "Verschoben" };
const ATTR_STATUS: Record<string, string> = { attributed: "Attributed", partial: "Partially Attributed", unattributed: "Unattributed" };

export default async function MarketingLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, users] = await Promise.all([getMarketingLead(id), teamService.listMembers().catch(() => [])]);
  if (!data) notFound();
  const { lead: l, events, bookings, activities, contact } = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/marketing/leads" className="text-xs text-neutral-500 hover:underline">
            ← Leads
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">{l.contact_name ?? l.company_name}</h1>
          <p className="text-sm text-neutral-500">
            {l.company_name !== l.contact_name ? `${l.company_name} · ` : ""}
            {l.status?.label ?? "–"} · erstellt {formatDateTime(l.created_at)}
          </p>
        </div>
        <Link href={`/sales/leads/${l.id}`} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
          Im CRM öffnen (Aufgaben, Termine, Angebote)
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Kontakt und Anfrage">
            <dl className="divide-y divide-neutral-100">
              <Field label="Name" value={l.contact_name} />
              <Field label="Firma" value={l.company_name} />
              <Field label="E-Mail" value={l.email} href={l.email ? `mailto:${l.email}` : null} />
              <Field label="Telefon" value={l.phone} href={l.phone ? `tel:${l.phone}` : null} />
              <Field label="Website" value={l.website} />
              <Field label="Leistung" value={l.dienstleistung} />
              <Field label="Formular" value={l.form_name ?? formLabel(l.form_type)} />
              <Field label="Nachricht" value={l.message ? <span className="whitespace-pre-line">{l.message}</span> : null} />
              <Field label="Kontakt-Datensatz" value={contact ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() + (contact.client_id ? " (Kunde)" : "") : null} />
            </dl>
          </Panel>

          <Panel title="Attribution" description="First Touch = erste Berührung der Sitzung mit der ersten Anfrage · Last Touch = jüngste Anfrage">
            <div className="grid gap-x-6 sm:grid-cols-2">
              <dl className="divide-y divide-neutral-100">
                <p className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">First Touch</p>
                <Field label="Kanal" value={channelLabel(l.ft_channel)} />
                <Field label="Quelle / Medium" value={l.ft_source || l.ft_medium ? `${l.ft_source ?? "–"} / ${l.ft_medium ?? "–"}` : null} />
                <Field label="Kampagne" value={l.ft_campaign} />
                <Field label="Inhalt / Begriff" value={l.ft_content || l.ft_term ? `${l.ft_content ?? "–"} / ${l.ft_term ?? "–"}` : null} />
                <Field label="Erste Landingpage" value={l.ft_landing_page} />
                <Field label="Referrer" value={l.ft_referrer} />
                <Field label="Zeit" value={l.ft_at ? formatDateTime(l.ft_at) : null} />
              </dl>
              <dl className="divide-y divide-neutral-100">
                <p className="pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:pt-0">Last Touch</p>
                <Field label="Kanal" value={channelLabel(l.lt_channel)} />
                <Field label="Quelle / Medium" value={l.lt_source || l.lt_medium ? `${l.lt_source ?? "–"} / ${l.lt_medium ?? "–"}` : null} />
                <Field label="Kampagne" value={l.lt_campaign} />
                <Field label="Landingpage" value={l.lt_landing_page} />
                <Field label="Conversion-Seite" value={l.conversion_page} />
                <Field label="Conversion-Zeit" value={l.converted_at ? formatDateTime(l.converted_at) : null} />
                <Field
                  label="Klick-IDs"
                  value={(["gclid", "gbraid", "wbraid", "fbclid", "msclkid", "ttclid", "li_fat_id"] as const).filter((k) => l[k]).join(", ") || null}
                />
              </dl>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-neutral-500">Attributions-Sicherheit:</span>
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-medium text-neutral-700">
                {CONFIDENCE_LABELS[l.attribution_confidence ?? "unknown"] ?? "Unbekannt"}
              </span>
              <span className="text-neutral-400">Consent: {l.consent_status === "granted" ? "erteilt" : l.consent_status === "denied" ? "abgelehnt" : "unbekannt"}</span>
            </div>
          </Panel>

          <Panel title="Anfragen und Buchungen" description="Jede Absendung bleibt als eigenes Ereignis erhalten (Wiederholungsanfragen werden nicht gelöscht).">
            {events.length === 0 && bookings.length === 0 ? (
              <p className="text-sm text-neutral-500">Keine Website- oder Calendly-Ereignisse (Lead aus anderer Quelle).</p>
            ) : (
              <ol className="space-y-3">
                {events.map((e: any) => (
                  <li key={e.id} className="rounded-lg border border-neutral-100 px-3 py-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-neutral-800">
                        {e.kind === "booking" ? "Buchung" : "Formular"} · {e.form_name ?? formLabel(e.form_type)}
                        {e.is_duplicate ? <span className="ml-2 text-amber-700">(Dublette, nicht gezählt)</span> : null}
                      </span>
                      <span className="text-neutral-500">{formatDateTime(e.occurred_at)}</span>
                    </div>
                    <p className="mt-1 text-neutral-600">
                      {channelLabel(e.channel)}
                      {e.utm_campaign ? ` · Kampagne ${e.utm_campaign}` : ""}
                      {e.landing_page ? ` · Einstieg ${e.landing_page}` : ""}
                      {e.page_url ? ` · abgeschickt auf ${e.page_url}` : ""}
                    </p>
                  </li>
                ))}
                {bookings.map((b: any) => (
                  <li key={b.id} className="rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-neutral-800">
                        Calendly · {b.event_name ?? "Termin"} · {BOOKING_STATUS[b.status] ?? b.status}
                      </span>
                      <span className="text-neutral-500">Termin {formatDateTime(b.start_time)}</span>
                    </div>
                    <p className="mt-1 text-neutral-600">
                      gebucht {formatDateTime(b.booked_at)} · {ATTR_STATUS[b.attribution_status] ?? b.attribution_status} · über {(b.received_via ?? []).join(" + ") || "–"}
                      {b.cancel_reason ? ` · Grund: ${b.cancel_reason}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Bekannter Verlauf" description="Nur First-Party-Schritte: Einstieg → Absendung. Dazwischen liegende Seiten sind nicht erfasst (unvollständig).">
            {events.length ? (
              <ol className="space-y-1 text-xs text-neutral-700">
                {[...events].reverse().map((e: any) => (
                  <li key={e.id}>
                    {e.first_seen_at ? `${formatDateTime(e.first_seen_at)} Einstieg ${e.landing_page ?? "?"}` : `Einstieg ${e.landing_page ?? "unbekannt"}`} → …{" "}
                    <span className="text-neutral-400">(unvollständig)</span> → {formatDateTime(e.occurred_at)} {e.kind === "booking" ? "Buchung" : "Anfrage"} auf {e.page_url ?? "?"}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-neutral-500">Kein bekannter Verlauf.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Bearbeiten">
            <LeadControls leadId={l.id} status={l.status?.key ?? null} ownerId={l.owner?.id ?? null} users={users} />
          </Panel>
          <Panel title="Verlauf im CRM">
            {activities.length ? (
              <ul className="space-y-2.5">
                {activities.map((a: any) => (
                  <li key={a.id} className="text-xs">
                    <p className="font-medium text-neutral-800">{a.subject ?? a.type}</p>
                    {a.body ? <p className="whitespace-pre-line text-neutral-600">{a.body}</p> : null}
                    <p className="text-[11px] text-neutral-400">{formatDateTime(a.activity_date)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-neutral-500">Noch keine Einträge</p>
            )}
          </Panel>
          <Note>Plattform-Attribution (Google/Meta) kann von dieser First-Party-Attribution abweichen; beide werden getrennt ausgewiesen.</Note>
        </div>
      </div>
    </div>
  );
}
