"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Uebersicht", href: "/clients/growth" },
  { label: "Upsell", href: "/clients/growth/upsell" },
  { label: "Verlaengerungen", href: "/clients/growth/renewals" },
  { label: "Churn", href: "/clients/growth/churn" },
  { label: "Reviews", href: "/clients/growth/reviews" },
  { label: "Testimonials", href: "/clients/growth/testimonials" },
];

export function GrowthNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Growth-Engine-Ansichten"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/clients/growth"
            ? pathname === "/clients/growth"
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
