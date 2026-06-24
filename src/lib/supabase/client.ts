import { createBrowserClient } from "@supabase/ssr";
import {
  EFFECTIVE_SUPABASE_URL,
  EFFECTIVE_SUPABASE_ANON_KEY,
} from "@/lib/supabase/config";

/**
 * Supabase-Client fuer Client-Komponenten (Browser).
 * Nutzt ausschliesslich den oeffentlichen anon Key - RLS schuetzt die Daten.
 */
export function createClient() {
  return createBrowserClient(
    EFFECTIVE_SUPABASE_URL,
    EFFECTIVE_SUPABASE_ANON_KEY,
  );
}
