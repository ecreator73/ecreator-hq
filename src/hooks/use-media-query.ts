"use client";

import { useEffect, useState } from "react";

/**
 * Reagiert auf eine CSS Media Query (z.B. "(min-width: 1024px)").
 * SSR-sicher: liefert vor dem Mount `false`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
