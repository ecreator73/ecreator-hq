"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { MAIN_NAV } from "@/config/navigation";
import type { NavItem, NavChild } from "@/config/navigation";
import { canAccess } from "@/lib/permissions";
import type { RoleKey } from "@/config/roles";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  userRoles,
  onNavigate,
}: {
  userRoles: RoleKey[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [manualOpen, setManualOpen] = useState<Set<string>>(new Set());

  const groups = MAIN_NAV.filter((g) => canAccess(userRoles, g.roles)).map(
    (g) => ({
      ...g,
      children: (g.children ?? []).filter((c) => canAccess(userRoles, c.roles)),
    }),
  );

  // Aktiver Eintrag = laengster passender Pfad (verhindert dass Dashboard-
  // Eintraege wie "/sales" auf allen Unterseiten mit-leuchten).
  const candidates: string[] = [];
  for (const g of groups) {
    candidates.push(g.href);
    for (const c of g.children) candidates.push(c.href);
  }
  let bestHref = "";
  for (const href of candidates) {
    if (isActive(pathname, href) && href.length > bestHref.length) bestHref = href;
  }

  function toggle(href: string) {
    setManualOpen((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  }

  return (
    <nav aria-label="Hauptnavigation" className="flex flex-col gap-0.5">
      {groups.map((group) => {
        const Icon = group.icon;
        const containsActive =
          group.href === bestHref ||
          group.children.some((c) => c.href === bestHref);
        const open = containsActive || manualOpen.has(group.href);
        const headerActive = group.href === bestHref;
        const hasChildren = group.children.length > 0;

        return (
          <div key={group.href}>
            <div
              className={cn(
                "group flex items-center rounded-lg pr-1 transition-colors",
                headerActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-neutral-700 hover:bg-neutral-100",
              )}
            >
              <Link
                href={group.href}
                onClick={onNavigate}
                aria-current={headerActive ? "page" : undefined}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-sm font-medium"
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    headerActive
                      ? "text-brand-600"
                      : "text-neutral-400 group-hover:text-neutral-600",
                  )}
                />
                <span className="truncate">{group.label}</span>
              </Link>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggle(group.href)}
                  aria-label={`${group.label} ${open ? "einklappen" : "ausklappen"}`}
                  aria-expanded={open}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      open ? "rotate-180" : "",
                    )}
                  />
                </button>
              ) : null}
            </div>

            {hasChildren && open ? (
              <ul className="mb-1 ml-[1.6rem] mt-0.5 flex flex-col gap-0.5 border-l border-neutral-200 pl-2">
                {group.children.map((child: NavChild) => {
                  const childActive = child.href === bestHref;
                  return (
                    <li key={`${group.href}::${child.href}`}>
                      <Link
                        href={child.href}
                        onClick={onNavigate}
                        aria-current={childActive ? "page" : undefined}
                        className={cn(
                          "block rounded-md px-3 py-1.5 text-sm transition-colors",
                          childActive
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
                        )}
                      >
                        {child.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export type { NavItem };
