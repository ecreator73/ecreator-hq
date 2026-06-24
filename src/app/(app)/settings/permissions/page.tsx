import type { Metadata } from "next";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
} from "@/config/permissions";
import { requireRole } from "@/lib/auth";
import { SETTINGS_BASE_ROLES } from "@/config/navigation";

export const metadata: Metadata = { title: "Rechte" };

export default async function SettingsPermissionsPage() {
  await requireRole(SETTINGS_BASE_ROLES);
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Grundstruktur der Rechteverwaltung. Berechtigungen folgen dem Schema{" "}
          <code className="rounded bg-white/70 px-1 py-0.5 text-[12px]">
            modul.aktion
          </code>{" "}
          und werden Rollen zugeordnet. Die Zuweisung pro Rolle wird in einer
          spaeteren Phase hier bearbeitbar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Berechtigungs-Katalog</CardTitle>
          <p className="mt-1 text-sm text-neutral-500">
            {PERMISSION_MODULES.length} Module ·{" "}
            {PERMISSION_ACTIONS.length} Aktionen ={" "}
            {PERMISSION_MODULES.length * PERMISSION_ACTIONS.length} Rechte
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {PERMISSION_MODULES.map((mod) => (
            <div
              key={mod.key}
              className="flex flex-col gap-2 border-b border-neutral-100 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">
                  {mod.label}
                </span>
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">
                  {mod.key}
                </code>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PERMISSION_ACTIONS.map((act) => (
                  <Badge key={act.key} tone="neutral">
                    {act.label}
                    <span className="ml-1 text-neutral-400">
                      {mod.key}.{act.key}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
