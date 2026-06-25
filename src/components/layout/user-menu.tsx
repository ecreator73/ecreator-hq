"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { roleLabel } from "@/config/roles";
import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

export function UserMenu({
  fullName,
  email,
  primaryRole,
  avatarUrl,
}: {
  fullName: string;
  email: string;
  primaryRole: string;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 text-left transition-colors hover:bg-neutral-100"
      >
        <Avatar name={fullName} src={avatarUrl} />
        <span className="hidden min-w-0 flex-col sm:flex">
          <span className="truncate text-sm font-medium text-neutral-900">
            {fullName}
          </span>
          <span className="truncate text-xs text-neutral-500">
            {roleLabel(primaryRole)}
          </span>
        </span>
        <ChevronsUpDown className="hidden h-4 w-4 text-neutral-400 sm:block" />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg",
          )}
        >
          <div className="border-b border-neutral-100 p-3">
            <p className="truncate text-sm font-medium text-neutral-900">
              {fullName}
            </p>
            <p className="truncate text-xs text-neutral-500">{email}</p>
          </div>
          <div className="p-1">
            <Link
              href="/settings/users"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              <UserRound className="h-4 w-4 text-neutral-400" />
              Mein Profil
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Abmelden
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
