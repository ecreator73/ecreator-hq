/**
 * Zentrale Supabase-Konfiguration & Toleranz fuer "noch nicht konfiguriert".
 *
 * Damit die App auch ohne echte Supabase-Verbindung lokal startet und das
 * Layout/Navigation gerendert werden kann, fallen wir auf syntaktisch gueltige
 * Platzhalterwerte zurueck. `isSupabaseConfigured()` bleibt dann `false`, und
 * die UI zeigt einen klaren Hinweis statt zu crashen.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true, wenn echte Supabase-Zugangsdaten vorhanden sind. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Immer ein gueltiger URL-String (Platzhalter, falls nicht konfiguriert). */
export const EFFECTIVE_SUPABASE_URL = SUPABASE_URL || "http://localhost:54321";

/** Immer ein nicht-leerer Key-String (Platzhalter, falls nicht konfiguriert). */
export const EFFECTIVE_SUPABASE_ANON_KEY =
  SUPABASE_ANON_KEY || "public-anon-placeholder-key";
