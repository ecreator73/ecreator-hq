"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { canAccess } from "@/lib/permissions";
import type { RoleKey } from "@/config/roles";

const TABS: { label: string; href: string; roles?: RoleKey[] }[] = [
  { label: "Uebersicht", href: "/operations" },
  { label: "Wissen", href: "/operations/knowledge" },
  { label: "Meetings", href: "/operations/meetings" },
  { label: "SOPs", href: "/operations/sops" },
  { label: "Prompts", href: "/operations/prompts" },
  {
    label: "Growth Engine",
    href: "/operations/growth",
    roles: ["super_admin", "ceo", "cso"],
  },
];

export function OperationsNav({ userRoles = [] }: { userRoles?: RoleKey[] }) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => canAccess(userRoles, tab.roles));
  return (
    <nav
      aria-label="Operations-Ansichten"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px"
    >
      {tabs.map((tab) => {
        const active =
          tab.href === "/operations"
            ? pathname === "/operations"
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
