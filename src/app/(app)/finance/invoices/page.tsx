import type { Metadata } from "next";
import { billingService, type BillingInvoice } from "@/server/services/billing.service";
import { InvoiceList } from "@/components/finance/invoice-list";
import { effectiveInvoiceStatus } from "@/lib/finance";
import { clientsService } from "@/server/services";

export const metadata: Metadata = { title: "Finance - Rechnungen" };

export default async function FinanceInvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const [invoices, clients] = await Promise.all([billingService.list().catch((): BillingInvoice[] => []), clientsService.list().catch(() => [])]);
  return (
    <InvoiceList
      invoices={invoices.map((i) => ({ ...i, effective: effectiveInvoiceStatus(i) }))}
      clients={clients.filter((c) => c.status !== "ended").map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name, "de"))}
      initialFilter={status}
    />
  );
}
