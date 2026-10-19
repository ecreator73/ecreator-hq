"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { COMPARE_OPTIONS, RANGE_PRESETS } from "@/lib/marketing/range";
import { cn } from "@/lib/utils";

/** Kompakter Zeitraum- und Vergleichsfilter (eine Zeile, URL-basiert). */
export function RangeFilter({ from, to, showCompare = true }: { from: string; to: string; showCompare?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const range = params.get("range") ?? "30d";
  const compare = params.get("compare") ?? "prev";
  const [cFrom, setFrom] = useState(from);
  const [cTo, setTo] = useState(to);

  const push = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) q.delete(k);
      else q.set(k, v);
    }
    start(() => router.push(`${pathname}?${q.toString()}`));
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-60")}>
      <div className="flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white p-0.5">
        {RANGE_PRESETS.filter((p) => p.key !== "custom").map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => push({ range: p.key, from: null, to: null })}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              range === p.key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-1 text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          if (cFrom && cTo) push({ range: "custom", from: cFrom, to: cTo });
        }}
      >
        <label className="sr-only" htmlFor="mi-from">Von</label>
        <input id="mi-from" type="date" value={cFrom} onChange={(e) => setFrom(e.target.value)} className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-xs" />
        <span className="text-neutral-400">–</span>
        <label className="sr-only" htmlFor="mi-to">Bis</label>
        <input id="mi-to" type="date" value={cTo} onChange={(e) => setTo(e.target.value)} className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-xs" />
        <button
          type="submit"
          className={cn("h-7 rounded-md border px-2 font-medium", range === "custom" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50")}
        >
          Anwenden
        </button>
      </form>
      {showCompare ? (
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          Vergleich
          <select
            value={compare}
            onChange={(e) => push({ compare: e.target.value === "prev" ? null : e.target.value })}
            className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-xs text-neutral-800"
          >
            {COMPARE_OPTIONS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
