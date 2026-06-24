"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Uebersicht", href: "/settings/ai" },
  { label: "Prompts", href: "/settings/ai/prompts" },
  { label: "Jobs", href: "/settings/ai/jobs" },
  { label: "AI Runs", href: "/settings/ai/runs" },
  { label: "Integrationen", href: "/settings/ai/integrations" },
  { label: "Logs", href: "/settings/ai/logs" },
];

export function AiNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="AI-Ansichten"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/settings/ai"
            ? pathname === "/settings/ai"
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
