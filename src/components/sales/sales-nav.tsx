"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Dashboard", href: "/sales" },
  { label: "Lead Engine", href: "/sales/lead-engine" },
  { label: "Website Audits", href: "/sales/audits" },
  { label: "Proposals", href: "/sales/proposals" },
  { label: "Outreach", href: "/sales/outreach" },
  { label: "Leads", href: "/sales/leads" },
  { label: "Pipeline", href: "/sales/pipeline" },
  { label: "Termine", href: "/sales/meetings" },
  { label: "Angebote", href: "/sales/offers" },
  { label: "Verträge", href: "/sales/contracts" },
  { label: "Aktivitaeten", href: "/sales/activities" },
  { label: "Follow-ups", href: "/sales/followups" },
];

export function SalesNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sales-Ansichten"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/sales"
            ? pathname === "/sales"
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
