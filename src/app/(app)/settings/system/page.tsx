import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireRole } from "@/lib/auth";
import { SETTINGS_BASE_ROLES } from "@/config/navigation";

export const metadata: Metadata = { title: "System" };

export default async function SettingsSystemPage() {
  await requireRole(SETTINGS_BASE_ROLES);
  const configured = isSupabaseConfigured();
  const env = process.env.NODE_ENV ?? "unbekannt";

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Anwendung", value: siteConfig.name },
    { label: "Organisation", value: siteConfig.company },
    { label: "Ausbaustufe", value: `Phase ${siteConfig.phase} (Foundation)` },
    { label: "Umgebung", value: env },
    {
      label: "Datenbank (Supabase)",
      value: configured ? (
        <Badge tone="green">Verbunden</Badge>
      ) : (
        <Badge tone="amber">Nicht konfiguriert (Demo-Modus)</Badge>
      ),
    },
    { label: "Sprache", value: "Deutsch (de-CH)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>System</CardTitle>
        <p className="mt-1 text-sm text-neutral-500">
          Technischer Status und Umgebungsinformationen der Plattform.
        </p>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-3 text-sm"
            >
              <dt className="text-neutral-500">{row.label}</dt>
              <dd className="font-medium text-neutral-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
