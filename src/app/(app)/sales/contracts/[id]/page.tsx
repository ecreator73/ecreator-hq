import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { contractsService, clientsService } from "@/server/services";
import { DocumentShell, AmountRow } from "@/components/documents/document-shell";
import { companyInfo } from "@/config/company";
import { CONTRACT_TYPES, RENEWAL_TYPES } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Vertrag" };

const typeLabel = (k: string | null) =>
  k ? (CONTRACT_TYPES.find((t) => t.key === k)?.label ?? k) : null;
const renewalLabel = (k: string | null) =>
  k ? (RENEWAL_TYPES.find((t) => t.key === k)?.label ?? k) : null;

/** Vertrag als druckbares A4-Dokument (Browser -> "Als PDF speichern"). */
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
  const totalValue = contract.value_total ?? 0;

  const meta = [
    { label: "Datum", value: formatDate(contract.created_at) },
    ...(contract.start_date
      ? [{ label: "Beginn", value: formatDate(contract.start_date) }]
      : []),
    ...(contract.end_date
      ? [{ label: "Ende", value: formatDate(contract.end_date) }]
      : []),
  ];

  return (
    <DocumentShell
      backHref="/sales/contracts"
      backLabel="Zurueck zu Vertraege"
      documentType="Vertrag"
      documentNumber={contract.id.slice(0, 8).toUpperCase()}
      recipient={{
        name: client?.name ?? "Vertragspartner",
        lines: [client?.address, client?.city, client?.email],
      }}
      meta={meta}
    >
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        {contract.title}
      </h1>
      {typeLabel(contract.contract_type) ? (
        <p className="mt-1 text-sm text-neutral-500">
          {typeLabel(contract.contract_type)}
        </p>
      ) : null}

      {/* Vertragsparteien */}
      <section className="mt-6 grid gap-6 sm:grid-cols-2 print-keep">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-400">
            Auftragnehmerin
          </p>
          <p className="mt-1 font-medium text-neutral-900">{companyInfo.name}</p>
          {companyInfo.vatId ? (
            <p className="text-xs text-neutral-500">UID: {companyInfo.vatId}</p>
          ) : null}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-400">
            Auftraggeberin
          </p>
          <p className="mt-1 font-medium text-neutral-900">
            {client?.name ?? "-"}
          </p>
          {client?.address ? (
            <p className="text-xs text-neutral-500">
              {[client.address, client.city].filter(Boolean).join(", ")}
            </p>
          ) : null}
        </div>
      </section>

      {/* Eckdaten */}
      <section className="mt-8 print-keep">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">
          Vertragsdaten
        </h2>
        <dl className="divide-y divide-neutral-100 border-y border-neutral-200 text-sm">
          {[
            { label: "Leistung", value: contract.title },
            { label: "Vertragsart", value: typeLabel(contract.contract_type) ?? "-" },
            {
              label: "Laufzeit",
              value: [
                contract.start_date ? formatDate(contract.start_date) : null,
                contract.end_date ? formatDate(contract.end_date) : "unbefristet",
              ]
                .filter(Boolean)
                .join(" bis "),
            },
            {
              label: "Verlaengerung",
              value: renewalLabel(contract.renewal_type) ?? "-",
            },
            {
              label: "Kuendigungsfrist",
              value: contract.cancellation_notice_days
                ? `${contract.cancellation_notice_days} Tage`
                : "-",
            },
          ].map((r) => (
            <div key={r.label} className="flex justify-between gap-6 py-2">
              <dt className="text-neutral-500">{r.label}</dt>
              <dd className="text-right font-medium text-neutral-900">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Verguetung */}
      <section className="mt-8 print-keep">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Verguetung</h2>
        <div className="ml-auto w-full max-w-xs space-y-1">
          {monthly > 0 ? (
            <AmountRow
              label="Monatlich"
              value={formatCHF(monthly, contract.currency)}
            />
          ) : null}
          {totalValue > 0 ? (
            <AmountRow
              label="Gesamtwert"
              value={formatCHF(totalValue, contract.currency)}
            />
          ) : null}
          <AmountRow
            label={monthly > 0 ? "Monatlich (Total)" : "Total"}
            value={formatCHF(monthly > 0 ? monthly : totalValue, contract.currency)}
            strong
          />
        </div>
        {companyInfo.vatRate > 0 ? (
          <p className="mt-2 text-right text-xs text-neutral-500">
            Alle Betraege exkl. MwSt ({String(companyInfo.vatRate).replace(".", ",")} %).
          </p>
        ) : null}
      </section>

      {/* Unterschriften */}
      <section className="mt-14 grid gap-10 sm:grid-cols-2 print-keep">
        {[companyInfo.name, client?.name ?? "Auftraggeberin"].map((party, i) => (
          <div key={`${party}-${i}`}>
            <div className="h-12 border-b border-neutral-400" />
            <p className="mt-1.5 text-xs text-neutral-500">
              {party}
              <br />
              Ort, Datum, Unterschrift
            </p>
          </div>
        ))}
      </section>
    </DocumentShell>
  );
}
