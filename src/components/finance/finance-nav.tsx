"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Dashboard", href: "/finance" },
  { label: "Rechnungen", href: "/finance/invoices" },
  { label: "Offen", href: "/finance/open" },
  { label: "Kosten", href: "/finance/expenses" },
  { label: "Monatsuebersicht", href: "/finance/monthly" },
  { label: "Forecast", href: "/finance/forecast" },
  { label: "Kunden", href: "/finance/customers" },
  { label: "Reports", href: "/finance/reports" },
  { label: "Kalender", href: "/finance/calendar" },
];

export function FinanceNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Finance-Ansichten"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/finance"
            ? pathname === "/finance"
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
