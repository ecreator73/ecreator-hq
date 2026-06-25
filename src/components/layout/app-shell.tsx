"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { RoleKey } from "@/config/roles";
import { Brand } from "@/components/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { QuickCreate } from "@/components/tasks/quick-create";
import { CommandTrigger } from "@/components/command/command-trigger";
import { GlobalActions } from "@/components/command/global-actions";
import { siteConfig } from "@/config/site";

interface ShellUser {
  fullName: string;
  email: string;
  roles: RoleKey[];
  primaryRole: RoleKey;
  avatarUrl?: string | null;
}

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Drawer bei Navigation schliessen.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Body-Scroll sperren, solange der Drawer offen ist.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        {/* Desktop-Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex">
          <div className="flex h-16 items-center border-b border-neutral-200 px-4">
            <Brand />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <SidebarNav userRoles={user.roles} />
          </div>
          <div className="border-t border-neutral-200 p-4 text-[11px] text-neutral-400">
            {siteConfig.company} · Phase {siteConfig.phase}
          </div>
        </aside>

        {/* Mobile-Drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Menue schliessen"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-neutral-900/40"
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
              <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
                <Brand />
                <button
                  type="button"
                  aria-label="Menue schliessen"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <SidebarNav
                  userRoles={user.roles}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Hauptspalte */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Menue oeffnen"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="lg:hidden">
                <Brand collapsed />
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <CommandTrigger />
              <QuickCreate />
              <UserMenu
                fullName={user.fullName}
                email={user.email}
                primaryRole={user.primaryRole}
                avatarUrl={user.avatarUrl}
              />
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Globale Command-Palette (Cmd/Ctrl+K) + Tastatur-Schnellaktionen */}
      <GlobalActions />
    </div>
  );
}
