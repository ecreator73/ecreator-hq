"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Dashboard", href: "/clients" },
  { label: "Kunden", href: "/clients/list" },
  { label: "Verträge", href: "/clients/contracts" },
  { label: "Reporting-Calls", href: "/clients/reporting" },
  { label: "Growth Engine", href: "/clients/growth" },
  { label: "Import", href: "/clients/import" },
];

export function ClientsNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Client-Ansichten"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/clients"
            ? pathname === "/clients"
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
