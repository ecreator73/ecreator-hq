"use client";

import { useState } from "react";
import { ImportWizard } from "@/components/import/import-wizard";
import type { ImportKind } from "@/lib/import/specs";

type Tab = { kind: ImportKind; label: string };

/**
 * Tab-Hub fuer die CSV-Imports. Schaltet zwischen Kunden / Vertraegen /
 * (optional) Finance um und rendert den passenden ImportWizard. Der `key`
 * setzt den Wizard bei jedem Tabwechsel auf Schritt 1 zurueck.
 */
export function ImportTabs({ canFinance }: { canFinance: boolean }) {
  const tabs: Tab[] = [
    { kind: "customers", label: "Kunden" },
    { kind: "contracts", label: "Vertraege" },
    ...(canFinance ? [{ kind: "invoices" as ImportKind, label: "Finance" }] : []),
  ];

  const [active, setActive] = useState<ImportKind>("customers");

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Import-Typ"
        className="inline-flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1"
      >
        {tabs.map((tab) => {
          const isActive = tab.kind === active;
          return (
            <button
              key={tab.kind}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.kind)}
              className={
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors " +
                (isActive
                  ? "bg-white text-brand-700 shadow-sm ring-1 ring-neutral-200"
                  : "text-neutral-600 hover:text-neutral-900")
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <ImportWizard key={active} kind={active} />
    </div>
  );
}
