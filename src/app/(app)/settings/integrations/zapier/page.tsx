import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { SETTINGS_BASE_ROLES } from "@/config/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { CopyField } from "@/components/integrations/copy-field";

export const metadata: Metadata = { title: "Zapier - Leads empfangen" };
export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  received_at: string;
  external_id: string | null;
  status: string;
  error: string | null;
}

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "neutral"> = {
  processed: "green",
  duplicate: "amber",
  skipped: "amber",
  error: "red",
  received: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  processed: "Lead angelegt",
  duplicate: "Dublette (aktualisiert)",
  skipped: "Uebersprungen",
  error: "Fehler",
  received: "Empfangen",
};

export default async function ZapierIntegrationPage() {
  await requireRole(SETTINGS_BASE_ROLES);

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://crm.ecreator.ch";
  const configured = Boolean(process.env.ZAPIER_WEBHOOK_SECRET);
  const url = `${base}/api/webhooks/zapier/leads`;

  let events: EventRow[] = [];
  try {
    const { data } = await createAdminClient()
      .from("ad_lead_events")
      .select("id, received_at, external_id, status, error")
      .eq("provider", "zapier")
      .order("received_at", { ascending: false })
      .limit(20);
    events = (data ?? []) as EventRow[];
  } catch {
    events = [];
  }

  return (
    <div className="space-y-6">
      <Link
        href="/settings/integrations"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" /> Zurueck zu Integrationen
      </Link>

      <PageHeader
        title="Zapier - Leads empfangen"
        description="Leads aus Facebook/Meta Lead Ads (oder jeder anderen Quelle) ueber Zapier direkt ins CRM."
        actions={
          configured ? (
            <Badge tone="green">Bereit</Badge>
          ) : (
            <Badge tone="amber">Token fehlt</Badge>
          )
        }
      />

      {!configured ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            Es fehlt noch die Server-Variable <code>ZAPIER_WEBHOOK_SECRET</code> in
            Vercel (Production). Danach ist der Empfang sofort aktiv.
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Deine Webhook-Adresse</CardTitle>
          <p className="mt-1 text-sm text-neutral-500">
            In Zapier als Aktion <strong>Webhooks by Zapier → POST</strong> einrichten.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="URL (POST)" value={url} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CopyField label="Header-Name" value="X-Webhook-Token" />
            <CopyField
              label="Header-Wert"
              value="<dein ZAPIER_WEBHOOK_SECRET>"
              masked
            />
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
            <p className="font-medium text-neutral-800">Einstellungen in Zapier</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li>
                <strong>Payload Type:</strong> JSON
              </li>
              <li>
                <strong>Data:</strong> Felder aus dem Lead-Ads-Trigger zuordnen -
                z.B. <code>full_name</code>, <code>email</code>,{" "}
                <code>phone_number</code>, <code>company_name</code>,{" "}
                <code>campaign_name</code>, <code>form_name</code>,{" "}
                <code>lead_id</code>. Feldnamen sind flexibel (auch
                &quot;Full Name&quot; oder &quot;E-Mail&quot; werden erkannt), alles
                Weitere wird beim Lead gespeichert.
              </li>
              <li>
                <strong>Wrap Request In Array:</strong> no
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zuletzt empfangen (20)</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <EmptyState
              title="Noch nichts empfangen"
              description="Sobald der erste Zap laeuft, erscheinen hier alle eingehenden Leads mit Ergebnis."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-3 py-2 font-medium">Zeit</th>
                    <th className="px-3 py-2 font-medium">Kennung</th>
                    <th className="px-3 py-2 font-medium">Ergebnis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-neutral-600">
                        {formatDate(e.received_at)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-neutral-500">
                        {e.external_id ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={STATUS_TONE[e.status] ?? "neutral"}>
                          {STATUS_LABEL[e.status] ?? e.status}
                        </Badge>
                        {e.error ? (
                          <span className="ml-2 text-xs text-red-600">{e.error}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
