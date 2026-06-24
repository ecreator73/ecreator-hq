import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { SETTINGS_BASE_ROLES } from "@/config/navigation";

export const metadata: Metadata = { title: "Integrationen" };

const PLANNED = [
  "Google Workspace / Calendar / Gmail",
  "Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads",
  "Resend / SendGrid (E-Mail-Versand)",
  "Calendly (Terminbuchung)",
  "OpenAI / Claude API (AI-Engines)",
  "Supabase Storage (Dateien)",
];

export default async function SettingsIntegrationsPage() {
  await requireRole(SETTINGS_BASE_ROLES);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrationen</CardTitle>
        <p className="mt-1 text-sm text-neutral-500">
          Verbundene Drittsysteme. Werden in spaeteren Phasen schrittweise
          aktiviert - die Struktur ist vorbereitet.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {PLANNED.map((item) => (
            <li
              key={item}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-700"
            >
              <span>{item}</span>
              <Badge tone="amber">Geplant</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
