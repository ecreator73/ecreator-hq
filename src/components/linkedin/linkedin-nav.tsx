"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Dashboard", href: "/sales/linkedin" },
  { label: "Tages-Session", href: "/sales/linkedin/session" },
  { label: "Prospects", href: "/sales/linkedin/prospects" },
  { label: "Pipeline", href: "/sales/linkedin/pipeline" },
  { label: "Kampagnen", href: "/sales/linkedin/campaigns" },
  { label: "Vorlagen", href: "/sales/linkedin/templates" },
  { label: "Follow-ups", href: "/sales/linkedin/followups" },
  { label: "Statistiken", href: "/sales/linkedin/stats" },
];

export function LinkedInNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="LinkedIn-Ansichten"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/sales/linkedin"
            ? pathname === "/sales/linkedin"
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
