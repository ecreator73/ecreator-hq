"use server";

import { requireUser } from "@/lib/auth";
import { searchService } from "@/server/services";
import type { SearchGroup } from "@/server/services";

/** Globale Suche fuer die Command-Palette (Cmd/Ctrl+K). */
export async function globalSearchAction(query: string): Promise<SearchGroup[]> {
  try {
    await requireUser();
    return await searchService.global(query);
  } catch {
    return [];
  }
}
