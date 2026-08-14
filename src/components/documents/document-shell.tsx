import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/audits/print-button";
import {
  companyInfo,
  companyAddressLines,
  companyContactLine,
} from "@/config/company";

/**
 * A4-Dokumentrahmen im eCreator-Look fuer Offerten und Vertraege.
 * Bildschirm: Karte auf grauem Grund mit Zurueck- und Druck-Button.
 * Druck (Browser -> "Als PDF speichern"): reine Seite ohne Navigation.
 */
export function DocumentShell({
  backHref,
  backLabel,
  documentType,
  documentNumber,
  recipient,
  meta,
  children,
  footerNote,
}: {
  backHref: string;
  backLabel: string;
  /** z.B. "Offerte" oder "Vertrag" */
  documentType: string;
  documentNumber?: string | null;
  /** Empfaengerblock (Kunde / Ansprechpartner) */
  recipient: { name: string; lines?: Array<string | null | undefined> };
  /** Kopfdaten rechts, z.B. Datum / gueltig bis */
  meta?: Array<{ label: string; value: string }>;
  children: React.ReactNode;
  footerNote?: string;
}) {
  const address = companyAddressLines();

  return (
    <div className="space-y-4">
      {/* Bedienleiste - im Druck ausgeblendet */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-neutral-400 sm:inline">
            Im Druckdialog &bdquo;Als PDF speichern&ldquo; waehlen
          </span>
          <PrintButton />
        </div>
      </div>

      {/* A4-Blatt */}
      <article className="mx-auto w-full max-w-[210mm] rounded-xl border border-neutral-200 bg-white p-10 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Kopf: Logo + Firma */}
        <header className="flex items-start justify-between gap-8 border-b border-neutral-200 pb-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-base font-bold text-white print:bg-brand-600"
            >
              eC
            </span>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight text-neutral-900">
                {companyInfo.name}
              </p>
              {companyInfo.tagline ? (
                <p className="text-xs text-neutral-500">{companyInfo.tagline}</p>
              ) : null}
            </div>
          </div>
          <div className="text-right text-xs leading-relaxed text-neutral-500">
            {address.map((l) => (
              <p key={l}>{l}</p>
            ))}
            {companyInfo.phone ? <p>{companyInfo.phone}</p> : null}
            {companyInfo.email ? <p>{companyInfo.email}</p> : null}
            {companyInfo.website ? <p>{companyInfo.website}</p> : null}
          </div>
        </header>

        {/* Empfaenger + Dokumentdaten */}
        <div className="mt-8 flex flex-wrap items-start justify-between gap-8">
          <div className="text-sm leading-relaxed">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-neutral-400">
              An
            </p>
            <p className="font-semibold text-neutral-900">{recipient.name}</p>
            {(recipient.lines ?? [])
              .filter((l): l is string => Boolean(l && l.trim()))
              .map((l) => (
                <p key={l} className="text-neutral-600">
                  {l}
                </p>
              ))}
          </div>
          <div className="text-right text-sm">
            <p className="text-xl font-semibold tracking-tight text-neutral-900">
              {documentType}
            </p>
            {documentNumber ? (
              <p className="text-xs text-neutral-500">Nr. {documentNumber}</p>
            ) : null}
            <dl className="mt-3 space-y-0.5 text-xs">
              {(meta ?? []).map((m) => (
                <div key={m.label} className="flex justify-end gap-3">
                  <dt className="text-neutral-400">{m.label}</dt>
                  <dd className="font-medium text-neutral-700">{m.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Inhalt */}
        <div className="mt-8">{children}</div>

        {/* Fusszeile */}
        <footer className="mt-12 border-t border-neutral-200 pt-4 text-[10px] leading-relaxed text-neutral-400">
          {footerNote ? (
            <p className="mb-2 text-[11px] text-neutral-500">{footerNote}</p>
          ) : null}
          <p>
            {companyInfo.name}
            {address.length ? ` · ${address.join(", ")}` : ""}
            {companyContactLine() ? ` · ${companyContactLine()}` : ""}
          </p>
          {companyInfo.vatId || companyInfo.iban ? (
            <p>
              {companyInfo.vatId ? `UID/MWST: ${companyInfo.vatId}` : ""}
              {companyInfo.vatId && companyInfo.iban ? " · " : ""}
              {companyInfo.iban
                ? `IBAN: ${companyInfo.iban}${companyInfo.bank ? ` (${companyInfo.bank})` : ""}`
                : ""}
            </p>
          ) : null}
        </footer>
      </article>
    </div>
  );
}

/** Betragszeile (Zwischensumme / MwSt / Total) im Dokument. */
export function AmountRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-semibold text-neutral-900"
          : "flex justify-between py-1 text-sm text-neutral-600"
      }
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
