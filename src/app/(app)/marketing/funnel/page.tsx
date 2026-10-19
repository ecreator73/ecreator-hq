import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHead } from "@/components/marketing/page-head";
import { Note, Panel, SchemaMissing } from "@/components/marketing/ui";
import { FilterSelect } from "@/components/marketing/filter-select";
import { fmtInt, fmtPct, ratio } from "@/lib/marketing/format";
import { CHANNELS, classifyGa4 } from "@/lib/marketing/channels";
import { countableBookings, getSourceStatuses, listBookings, listConversions, listGa4Traffic, listMarketingLeads, schemaReady } from "@/server/marketing/dashboard.service";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Conversion Funnel" };

type Stage = { label: string; value: number | null; note?: string };

function Funnel({ stages }: { stages: Stage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value ?? 0));
  return (
    <ol className="space-y-2">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1]!.value : null;
        const step = ratio(s.value, prev);
        return (
          <li key={s.label} className="grid grid-cols-[minmax(110px,180px)_1fr_auto] items-center gap-3 text-xs">
            <span className="text-neutral-700">{s.label}</span>
            <div className="h-6 rounded bg-neutral-100">
              {s.value != null ? <div className="h-6 rounded bg-brand-600" style={{ width: `${Math.max(1, ((s.value ?? 0) / max) * 100)}%` }} /> : null}
            </div>
            <span className="w-44 text-right tabular-nums text-neutral-900">
              {s.value == null ? <span className="text-neutral-400">{s.note ?? "nicht messbar"}</span> : fmtInt(s.value)}
              {i > 0 && s.value != null && step != null ? <span className="ml-2 text-neutral-500">{fmtPct(step)} · Abbruch {fmtPct(1 - step)}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function FunnelPage({ searchParams }: { searchParams: SearchParams }) {
  const { range, sp } = await rangeFrom(searchParams);
  if (!(await schemaReady())) return <SchemaMissing />;
  const src = await getSourceStatuses();
  const ch = sp.channel;
  const ga4On = src.ga4.state !== "setup_required";
  const [traffic, conv, bookings, leads] = await Promise.all([ga4On ? listGa4Traffic(range) : Promise.resolve(null), listConversions(range), listBookings(range), listMarketingLeads(range)]);

  const t = (traffic ?? []).filter((r) => !ch || classifyGa4(r.source, r.medium) === ch);
  const sessions = traffic ? t.reduce((s, r) => s + r.sessions, 0) : null;
  const engaged = traffic ? t.reduce((s, r) => s + r.engaged_sessions, 0) : null;
  const ev = (conv ?? []).filter((c) => !ch || c.channel === ch);
  const forms = ev.filter((c) => c.kind === "form").length;
  const books = countableBookings(bookings ?? []).filter((b) => !ch || b.channel === ch).length;
  const L = (leads ?? []).filter((l) => !ch || l.ft_channel === ch);
  const contacted = L.filter((l) => l.status && l.status.key !== "neu").length;
  const meeting = L.filter((l) => ["termin_gebucht", "vertrag_mail", "abgeschlossen"].includes(l.status?.key ?? "")).length;
  const won = L.filter((l) => l.status?.key === "abgeschlossen").length;
  const ga4Note = ga4On ? "keine Daten" : "GA4: Integration erforderlich";

  return (
    <>
      <PageHead title="Conversion Funnel" subtitle="Nur messbare Stufen. Formular und Calendly sind alternative Pfade." range={range} showCompare={false} sources={[src.ga4, src.website, src.calendly]} />
      <div className="space-y-5">
        <Suspense fallback={null}>
          <FilterSelect name="channel" label="Kanal" options={CHANNELS.map((c) => ({ value: c.key, label: c.label }))} />
        </Suspense>
        <Panel title="Website-Funnel" description="Sitzungen → engagiert (GA4, nur mit Einwilligung) → Anfrage (erste Partei, immer)">
          <Funnel
            stages={[
              { label: "Sitzungen", value: sessions, note: ga4Note },
              { label: "Engagierte Sitzungen", value: engaged, note: ga4Note },
              { label: "Anfragen (Formular + Buchung)", value: forms + books },
            ]}
          />
        </Panel>
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Pfad Formular">
            <Funnel stages={[{ label: "Formular-Anfragen", value: forms }, { label: "davon Lead im CRM", value: ev.filter((c) => c.kind === "form" && c.lead_id).length }]} />
          </Panel>
          <Panel title="Pfad Calendly">
            <Funnel
              stages={[
                { label: "Buchungen", value: books },
                { label: "bestätigt (nicht abgesagt)", value: countableBookings(bookings ?? []).filter((b) => (!ch || b.channel === ch) && b.status !== "canceled").length },
              ]}
            />
          </Panel>
        </div>
        <Panel title="Lead-Funnel (CRM-Ergebnis)" description="Leads mit Anfrage im Zeitraum, nach aktuellem Status">
          <Funnel
            stages={[
              { label: "Leads", value: L.length },
              { label: "In Bearbeitung", value: contacted },
              { label: "Termin gebucht oder weiter", value: meeting },
              { label: "Gewonnen", value: won },
            ]}
          />
        </Panel>
        <Note>
          Grenzen: GA4 zählt nur Besuche mit Einwilligung (Consent Mode), Anfragen werden immer gezählt – die Quote Sitzung → Anfrage ist darum eine Obergrenze. Zwischenschritte wie
          «Formular gesehen» oder «Formular begonnen» werden nicht gemessen und darum nicht dargestellt. Der CRM-Funnel zeigt den heutigen Status, nicht den Status am Ende des Zeitraums.
        </Note>
      </div>
    </>
  );
}
