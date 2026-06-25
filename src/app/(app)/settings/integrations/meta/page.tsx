import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { isMetaConfigured } from "@/config/meta";
import { metaService } from "@/server/integrations/meta/service";
import { MetaConnectionPanel } from "@/components/integrations/meta-connection-panel";

export const metadata: Metadata = { title: "Integrationen - Meta" };

export default async function MetaIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  await requireRole(["super_admin", "ceo", "cso"]);
  const sp = await searchParams;

  const notice = sp.connected
    ? { tone: "ok" as const, text: "Facebook erfolgreich verbunden." }
    : sp.error
      ? { tone: "err" as const, text: `Verbindung fehlgeschlagen: ${decodeURIComponent(sp.error)}` }
      : null;

  const configured = isMetaConfigured();
  let connection = null;
  let events: Awaited<ReturnType<typeof metaService.recentEvents>> = [];
  if (configured) {
    try {
      connection = await metaService.connection();
      events = await metaService.recentEvents(20);
    } catch {
      connection = null;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings · Integrationen"
        title="Meta (Facebook Lead Ads)"
        description="Neue Facebook Lead Ads erscheinen über Webhook in Echtzeit als Leads im CRM - ohne Drittanbieter."
      />
      {notice ? (
        <p
          className={
            notice.tone === "ok"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          {notice.text}
        </p>
      ) : null}
      <MetaConnectionPanel
        configured={configured}
        connection={connection}
        events={events as never}
      />
    </div>
  );
}
