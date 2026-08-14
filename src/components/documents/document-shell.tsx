import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/audits/print-button";
import { companyInfo, companyAddressLines, companyFooterLine } from "@/config/company";

/**
 * A4-Dokumentrahmen im eCreator-Look (nach dem offiziellen Vertragslayout):
 * Logo + Claim oben, Absender/Empfaenger, Dokumentblock rechts, Fusszeile mit
 * Kontakt- und Bankverbindung.
 * Bildschirm: Karte mit Zurueck- und Druck-Button. Druck: reine A4-Seite.
 */
export function DocumentShell({
  backHref,
  backLabel,
  documentType,
  documentNumber,
  documentDate,
  customerNumber,
  recipient,
  extraMeta,
  children,
}: {
  backHref: string;
  backLabel: string;
  /** "VERTRAG" oder "OFFERTE" */
  documentType: string;
  documentNumber?: string | null;
  documentDate?: string | null;
  customerNumber?: string | null;
  recipient: { name: string; lines?: Array<string | null | undefined> };
  extraMeta?: Array<{ label: string; value: string }>;
  children: React.ReactNode;
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
      <article className="mx-auto flex w-full max-w-[210mm] flex-col rounded-xl border border-neutral-200 bg-white p-10 shadow-sm print:min-h-[257mm] print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Kopf: Logo + Claim */}
        <header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={companyInfo.logoSrc}
            alt={companyInfo.name}
            className="h-11 w-auto"
          />
          <p
            className="mt-3 text-[9px] font-semibold uppercase tracking-[0.25em]"
            style={{ color: companyInfo.brandColor }}
          >
            {companyInfo.claim}
          </p>
        </header>

        {/* Absender / Empfaenger / Dokumentdaten */}
        <div className="mt-10 flex flex-wrap items-start justify-between gap-8">
          <div className="space-y-6 text-sm leading-relaxed">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {companyInfo.name}
              </p>
              <div className="text-xs text-neutral-500">
                {address.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                Kunde
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
          </div>

          <div className="min-w-[13rem] text-right">
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ color: companyInfo.brandColor }}
            >
              {documentType}
            </p>
            <dl className="mt-3 space-y-1 text-xs">
              {documentNumber ? (
                <MetaRow label={`${documentType === "VERTRAG" ? "Vertrags" : "Offerten"}-Nr.:`} value={documentNumber} />
              ) : null}
              {documentDate ? <MetaRow label="Datum:" value={documentDate} /> : null}
              {customerNumber ? (
                <MetaRow label="Kundennummer:" value={customerNumber} />
              ) : null}
              {(extraMeta ?? []).map((m) => (
                <MetaRow key={m.label} label={m.label} value={m.value} />
              ))}
            </dl>
          </div>
        </div>

        {/* Inhalt */}
        <div className="mt-10 flex-1">{children}</div>

        {/* Fusszeile: Adresse | Kontakt | Bank */}
        <footer className="mt-12 border-t border-neutral-200 pt-4">
          <p className="text-[10px] font-medium text-neutral-500">
            {companyFooterLine()}
          </p>
          <div className="mt-2 grid gap-4 text-[10px] leading-relaxed text-neutral-400 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-neutral-500">Kontakt</p>
              <p>Tel: {companyInfo.phone}</p>
              <p>E-Mail: {companyInfo.email}</p>
              <p>Web: {companyInfo.website}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral-500">Bankverbindung</p>
              <p>Bank: {companyInfo.bank}</p>
              <p>IBAN: {companyInfo.iban}</p>
              <p>UID: {companyInfo.uid}</p>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-end gap-3">
      <dt className="text-neutral-400">{label}</dt>
      <dd className="font-semibold text-neutral-800">{value}</dd>
    </div>
  );
}

/** Positionstabelle wie im Originalvertrag. */
export function PositionsTable({
  rows,
}: {
  rows: Array<{
    description: string;
    detail?: string | null;
    qty: string;
    unitPrice: string;
    total: string;
  }>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr
          className="text-left text-[11px] font-semibold uppercase tracking-wide text-white"
          style={{ backgroundColor: companyInfo.brandColor }}
        >
          <th className="w-10 px-3 py-2">Pos.</th>
          <th className="px-3 py-2">Beschreibung</th>
          <th className="w-16 px-3 py-2 text-right">Menge</th>
          <th className="w-32 px-3 py-2 text-right">Einzelpreis</th>
          <th className="w-32 px-3 py-2 text-right">Gesamt</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.description}-${i}`} className="border-b border-neutral-200 align-top">
            <td className="px-3 py-3 text-neutral-500">{i + 1}</td>
            <td className="px-3 py-3">
              <p className="font-semibold text-neutral-900">{r.description}</p>
              {r.detail ? (
                <p className="mt-0.5 text-xs text-neutral-500">{r.detail}</p>
              ) : null}
            </td>
            <td className="px-3 py-3 text-right tabular-nums text-neutral-700">{r.qty}</td>
            <td className="px-3 py-3 text-right tabular-nums text-neutral-700">
              {r.unitPrice}
              <span className="block text-[10px] text-neutral-400">(exkl. MwSt)</span>
            </td>
            <td className="px-3 py-3 text-right font-semibold tabular-nums text-neutral-900">
              {r.total}
              <span className="block text-[10px] font-normal text-neutral-400">
                (exkl. MwSt)
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Hervorgehobene Summenzeile (z.B. "Monatlicher Betrag (exkl. MwSt)"). */
export function TotalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 flex items-center justify-end gap-6 border-t-2 pt-3" style={{ borderColor: companyInfo.brandColor }}>
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <span
        className="text-lg font-bold tabular-nums"
        style={{ color: companyInfo.brandColor }}
      >
        {value}
      </span>
    </div>
  );
}

/** Unterschriftenblock: Kunde links, eCreator rechts. */
export function SignatureBlock({ customerName }: { customerName?: string | null }) {
  return (
    <section className="mt-14 grid gap-12 sm:grid-cols-2 print-keep">
      <div>
        <div className="h-14 border-b border-neutral-400" />
        <p className="mt-1.5 text-[11px] text-neutral-500">
          {customerName ? `${customerName}` : "Kunde"}
          <br />
          Ort, Datum &amp; Unterschrift
        </p>
      </div>
      <div>
        <div className="h-14 border-b border-neutral-400" />
        <p className="mt-1.5 text-[11px] text-neutral-500">
          {companyInfo.name}
          <br />
          Autorisierte Unterschrift
        </p>
      </div>
    </section>
  );
}
