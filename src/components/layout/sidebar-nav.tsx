"use client";

import { MAIN_NAV } from "@/config/navigation";
import { canAccess } from "@/lib/permissions";
import type { RoleKey } from "@/config/roles";
import { NavLink } from "@/components/layout/nav-link";

export function SidebarNav({
  userRoles,
  onNavigate,
}: {
  userRoles: RoleKey[];
  onNavigate?: () => void;
}) {
  const items = MAIN_NAV.filter((item) => canAccess(userRoles, item.roles));

  return (
    <nav aria-label="Hauptnavigation" className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
