import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { offersService, clientsService, leadsService } from "@/server/services";
import { DocumentShell, AmountRow } from "@/components/documents/document-shell";
import { companyInfo } from "@/config/company";
import { OFFER_TYPES } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import type { Client, LeadWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Offerte" };

const typeLabel = (k: string | null) =>
  k ? (OFFER_TYPES.find((t) => t.key === k)?.label ?? k) : null;

/** Offerte als druckbares A4-Dokument (Browser -> "Als PDF speichern"). */
export default async function OfferDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const offer = await offersService.getById(id).catch(() => null);
  if (!offer) notFound();

  // Empfaenger: Kunde oder (falls Offerte an einen Lead geht) der Lead.
  const [client, lead] = await Promise.all([
    offer.client_id
      ? clientsService.getById(offer.client_id).catch(() => null)
      : Promise.resolve(null as Client | null),
    offer.lead_id
      ? leadsService.getById(offer.lead_id).catch(() => null)
      : Promise.resolve(null as LeadWithRelations | null),
  ]);

  const recipientName =
    client?.name ?? lead?.company_name ?? lead?.contact_name ?? "Empfaenger";
  const recipientLines = client
    ? [lead?.contact_name, client.address, [client.city].filter(Boolean).join(" "), client.email]
    : [lead?.contact_name, lead?.city, lead?.email];

  // Betrag: hinterlegter Wert = Nettobetrag; MwSt wird darauf gerechnet.
  const net = offer.amount ?? 0;
  const vat = companyInfo.vatRate > 0 ? Math.round((net * companyInfo.vatRate) / 100) : 0;
  const total = net + vat;

  const meta = [
    { label: "Datum", value: formatDate(offer.sent_date ?? offer.created_at) },
    ...(offer.valid_until
      ? [{ label: "Gueltig bis", value: formatDate(offer.valid_until) }]
      : []),
  ];

  return (
    <DocumentShell
      backHref="/sales/offers"
      backLabel="Zurueck zu Angebote"
      documentType="Offerte"
      documentNumber={offer.id.slice(0, 8).toUpperCase()}
      recipient={{ name: recipientName, lines: recipientLines }}
      meta={meta}
      footerNote={`Diese Offerte ist${offer.valid_until ? ` bis zum ${formatDate(offer.valid_until)}` : " 30 Tage"} gueltig. Zahlungsfrist ${companyInfo.paymentTermDays} Tage netto.`}
    >
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        {offer.title}
      </h1>
      {typeLabel(offer.offer_type) ? (
        <p className="mt-1 text-sm text-neutral-500">{typeLabel(offer.offer_type)}</p>
      ) : null}

      <p className="mt-6 text-sm leading-relaxed text-neutral-600">
        Vielen Dank fuer Ihr Interesse an einer Zusammenarbeit. Nachfolgend
        unsere Offerte fuer die besprochenen Leistungen.
      </p>

      {/* Leistungen */}
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="pb-2 font-medium">Leistung</th>
            <th className="pb-2 text-right font-medium">Betrag</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-neutral-100">
            <td className="py-3 align-top">
              <p className="font-medium text-neutral-900">{offer.title}</p>
              {typeLabel(offer.offer_type) ? (
                <p className="mt-0.5 text-xs text-neutral-500">
                  {typeLabel(offer.offer_type)}
                </p>
              ) : null}
            </td>
            <td className="py-3 text-right align-top tabular-nums text-neutral-900">
              {formatCHF(net, offer.currency)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Summen */}
      <div className="ml-auto mt-6 w-full max-w-xs space-y-1">
        <AmountRow label="Nettobetrag" value={formatCHF(net, offer.currency)} />
        {companyInfo.vatRate > 0 ? (
          <AmountRow
            label={`MwSt ${String(companyInfo.vatRate).replace(".", ",")} %`}
            value={formatCHF(vat, offer.currency)}
          />
        ) : null}
        <AmountRow
          label="Gesamtbetrag"
          value={formatCHF(total, offer.currency)}
          strong
        />
      </div>

      {/* Konditionen */}
      <section className="mt-10 space-y-2 text-sm leading-relaxed text-neutral-600 print-keep">
        <h2 className="text-sm font-semibold text-neutral-900">Konditionen</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Zahlungsfrist: {companyInfo.paymentTermDays} Tage netto ab
            Rechnungsdatum.
          </li>
          {offer.valid_until ? (
            <li>Diese Offerte ist gueltig bis {formatDate(offer.valid_until)}.</li>
          ) : null}
          <li>Alle Betraege in {offer.currency ?? "CHF"}{companyInfo.vatRate > 0 ? ", zzgl. MwSt wie ausgewiesen" : ""}.</li>
        </ul>
      </section>

      <section className="mt-10 text-sm text-neutral-600 print-keep">
        <p>
          Wir freuen uns auf die Zusammenarbeit. Bei Fragen stehen wir Ihnen
          jederzeit gerne zur Verfuegung.
        </p>
        <p className="mt-6 font-medium text-neutral-900">
          Freundliche Gruesse
          <br />
          {companyInfo.name}
        </p>
      </section>
    </DocumentShell>
  );
}
