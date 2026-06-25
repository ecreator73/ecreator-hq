import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { SETTINGS_BASE_ROLES } from "@/config/navigation";
import { UsersManager, type ManagedUser } from "@/components/settings/users-manager";

export const metadata: Metadata = { title: "Benutzer" };

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
  avatar_url: string | null;
  user_roles: Array<{ roles: { key: string } | null }> | null;
}

export default async function SettingsUsersPage() {
  const user = await requireRole(SETTINGS_BASE_ROLES);
  const canManage = user.roles.includes("super_admin");

  let rows: ProfileRow[] = [];
  let loadError = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    // user_roles hat ZWEI FKs auf profiles (user_id + assigned_by) -> der
    // Embed muss den FK explizit nennen, sonst PGRST201 (mehrdeutige Relation).
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, is_active, avatar_url, user_roles!user_roles_user_id_fkey(roles(key))",
      )
      .order("full_name", { ascending: true });
    if (error) loadError = true;
    rows = (data as unknown as ProfileRow[] | null) ?? [];
  }

  const users: ManagedUser[] = rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    is_active: row.is_active !== false,
    avatar_url: row.avatar_url,
    roleKeys: (row.user_roles ?? [])
      .map((ur) => ur.roles?.key)
      .filter((k): k is string => Boolean(k)),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benutzer & Rollen</CardTitle>
        <p className="mt-1 text-sm text-neutral-500">
          {canManage
            ? "Mitarbeitende anlegen, Rollen zuweisen und Zugänge aktivieren oder sperren."
            : "Mitarbeitende der eCreator GmbH mit ihren zugewiesenen Rollen."}
        </p>
      </CardHeader>
      <CardContent>
        {!isSupabaseConfigured() ? (
          <EmptyState
            title="Keine Datenbank verbunden"
            description="Im Demo-Modus sind keine Benutzerdaten verfügbar."
          />
        ) : loadError ? (
          <EmptyState
            title="Benutzer konnten nicht geladen werden"
            description="Die Benutzerliste konnte nicht aus der Datenbank gelesen werden. Bitte später erneut versuchen."
          />
        ) : (
          // Auch bei leerer Liste rendern -> der Manager zeigt super_admins den
          // "Benutzer anlegen"-Button (sonst liesse sich kein erster Nutzer anlegen).
          <UsersManager users={users} canManage={canManage} currentUserId={user.id} />
        )}
      </CardContent>
    </Card>
  );
}
