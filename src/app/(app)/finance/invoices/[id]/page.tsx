import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusSelect } from "@/components/production/status-select";
import { StatusBadge } from "@/components/tasks/status-badge";
import { invoicesService } from "@/server/services";
import { setInvoiceStatusAction } from "@/app/(app)/finance/actions";
import { INVOICE_STATUSES, statusLabel } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import { effectiveInvoiceStatus } from "@/lib/finance";

export const metadata: Metadata = { title: "Finance - Rechnung" };

function invoiceStatusColor(key: string): string | undefined {
  return INVOICE_STATUSES.find((s) => s.key === key)?.color;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-neutral-100 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm font-medium text-neutral-500">{label}</dt>
      <dd className="text-sm text-neutral-900 sm:text-right">{children}</dd>
    </div>
  );
}

export default async function FinanceInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const inv = await invoicesService.getById(id).catch(() => null);
  if (!inv) notFound();

  const eff = effectiveInvoiceStatus(inv);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/finance/invoices"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurueck zu Rechnungen
          </Link>
          <h1 className="text-xl font-semibold text-neutral-900">
            {inv.title ?? "(ohne Titel)"}
          </h1>
          <p className="text-sm text-neutral-500">
            Rechnung Nr. {inv.invoice_number ?? "-"}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <span className="text-xs uppercase tracking-wide text-neutral-400">
            Status aendern
          </span>
          <StatusSelect
            id={inv.id}
            value={inv.status}
            statuses={INVOICE_STATUSES}
            action={setInvoiceStatusAction}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rechnungsdetails</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <DetailRow label="Kunde">{inv.client?.name ?? "-"}</DetailRow>
            <DetailRow label="Betrag (netto)">
              <span className="tabular-nums font-medium">
                {formatCHF(inv.amount ?? 0)}
              </span>
            </DetailRow>
            <DetailRow label="MWST">
              <span className="tabular-nums">{formatCHF(inv.vat ?? 0)}</span>
            </DetailRow>
            <DetailRow label="Faelligkeit">
              {inv.due_date ? formatDate(inv.due_date) : "-"}
            </DetailRow>
            <DetailRow label="Bezahlt am">
              {inv.paid_date ? formatDate(inv.paid_date) : "-"}
            </DetailRow>
            <DetailRow label="Status">
              <span
                className="inline-flex items-center gap-2"
                title={`Gespeichert: ${statusLabel("invoice", inv.status)}`}
              >
                <StatusBadge
                  label={statusLabel("invoice", eff)}
                  color={invoiceStatusColor(eff)}
                />
              </span>
            </DetailRow>
            <DetailRow label="PDF">
              {inv.pdf_url ? (
                <a
                  href={inv.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:text-brand-800"
                >
                  PDF oeffnen
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                "-"
              )}
            </DetailRow>
            <div className="pt-3">
              <dt className="text-sm font-medium text-neutral-500">Notizen</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
                {inv.notes?.trim() ? inv.notes : "-"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
