"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/** Kompakter Dimensionsfilter (setzt einen URL-Parameter, Zeitraum bleibt). */
export function FilterSelect({ name, label, options }: { name: string; label: string; options: Array<{ value: string; label: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <label className={`flex items-center gap-1.5 text-xs text-neutral-500 ${pending ? "opacity-60" : ""}`}>
      {label}
      <select
        value={params.get(name) ?? ""}
        onChange={(e) => {
          const q = new URLSearchParams(params.toString());
          if (e.target.value) q.set(name, e.target.value);
          else q.delete(name);
          start(() => router.push(`${pathname}?${q.toString()}`));
        }}
        className="h-7 max-w-[200px] rounded-md border border-neutral-200 bg-white px-1.5 text-xs text-neutral-800"
      >
        <option value="">Alle</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
