import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLES } from "@/config/roles";
import { requireRole } from "@/lib/auth";
import { SETTINGS_BASE_ROLES } from "@/config/navigation";

export const metadata: Metadata = { title: "Rollen" };

export default async function SettingsRolesPage() {
  await requireRole(SETTINGS_BASE_ROLES);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rollen</CardTitle>
        <p className="mt-1 text-sm text-neutral-500">
          Das kanonische Rollenmodell des eCreator OS (9 Rollen). Niedrigere
          Ebene = mehr Rechte.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="py-2.5 pr-4 font-medium">Rolle</th>
                <th className="py-2.5 pr-4 font-medium">Schluessel</th>
                <th className="py-2.5 pr-4 font-medium">Beschreibung</th>
                <th className="py-2.5 font-medium">Ebene</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ROLES.map((role) => (
                <tr key={role.key}>
                  <td className="py-3 pr-4 font-medium text-neutral-900">
                    {role.label}
                  </td>
                  <td className="py-3 pr-4">
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[12px] text-neutral-600">
                      {role.key}
                    </code>
                  </td>
                  <td className="py-3 pr-4 text-neutral-600">
                    {role.description}
                  </td>
                  <td className="py-3">
                    <Badge tone={role.level <= 2 ? "brand" : "neutral"}>
                      {role.level}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
