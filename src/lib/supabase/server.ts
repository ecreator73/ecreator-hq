import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  EFFECTIVE_SUPABASE_URL,
  EFFECTIVE_SUPABASE_ANON_KEY,
} from "@/lib/supabase/config";

/**
 * Supabase-Client fuer Server-Komponenten, Server Actions und Route Handler.
 * Liest/schreibt die Auth-Cookies ueber die Next.js cookies()-API.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    EFFECTIVE_SUPABASE_URL,
    EFFECTIVE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll kann in reinen Server-Komponenten (read-only) aufgerufen
            // werden. Die Session wird dann in der Middleware aktualisiert -
            // daher hier bewusst ignorieren.
          }
        },
      },
    },
  );
}
