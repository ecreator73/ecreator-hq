"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  handoverLeadCompanyAction,
  recomputeLeadCompanyAction,
} from "@/app/(app)/sales/lead-engine/actions";

/**
 * Uebergabe an die Sales-Pipeline. Ist die Firma bereits uebergeben, fuehrt ein
 * Link in den passenden Lead im Sales-CRM; sonst erzeugt der Button per Action
 * einen neuen Lead und aktualisiert die Ansicht.
 */
export function HandoverButton({
  companyId,
  handedOver,
  leadId,
}: {
  companyId: string;
  handedOver: boolean;
  leadId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (handedOver && leadId) {
    return (
      <Link
        href={`/sales/leads/${leadId}`}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        Im Sales-CRM
      </Link>
    );
  }

  function onHandover() {
    setError(null);
    setNote(null);
    startTransition(async () => {
      const res = await handoverLeadCompanyAction(companyId);
      if (res.ok) {
        setNote("Lead in der Sales-Pipeline erstellt.");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant="primary"
        size="sm"
        onClick={onHandover}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
        )}
        An Sales-Pipeline uebergeben
      </Button>
      {note ? <span className="text-xs text-green-600">{note}</span> : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}

/**
 * Loest eine erneute Analyse/Neuberechnung der Scores fuer die Firma aus und
 * aktualisiert anschliessend die Ansicht.
 */
export function RecomputeButton({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRecompute() {
    setError(null);
    startTransition(async () => {
      const res = await recomputeLeadCompanyAction(companyId);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        size="sm"
        onClick={onRecompute}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        )}
        Neu analysieren
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
