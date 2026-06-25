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
  user_roles: Array<{ roles: { key: string } | null }> | null;
}

export default async function SettingsUsersPage() {
  const user = await requireRole(SETTINGS_BASE_ROLES);
  const canManage = user.roles.includes("super_admin");

  let rows: ProfileRow[] = [];
  let loadError = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, is_active, user_roles(roles(key))")
      .order("full_name", { ascending: true });
    if (error) loadError = true;
    rows = (data as unknown as ProfileRow[] | null) ?? [];
  }

  const users: ManagedUser[] = rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    is_active: row.is_active !== false,
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
        ) : users.length === 0 ? (
          <EmptyState
            title="Keine Benutzer vorhanden"
            description={
              loadError
                ? "Die Benutzer konnten nicht geladen werden. Prüfe das Datenbank-Schema."
                : "Lege den ersten Benutzer an."
            }
          />
        ) : (
          <UsersManager users={users} canManage={canManage} currentUserId={user.id} />
        )}
      </CardContent>
    </Card>
  );
}
