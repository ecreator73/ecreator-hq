"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Command Center", href: "/operations/growth" },
  { label: "Pipeline", href: "/operations/growth/pipeline" },
  { label: "Empfehlungen", href: "/operations/growth/recommendations" },
  { label: "Journeys", href: "/operations/growth/journeys" },
  { label: "Briefing", href: "/operations/growth/briefing" },
  { label: "Wochenreport", href: "/operations/growth/report" },
  { label: "Orchestrierung", href: "/operations/growth/orchestrations" },
  { label: "Assistant", href: "/operations/growth/assistant" },
];

/** Sekundaere Navigation der Growth Engine (Pill-Style, klar abgesetzt). */
export function GrowthEngineNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Growth-Engine-Ansichten"
      className="-mx-1 flex flex-wrap gap-1.5 px-1"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/operations/growth"
            ? pathname === "/operations/growth"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
