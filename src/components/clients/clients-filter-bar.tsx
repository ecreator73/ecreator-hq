"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { CLIENT_STATUSES } from "@/config/catalog";
import { cn } from "@/lib/utils";

const controlClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/**
 * Kleine Client-Filterleiste fuer die Kundenliste. Schreibt Status + Suche in
 * die URL-searchParams; die Server-Page liest sie aus und filtert die Daten.
 */
export function ClientsFilterBar({
  initialStatus = "",
  initialSearch = "",
}: {
  initialStatus?: string;
  initialSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [pending, startTransition] = useTransition();

  function apply(next: { status?: string; search?: string }) {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const q = next.search ?? search;
    if (s) params.set("status", s);
    if (q.trim()) params.set("search", q.trim());
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function reset() {
    setStatus("");
    setSearch("");
    startTransition(() => {
      router.push(pathname);
    });
  }

  const hasFilters = status !== "" || search.trim() !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply({});
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <label className="sr-only" htmlFor="client-status-filter">
        Status filtern
      </label>
      <select
        id="client-status-filter"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          apply({ status: e.target.value });
        }}
        className={cn(controlClass, "font-medium")}
      >
        <option value="">Alle Status</option>
        {CLIENT_STATUSES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
        />
        <label className="sr-only" htmlFor="client-search">
          Kunden suchen
        </label>
        <input
          id="client-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Firma, E-Mail, Telefon ..."
          className={cn(controlClass, "w-60 pl-8")}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        Suchen
      </button>

      {hasFilters ? (
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50"
        >
          <X className="h-4 w-4" />
          Zuruecksetzen
        </button>
      ) : null}
    </form>
  );
}
