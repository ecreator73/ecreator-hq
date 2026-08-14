import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { offersService, clientsService, leadsService } from "@/server/services";
import {
  DocumentShell,
  PositionsTable,
  TotalLine,
  SignatureBlock,
} from "@/components/documents/document-shell";
import { companyInfo } from "@/config/company";
import { OFFER_TYPES } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import type { Client, LeadWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Offerte" };

const typeLabel = (k: string | null) =>
  k ? (OFFER_TYPES.find((t) => t.key === k)?.label ?? k) : null;

/** Offerte als druckbares A4-Dokument im offiziellen eCreator-Layout. */
export default async function OfferDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const offer = await offersService.getById(id).catch(() => null);
  if (!offer) notFound();

  // Empfaenger: Kunde oder (falls die Offerte an einen Lead geht) der Lead.
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
    ? [client.address, client.city, client.country]
    : [lead?.contact_name, lead?.city, lead?.email];

  const amount = offer.amount ?? 0;
  const price = formatCHF(amount, offer.currency);

  return (
    <DocumentShell
      backHref="/sales/offers"
      backLabel="Zurueck zu Angebote"
      documentType="OFFERTE"
      documentNumber={`OFF-${offer.id.slice(0, 4).toUpperCase()}`}
      documentDate={formatDate(offer.sent_date ?? offer.created_at)}
      customerNumber={client ? `KD-${client.id.slice(0, 4).toUpperCase()}` : null}
      recipient={{ name: recipientName, lines: recipientLines }}
      extraMeta={
        offer.valid_until
          ? [{ label: "Gueltig bis:", value: formatDate(offer.valid_until) }]
          : undefined
      }
    >
      <p className="text-sm leading-relaxed text-neutral-700">
        Sehr geehrte Damen und Herren,
      </p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-700">
        vielen Dank fuer Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes
        Angebot:
      </p>

      <div className="mt-6">
        <PositionsTable
          rows={[
            {
              description: offer.title,
              detail: typeLabel(offer.offer_type),
              qty: "1,00",
              unitPrice: price,
              total: price,
            },
          ]}
        />
        <TotalLine label="Gesamtbetrag (exkl. MwSt)" value={price} />
      </div>

      <section className="mt-8 print-keep">
        <h2 className="text-sm font-semibold text-neutral-900">
          Zahlungsbedingungen:
        </h2>
        <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-neutral-700">
          <li>{companyInfo.paymentTerms}</li>
          {offer.valid_until ? (
            <li>Diese Offerte ist gueltig bis {formatDate(offer.valid_until)}.</li>
          ) : null}
        </ul>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-neutral-500 print-keep">
        {companyInfo.termsNote}
      </p>

      <SignatureBlock customerName={client?.name ?? lead?.company_name} />
    </DocumentShell>
  );
}
