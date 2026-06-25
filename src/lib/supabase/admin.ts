import { createClient } from "@supabase/supabase-js";

/**
 * Service-Role-Client - NUR fuer privilegierte Admin-Operationen (Benutzer
 * anlegen, Rollen setzen). Umgeht RLS. Wird ausschliesslich in
 * super_admin-gesicherten Server Actions verwendet und NIE an den Browser
 * gegeben (kein NEXT_PUBLIC). Erfordert SUPABASE_SERVICE_ROLE_KEY in der
 * Server-Umgebung.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Benutzerverwaltung nicht konfiguriert: SUPABASE_SERVICE_ROLE_KEY fehlt in der Server-Umgebung.",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
