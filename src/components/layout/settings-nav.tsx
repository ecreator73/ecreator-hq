"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_NAV } from "@/config/navigation";
import { canAccess } from "@/lib/permissions";
import type { RoleKey } from "@/config/roles";
import { cn } from "@/lib/utils";

export function SettingsNav({ roles }: { roles: RoleKey[] }) {
  const pathname = usePathname();
  const items = SETTINGS_NAV.filter((item) => canAccess(roles, item.roles));

  return (
    <nav
      aria-label="Einstellungen"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px"
    >
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
