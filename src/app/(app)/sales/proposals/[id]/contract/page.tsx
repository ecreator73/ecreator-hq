import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/audits/print-button";
import { proposalsService } from "@/server/services";
import { PROPOSAL_TYPE_LABELS } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Sales - Vertragsentwurf" };

export default async function ProposalContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const proposal = await proposalsService.getDetail(id).catch(() => null);
  if (!proposal) notFound();

  const recipient =
    proposal.client?.name || proposal.lead?.company_name || "Auftraggeber";
  const typeLabel = proposal.proposal_type
    ? (PROPOSAL_TYPE_LABELS[
        proposal.proposal_type as keyof typeof PROPOSAL_TYPE_LABELS
      ] ?? proposal.proposal_type)
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none">
      {/* Aktionsleiste (nicht gedruckt) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/sales/proposals/${proposal.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zum Vorschlag
        </Link>
        <PrintButton />
      </div>

      {/* Warn-Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold">
            Vertragsentwurf &mdash; kein Rechtsersatz
          </p>
          <p className="mt-0.5 text-sm text-amber-800">
            Dieses Dokument ist ein unverbindlicher Entwurf und ersetzt keine
            rechtliche Beratung. Vor Unterzeichnung durch eine Fachperson
            pruefen lassen.
          </p>
        </div>
      </div>

      {/* Druckbarer Vertragsentwurf */}
      <article className="space-y-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Branding-Kopf */}
        <header className="space-y-1 border-b border-neutral-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {siteConfig.company}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Vertragsentwurf
          </h1>
          <p className="text-sm text-neutral-600">{proposal.title}</p>
          {typeLabel ? (
            <p className="text-sm text-neutral-400">{typeLabel}</p>
          ) : null}
        </header>

        {/* Parteien */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Auftragnehmer
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">
              {siteConfig.company}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Auftraggeber
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">
              {recipient}
            </p>
          </div>
        </section>

        {/* Vertragsgegenstand / Laufzeit */}
        <section className="break-inside-avoid space-y-3">
          <h2 className="text-base font-semibold text-neutral-900">
            1. Vertragsgegenstand &amp; Laufzeit
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Laufzeit"
              value={
                proposal.contract_duration_months
                  ? `${proposal.contract_duration_months} Monate`
                  : "Nicht festgelegt"
              }
            />
            <Field
              label="Startdatum"
              value={
                proposal.contract_start_date
                  ? formatDate(proposal.contract_start_date)
                  : "Nicht festgelegt"
              }
            />
          </dl>
        </section>

        {/* Preis */}
        <section className="break-inside-avoid space-y-3">
          <h2 className="text-base font-semibold text-neutral-900">
            2. Verguetung
          </h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Field label="Einmalig" value={formatCHF(proposal.amount)} />
            <Field
              label="Monatlich"
              value={formatCHF(proposal.monthly_amount)}
            />
            <Field label="Setup" value={formatCHF(proposal.setup_fee)} />
          </dl>
          <p className="text-xs text-neutral-400">
            Alle Betraege exkl. MwSt.
          </p>
        </section>

        {/* Leistungen */}
        <section className="break-inside-avoid space-y-3">
          <h2 className="text-base font-semibold text-neutral-900">
            3. Leistungen
          </h2>
          {proposal.items.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Noch keine Leistungen erfasst.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {proposal.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 px-4 py-3 break-inside-avoid"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-neutral-900">
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-500">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-right text-sm font-semibold text-neutral-900">
                    {formatCHF(item.total_price)}
                    {item.recurring ? (
                      <span className="text-xs font-normal text-neutral-400">
                        {" "}
                        / Monat
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Zahlungsbedingungen */}
        <section className="break-inside-avoid space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">
            4. Zahlungsbedingungen
          </h2>
          {proposal.payment_terms ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {proposal.payment_terms}
            </p>
          ) : (
            <p className="text-sm text-neutral-400">
              Keine Zahlungsbedingungen hinterlegt.
            </p>
          )}
        </section>

        {/* Kuendigung */}
        <section className="break-inside-avoid space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">
            5. Kuendigung
          </h2>
          {proposal.cancellation_terms ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {proposal.cancellation_terms}
            </p>
          ) : (
            <p className="text-sm text-neutral-400">
              Keine Kuendigungsbedingungen hinterlegt.
            </p>
          )}
        </section>

        {/* Datenschutz */}
        <section className="break-inside-avoid space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">
            6. Datenschutz
          </h2>
          <p className="text-sm leading-relaxed text-neutral-700">
            Beide Parteien verpflichten sich zur Einhaltung der geltenden
            Datenschutzbestimmungen (revDSG). Personendaten werden ausschliesslich
            zur Vertragserfuellung bearbeitet und nicht unbefugt an Dritte
            weitergegeben.
          </p>
        </section>

        {/* Unterschriften */}
        <section className="break-inside-avoid grid gap-8 pt-4 sm:grid-cols-2">
          <SignatureLine label={`${siteConfig.company} (Auftragnehmer)`} />
          <SignatureLine label={`${recipient} (Auftraggeber)`} />
        </section>

        {/* Fusszeile */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-4 text-xs text-neutral-400">
          <span>
            {siteConfig.company} &middot; Vertragsentwurf &middot;{" "}
            {formatDate(proposal.created_at)}
          </span>
          <span>Entwurf &middot; kein Rechtsersatz</span>
        </footer>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-neutral-900">{value}</dd>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <div className="h-12 border-b border-neutral-300" />
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-xs text-neutral-400">Ort, Datum / Unterschrift</p>
    </div>
  );
}
