import type { RoleKey } from "@/config/roles";

/**
 * Reine, isomorphe Zugriffslogik (nutzbar auf Server UND Client).
 *
 * Phase 1: einfache rollenbasierte Sichtbarkeit. Die granulare
 * Permission-Pruefung (permissions / role_permissions) wird in spaeteren
 * Phasen ergaenzt - die Struktur dafuer liegt bereits in der Datenbank.
 *
 * WICHTIG: Echte Autorisierung passiert immer serverseitig + via Supabase RLS.
 * Diese Funktion steuert nur die UI-Sichtbarkeit.
 */
export function canAccess(
  userRoles: RoleKey[],
  required?: RoleKey[],
): boolean {
  if (!required || required.length === 0) return true;
  // Super Admin sieht und darf alles.
  if (userRoles.includes("super_admin")) return true;
  return userRoles.some((role) => required.includes(role));
}
