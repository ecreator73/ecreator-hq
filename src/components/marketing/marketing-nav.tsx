"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MARKETING_NAV } from "@/config/marketing-nav";
import { cn } from "@/lib/utils";

/** Zweistufige Navigation: Gruppen oben, Seiten der aktiven Gruppe darunter. Zeitraum bleibt erhalten. */
export function MarketingNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const keep = new URLSearchParams();
  for (const k of ["range", "from", "to", "compare"]) {
    const v = params.get(k);
    if (v) keep.set(k, v);
  }
  const qs = keep.toString() ? `?${keep.toString()}` : "";

  const isActive = (href: string) => (href === "/marketing" ? pathname === "/marketing" : pathname === href || pathname.startsWith(`${href}/`));
  const activeGroup = MARKETING_NAV.find((g) => g.items.some((i) => isActive(i.href))) ?? MARKETING_NAV[0]!;

  return (
    <nav aria-label="Marketing-Bereiche" className="space-y-2">
      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px">
        {MARKETING_NAV.map((g) => {
          const active = g === activeGroup;
          return (
            <Link
              key={g.label}
              href={`${g.items[0]!.href}${qs}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-800",
              )}
            >
              {g.label}
            </Link>
          );
        })}
      </div>
      <div className="-mx-1 flex gap-1 overflow-x-auto">
        {activeGroup.items.map((i) => {
          const active = isActive(i.href);
          return (
            <Link
              key={i.href}
              href={`${i.href}${qs}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
              )}
            >
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
