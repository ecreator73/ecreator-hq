"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createRenewalTasksAction } from "@/app/(app)/sales/actions";

/**
 * Erzeugt fuer alle auslaufenden Vertraege (naechste 90 Tage) je eine
 * Verlaengerungs-Aufgabe. Zeigt die Anzahl der erstellten Aufgaben als Hinweis.
 */
export function ContractRenewalButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [info, setInfo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setInfo(null);
    setError(null);
    startTransition(async () => {
      const result = await createRenewalTasksAction();
      if (result.ok) {
        setInfo(result.data?.created ?? 0);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={run}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Verlaengerungs-Aufgaben erstellen
      </Button>

      {info != null ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {info === 0
              ? "Keine auslaufenden Vertraege - keine Aufgaben erstellt."
              : `${info} Verlaengerungs-Aufgabe(n) erstellt.`}
          </span>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
