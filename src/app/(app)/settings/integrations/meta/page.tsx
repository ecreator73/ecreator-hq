import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { isMetaConfigured } from "@/config/meta";
import { metaService } from "@/server/integrations/meta/service";
import { MetaConnectionPanel } from "@/components/integrations/meta-connection-panel";

export const metadata: Metadata = { title: "Integrationen - Meta" };

export default async function MetaIntegrationPage() {
  await requireRole(["super_admin", "ceo", "cso"]);

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
      <MetaConnectionPanel
        configured={configured}
        connection={connection}
        events={events as never}
      />
    </div>
  );
}
