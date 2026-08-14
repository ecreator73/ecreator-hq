import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { contractsService, clientsService } from "@/server/services";
import {
  DocumentShell,
  PositionsTable,
  TotalLine,
  SignatureBlock,
} from "@/components/documents/document-shell";
import { companyInfo } from "@/config/company";
import { CONTRACT_TYPES, RENEWAL_TYPES } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Vertrag" };

const typeLabel = (k: string | null) =>
  k ? (CONTRACT_TYPES.find((t) => t.key === k)?.label ?? k) : null;
const renewalLabel = (k: string | null) =>
  k ? (RENEWAL_TYPES.find((t) => t.key === k)?.label ?? k) : null;

/** Vertrag als druckbares A4-Dokument im offiziellen eCreator-Layout. */
export default async function ContractDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contract = await contractsService.getById(id).catch(() => null);
  if (!contract) notFound();

  const client = contract.client_id
    ? await clientsService.getById(contract.client_id).catch(() => null)
    : null;

  const monthly = contract.value_monthly ?? 0;
  const total = contract.value_total ?? 0;
  const isMonthly = monthly > 0;
  const amount = isMonthly ? monthly : total;
  const priceLabel = isMonthly
    ? `${formatCHF(monthly, contract.currency)}/Monat`
    : formatCHF(total, contract.currency);

  // Zahlungsbedingungen: Standardtext + Laufzeit/Startdatum aus dem Vertrag.
  const terms: string[] = [companyInfo.paymentTerms];
  if (contract.start_date) terms.push(`Startdatum: ${formatDate(contract.start_date)}`);
  if (contract.end_date) terms.push(`Vertragsende: ${formatDate(contract.end_date)}`);
  if (renewalLabel(contract.renewal_type))
    terms.push(`Verlaengerung: ${renewalLabel(contract.renewal_type)}`);
  if (contract.cancellation_notice_days)
    terms.push(`Kuendigungsfrist: ${contract.cancellation_notice_days} Tage`);

  return (
    <DocumentShell
      backHref="/sales/contracts"
      backLabel="Zurueck zu Vertraege"
      documentType="VERTRAG"
      documentNumber={`VER-${contract.id.slice(0, 4).toUpperCase()}`}
      documentDate={formatDate(contract.created_at)}
      customerNumber={client ? `KD-${client.id.slice(0, 4).toUpperCase()}` : null}
      recipient={{
        name: client?.name ?? "Vertragspartner",
        lines: [client?.address, client?.city, client?.country],
      }}
    >
      <p className="text-sm leading-relaxed text-neutral-700">
        Sehr geehrte Damen und Herren,
      </p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-700">
        vielen Dank fuer Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes
        {isMonthly ? " monatliches Servicepaket" : " Angebot"}:
      </p>

      <div className="mt-6">
        <PositionsTable
          rows={[
            {
              description: contract.title,
              detail: typeLabel(contract.contract_type),
              qty: "1,00",
              unitPrice: priceLabel,
              total: priceLabel,
            },
          ]}
        />
        <TotalLine
          label={
            isMonthly ? "Monatlicher Betrag (exkl. MwSt)" : "Gesamtbetrag (exkl. MwSt)"
          }
          value={formatCHF(amount, contract.currency)}
        />
        {isMonthly && total > 0 ? (
          <p className="mt-1 text-right text-xs text-neutral-500">
            Gesamtwert ueber die Laufzeit: {formatCHF(total, contract.currency)}
          </p>
        ) : null}
      </div>

      {/* Zahlungsbedingungen */}
      <section className="mt-8 print-keep">
        <h2 className="text-sm font-semibold text-neutral-900">
          Zahlungsbedingungen:
        </h2>
        <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-neutral-700">
          {terms.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      {/* AGB-Hinweis */}
      <p className="mt-6 text-xs leading-relaxed text-neutral-500 print-keep">
        {companyInfo.termsNote}
      </p>

      <SignatureBlock customerName={client?.name} />
    </DocumentShell>
  );
}
