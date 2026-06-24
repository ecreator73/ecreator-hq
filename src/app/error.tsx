"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In Phase 1: einfaches Console-Logging. Spaeter: an Logging-Service senden.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        Etwas ist schiefgelaufen
      </h1>
      <p className="mt-2 max-w-md text-sm text-neutral-500">
        Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.
      </p>
      <Button className="mt-6" onClick={() => reset()}>
        Erneut versuchen
      </Button>
    </div>
  );
}
