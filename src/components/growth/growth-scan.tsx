"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  scanGrowthAction,
  scanRenewalsAction,
} from "@/app/(app)/clients/growth/actions";

/**
 * Stoesst den Wachstums-Scan an: zuerst scanGrowthAction (Upsell/Referral/Review/Churn),
 * danach scanRenewalsAction (Verlaengerungen). Scoring laeuft serverseitig automatisch.
 */
export function GrowthScan() {
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onScan() {
    setError(null);
    setHint(null);
    startTransition(async () => {
      const res = await scanGrowthAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await scanRenewalsAction();
      const clients = res.data?.clients ?? 0;
      setHint(`${clients} Kunden gescannt`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={onScan} disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        )}
        Wachstumschancen scannen
      </Button>
      {hint ? (
        <p className="text-xs text-emerald-600">
          {hint} — Scoring erfolgt automatisch.
        </p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        <p className="text-xs text-neutral-400">
          Scoring &amp; Priorisierung erfolgen automatisch.
        </p>
      )}
    </div>
  );
}
