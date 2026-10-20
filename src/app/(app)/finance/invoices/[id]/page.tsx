import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { billingService, billTo } from "@/server/services/billing.service";
import { DocumentShell, PositionsTable } from "@/components/documents/document-shell";
import { QrBill } from "@/components/finance/qr-bill";
import { InvoiceToolbar, InvoiceWorkbench } from "@/components/finance/invoice-workbench";
import { companyInfo } from "@/config/company";
import { formatCHFExact } from "@/lib/utils";
import { effectiveInvoiceStatus } from "@/lib/finance";

export const metadata: Metadata = { title: "Finance - Rechnung" };

const chDate = (d: string | null | undefined) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : "–");
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export default async function FinanceInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await billingService.get(id).catch(() => null);
  if (!inv) notFound();

  const to = billTo(inv.billing);
  const status = effectiveInvoiceStatus(inv);
  const vatLabel = `MWST ${inv.vat_rate.toLocaleString("de-CH")} %`;
  const period = inv.period_from && inv.period_to ? `${chDate(inv.period_from)} – ${chDate(inv.period_to)}` : null;
  const days = inv.issue_date && inv.due_date ? Math.round((Date.parse(inv.due_date) - Date.parse(inv.issue_date)) / 86_400_000) : null;
  const canQr = inv.status !== "cancelled" && inv.issue_date && inv.invoice_number;

  return (
    <div className="space-y-5">
      <InvoiceWorkbench invoice={inv} status={status} />
      <DocumentShell
        backHref="/finance/invoices"
        backLabel="Alle Rechnungen"
        documentType="RECHNUNG"
        documentNumber={inv.invoice_number ?? "Entwurf"}
        documentDate={chDate(inv.issue_date)}
        customerNumber={inv.client?.customer_number ? String(inv.client.customer_number) : null}
        recipient={{ name: to?.name ?? inv.client?.name ?? "Kunde", lines: [to?.contact ? `z. Hd. ${to.contact}` : null, to?.street, [to?.zip, to?.city].filter(Boolean).join(" ")] }}
        extraMeta={[
          ...(period ? [{ label: "Periode:", value: period }] : []),
          { label: "Zahlbar bis:", value: chDate(inv.due_date) },
          ...(inv.contract?.contract_number ? [{ label: "Vertrag:", value: inv.contract.contract_number }] : []),
        ]}
        toolbar={<InvoiceToolbar invoice={inv} status={status} />}
        appendix={
          canQr ? (
            <QrBill
              input={{
                total: inv.total,
                reference: inv.qr_reference,
                invoiceNumber: inv.invoice_number!,
                issueDate: inv.issue_date!,
                dueDate: inv.due_date,
                periodFrom: inv.period_from,
                periodTo: inv.period_to,
                vatRate: inv.vat_rate,
                debtor: to ? { name: to.name, street: to.street, zip: to.zip, city: to.city, country: to.country } : null,
              }}
            />
          ) : null
        }
      >
        {inv.status === "draft" ? (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 print:hidden">Entwurf: noch nicht freigegeben.</p>
        ) : null}
        {inv.status === "cancelled" ? <p className="mb-4 text-lg font-bold uppercase tracking-wide text-rose-700">Storniert</p> : null}
        <h2 className="mb-4 text-base font-semibold text-neutral-900">{inv.title ?? "Rechnung"}</h2>
        <PositionsTable
          rows={inv.items.map((it) => ({
            description: it.title,
            detail: it.description,
            qty: qty(it.quantity),
            unitPrice: formatCHFExact(it.unit_price),
            total: formatCHFExact(Math.round(it.quantity * it.unit_price)),
          }))}
        />
        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Total exkl. MWST</dt>
            <dd className="tabular-nums text-neutral-800">{formatCHFExact(inv.amount ?? 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">{vatLabel}</dt>
            <dd className="tabular-nums text-neutral-800">{formatCHFExact(inv.vat ?? 0)}</dd>
          </div>
          <div className="flex justify-between border-t-2 pt-2 text-base font-bold" style={{ borderColor: companyInfo.brandColor }}>
            <dt>Total</dt>
            <dd className="tabular-nums" style={{ color: companyInfo.brandColor }}>
              {formatCHFExact(inv.total)}
            </dd>
          </div>
        </dl>
        <div className="mt-10 space-y-2 text-xs leading-relaxed text-neutral-600 print-keep">
          <p>
            Zahlbar {days != null ? `innert ${days} Tagen` : ""} bis {chDate(inv.due_date)} mit dem beiliegenden QR-Zahlteil
            {inv.qr_reference ? " (bitte Referenz angeben)" : ""}.
          </p>
          {inv.notes ? <p className="whitespace-pre-line">{inv.notes}</p> : null}
          <p>Vielen Dank für die Zusammenarbeit.</p>
        </div>
      </DocumentShell>
    </div>
  );
}
