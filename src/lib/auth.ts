import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ROLE_BY_KEY, type RoleKey } from "@/config/roles";
import { canAccess } from "@/lib/permissions";
import type { AppUser } from "@/types";

/**
 * Auth-Helfer - ausschliesslich serverseitig verwenden
 * (Server Components, Server Actions, Route Handler).
 */

function pickPrimaryRole(roles: RoleKey[]): RoleKey {
  if (roles.length === 0) return "viewer";
  return [...roles].sort(
    (a, b) => (ROLE_BY_KEY[a]?.level ?? 99) - (ROLE_BY_KEY[b]?.level ?? 99),
  )[0]!;
}

/**
 * Liefert den echten eingeloggten Benutzer inkl. Rollen aus der DB,
 * oder null, wenn nicht eingeloggt / nicht konfiguriert.
 * `cache` dedupliziert mehrfache Aufrufe innerhalb desselben Requests.
 */
export const getSessionUser = cache(async (): Promise<AppUser | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, is_active")
    .eq("id", user.id)
    .maybeSingle();

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role:roles(key)")
    .eq("user_id", user.id);

  const roles = (
    (roleRows ?? []) as unknown as Array<{ role: { key: string } | null }>
  )
    .map((row) => row.role?.key)
    .filter((key): key is RoleKey => Boolean(key));

  const fullName =
    profile?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    "Benutzer";

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? "",
    fullName,
    avatarUrl: profile?.avatar_url ?? null,
    isActive: profile?.is_active ?? true,
    roles,
    primaryRole: pickPrimaryRole(roles),
  };
});

/**
 * Nur im lokalen Dev-Modus (und nur solange Supabase NICHT konfiguriert ist):
 * ein Platzhalter-Benutzer, damit Layout/Navigation begehbar bleiben.
 */
const DEV_PLACEHOLDER_USER: AppUser = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "demo@ecreator.local",
  fullName: "Gast (Demo-Modus)",
  avatarUrl: null,
  isActive: true,
  roles: ["super_admin"],
  primaryRole: "super_admin",
  isPlaceholder: true,
};

/**
 * Der "Betrachter" der aktuellen Seite: echter Benutzer, sonst (nur lokal,
 * unkonfiguriert) der Platzhalter, sonst null.
 */
export async function getViewer(): Promise<AppUser | null> {
  const user = await getSessionUser();
  if (user) return user;
  if (!isSupabaseConfigured() && process.env.NODE_ENV !== "production") {
    return DEV_PLACEHOLDER_USER;
  }
  return null;
}

/** Erzwingt einen eingeloggten Benutzer; sonst Redirect auf /login. */
export async function requireUser(): Promise<AppUser> {
  const user = await getViewer();
  if (!user) redirect("/login");
  return user;
}

/**
 * Erzwingt eine der angegebenen Rollen; sonst Redirect (Default: Home).
 * Serverseitige Absicherung sensibler Bereiche (z.B. Settings, Finance).
 */
export async function requireRole(
  roles: RoleKey[],
  redirectTo = "/",
): Promise<AppUser> {
  const user = await requireUser();
  if (!canAccess(user.roles, roles)) redirect(redirectTo);
  return user;
}

export { canAccess };
