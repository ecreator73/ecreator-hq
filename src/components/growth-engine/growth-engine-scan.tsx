"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  scanGrowthEngineAction,
  syncJourneysAction,
} from "@/app/(app)/operations/growth/actions";

/**
 * Fuehrt die Growth Engine aus: erzeugt priorisierte Empfehlungen (und bei
 * kritischen Faellen Aufgaben/Alerts) und synchronisiert anschliessend die
 * Revenue Journeys. KEIN Versand - nur Vorschlaege.
 */
export function GrowthEngineScan() {
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onRun() {
    setError(null);
    setHint(null);
    startTransition(async () => {
      const res = await scanGrowthEngineAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await syncJourneysAction();
      const d = res.data;
      setHint(
        `${d?.created ?? 0} Empfehlungen · ${d?.tasks ?? 0} Aufgaben · ${d?.alerts ?? 0} Alerts`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={onRun} disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        )}
        Engine ausfuehren
      </Button>
      {hint ? (
        <p className="text-xs text-emerald-600">{hint}</p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        <p className="text-xs text-neutral-400">
          Scan erzeugt Vorschlaege &amp; Aufgaben - kein Versand.
        </p>
      )}
    </div>
  );
}

/** Synchronisiert die Revenue Journeys aus dem aktuellen Funnel-Stand. */
export function JourneySyncButton() {
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSync() {
    setError(null);
    setHint(null);
    startTransition(async () => {
      const res = await syncJourneysAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const d = res.data;
      setHint(`${d?.created ?? 0} neu · ${d?.updated ?? 0} aktualisiert`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="secondary" onClick={onSync} disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        )}
        Journeys synchronisieren
      </Button>
      {hint ? (
        <p className="text-xs text-emerald-600">{hint}</p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
