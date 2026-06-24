"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  FileText,
  Loader2,
  Presentation,
  ReceiptText,
  ScrollText,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusSelect } from "@/components/production/status-select";
import { PROPOSAL_STATUSES } from "@/config/catalog";
import type { ProposalWithRelations } from "@/types/entities";
import {
  setProposalStatusAction,
  newProposalVersionAction,
  createInvoiceDraftAction,
  deleteProposalAction,
} from "@/app/(app)/sales/proposals/actions";

const linkBtnClass =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50";

/**
 * Aktionsleiste fuer ein Proposal: Status aendern, neue Version, Rechnungsentwurf,
 * Dokument-Links (Offerte/Praesentation/Vertrag) und Loeschen.
 */
export function ProposalActions({ proposal }: { proposal: ProposalWithRelations }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(proposal.invoice_id);

  function onNewVersion() {
    setError(null);
    startTransition(async () => {
      const res = await newProposalVersionAction(proposal.id);
      if (res.ok && res.data) {
        router.push(`/sales/proposals/${res.data.id}`);
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  function onCreateInvoice() {
    setError(null);
    startTransition(async () => {
      const res = await createInvoiceDraftAction(proposal.id);
      if (res.ok && res.data) {
        setInvoiceId(res.data.invoiceId);
        router.refresh();
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  function onDelete() {
    if (!window.confirm("Dieses Angebot wirklich loeschen? Das kann nicht rueckgaengig gemacht werden.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteProposalAction(proposal.id);
      if (res.ok) {
        router.push("/sales/proposals/list");
      } else {
        setError(res.error);
      }
    });
  }

  const base = `/sales/proposals/${proposal.id}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusSelect
          id={proposal.id}
          value={proposal.status}
          statuses={PROPOSAL_STATUSES}
          action={setProposalStatusAction}
        />

        <Button variant="secondary" size="sm" onClick={onNewVersion} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Neue Version
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onCreateInvoice}
          disabled={pending}
        >
          <ReceiptText className="h-4 w-4" />
          Rechnungsentwurf erstellen
        </Button>

        <Link href={`${base}/offer`} className={linkBtnClass}>
          <FileText className="h-4 w-4" />
          Offerte
        </Link>

        <Link href={`${base}/presentation`} className={linkBtnClass}>
          <Presentation className="h-4 w-4" />
          Praesentation
        </Link>

        <Link href={`${base}/contract`} className={linkBtnClass}>
          <ScrollText className="h-4 w-4" />
          Vertrag
        </Link>

        <Button variant="danger" size="sm" onClick={onDelete} disabled={pending}>
          <Trash2 className="h-4 w-4" />
          Loeschen
        </Button>
      </div>

      {invoiceId ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Rechnungsentwurf erstellt.{" "}
          <Link
            href="/finance/invoices"
            className="font-medium underline underline-offset-2 hover:text-green-800"
          >
            Zu den Rechnungen
          </Link>
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
