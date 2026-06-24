import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { roleLabel } from "@/config/roles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { SETTINGS_BASE_ROLES } from "@/config/navigation";

export const metadata: Metadata = { title: "Benutzer" };

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
  user_roles: Array<{ roles: { key: string } | null }> | null;
}

export default async function SettingsUsersPage() {
  await requireRole(SETTINGS_BASE_ROLES);
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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Benutzer</CardTitle>
          <p className="mt-1 text-sm text-neutral-500">
            Mitarbeitende der eCreator GmbH mit ihren zugewiesenen Rollen.
          </p>
        </div>
        <Badge tone="neutral">{rows.length} Konto(en)</Badge>
      </CardHeader>
      <CardContent>
        {!isSupabaseConfigured() ? (
          <EmptyState
            title="Keine Datenbank verbunden"
            description="Im Demo-Modus sind keine Benutzerdaten verfuegbar. Konfiguriere Supabase, um echte Konten zu sehen."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Keine Benutzer vorhanden"
            description={
              loadError
                ? "Die Benutzer konnten nicht geladen werden. Pruefe das Datenbank-Schema (Migration ausgefuehrt?)."
                : "Lege den ersten Super-Admin via 'npm run create-admin' an."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="py-2.5 pr-4 font-medium">Name</th>
                  <th className="py-2.5 pr-4 font-medium">E-Mail</th>
                  <th className="py-2.5 pr-4 font-medium">Rollen</th>
                  <th className="py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row) => {
                  const name = row.full_name ?? row.email ?? "Unbenannt";
                  const roleKeys = (row.user_roles ?? [])
                    .map((ur) => ur.roles?.key)
                    .filter((k): k is string => Boolean(k));
                  return (
                    <tr key={row.id}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={name} />
                          <span className="font-medium text-neutral-900">
                            {name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-neutral-600">
                        {row.email ?? "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {roleKeys.length > 0 ? (
                            roleKeys.map((key) => (
                              <Badge key={key} tone="brand">
                                {roleLabel(key)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        {row.is_active === false ? (
                          <Badge tone="red">Inaktiv</Badge>
                        ) : (
                          <Badge tone="green">Aktiv</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
