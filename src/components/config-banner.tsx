import { AlertTriangle } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Sichtbarer Hinweis, wenn Supabase (noch) nicht konfiguriert ist.
 * Erscheint nur im lokalen Demo-Modus - die App laeuft dann ohne echte Auth.
 */
export function ConfigBanner() {
  if (isSupabaseConfigured()) return null;

  return (
    <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 sm:px-6">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <span className="font-semibold">Demo-Modus:</span> Supabase ist nicht
        konfiguriert. Auth und Datenbank sind deaktiviert - lege{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5 text-[12px]">
          .env.local
        </code>{" "}
        an, um Login und echte Daten zu aktivieren.
      </p>
    </div>
  );
}
