import type { RoleKey } from "@/config/roles";

/**
 * Der aktuell eingeloggte Benutzer, angereichert mit Rollen aus der DB.
 * Wird ausschliesslich serverseitig ermittelt (siehe src/lib/auth.ts).
 */
export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  isActive: boolean;
  /** Alle zugewiesenen Rollen-Keys. */
  roles: RoleKey[];
  /** Wichtigste (maechtigste) Rolle - fuer Anzeige & schnelle Checks. */
  primaryRole: RoleKey;
  /**
   * true, wenn dies ein Platzhalter-Profil ist, weil Supabase (noch) nicht
   * konfiguriert ist. Nur im lokalen Entwicklungsmodus moeglich.
   */
  isPlaceholder?: boolean;
}

export type { RoleKey };
