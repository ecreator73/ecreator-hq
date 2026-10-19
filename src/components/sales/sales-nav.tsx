"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Der /sales-Bereich beherbergt ZWEI getrennte Arbeitsbereiche:
 *  - Leads  (neue Kontakte gewinnen)
 *  - Sales  (Abschluss machen)
 * Die Tab-Leiste zeigt deshalb je nach Route nur die passenden Punkte -
 * so bleibt das Menue uebersichtlich, ohne URLs zu brechen.
 */
const LEADS_TABS = [
  { label: "Arbeitsliste", href: "/leads" },
  { label: "Alle Leads", href: "/leads/alle" },
  { label: "Kampagnen", href: "/leads/kampagnen" },
  { label: "Team", href: "/leads/team" },
  { label: "Mein Bereich", href: "/leads/mein" },
];

const SALES_TABS = [
  { label: "Dashboard", href: "/sales" },
  { label: "Angebote", href: "/sales/offers" },
  { label: "Vertraege", href: "/sales/contracts" },
  { label: "Termine", href: "/sales/meetings" },
];

/** Routen, die fachlich zum Leads-Bereich gehoeren. */
const LEADS_PREFIXES = [
  "/leads",
  "/sales/leads",
  "/sales/pipeline",
  "/sales/linkedin",
  "/sales/followups",
];

export function isLeadsArea(pathname: string): boolean {
  return LEADS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function SalesNav() {
  const pathname = usePathname();
  const leads = isLeadsArea(pathname);
  const tabs = leads ? LEADS_TABS : SALES_TABS;
  const exact = leads ? "/leads" : "/sales";

  return (
    <nav
      aria-label={leads ? "Leads-Ansichten" : "Sales-Ansichten"}
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px"
    >
      {tabs.map((tab) => {
        const active =
          tab.href === exact
            ? pathname === exact
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Kopfzeile des Bereichs - Titel/Beschreibung passend zu Leads bzw. Sales. */
export function SalesAreaHeader({ action }: { action?: React.ReactNode }) {
  const pathname = usePathname();
  const leads = isLeadsArea(pathname);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          {leads ? "Leads" : "Sales"}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
          {leads ? "Leads" : "Sales"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          {leads
            ? "Leads anrufen, nächste Schritte planen und sehen, was jede Kampagne bringt."
            : "Abschluss machen - Angebote, Vertraege und Termine."}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
