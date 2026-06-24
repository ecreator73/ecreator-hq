"use client";

import { Printer } from "lucide-react";

/** Loest den Browser-Druckdialog aus (fuer Report-/Sales-Ansicht, "Als PDF speichern"). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Als PDF drucken
    </button>
  );
}
