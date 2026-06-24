import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { Badge } from "@/components/ui/badge";
import { IntegrationQuickCreate } from "@/components/ai/integration-quick-create";
import { integrationsService, webhooksService } from "@/server/services";
import type { IntegrationSafe, Webhook } from "@/types/entities";
import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_PROVIDER_LABELS,
  INTEGRATION_STATUS_LABELS,
  integrationStatusColor,
} from "@/config/catalog";
import { maskSecret } from "@/lib/crypto";
import { formatDate } from "@/lib/utils";
import { Plug, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "AI - Integrationen" };

function providerLabel(provider: string | null): string {
  if (!provider) return "-";
  return (
    INTEGRATION_PROVIDER_LABELS[
      provider as keyof typeof INTEGRATION_PROVIDER_LABELS
    ] ?? provider
  );
}

function statusLabel(status: string): string {
  return (
    INTEGRATION_STATUS_LABELS[
      status as keyof typeof INTEGRATION_STATUS_LABELS
    ] ?? status
  );
}

export default async function AiIntegrationsPage() {
  let integrations: IntegrationSafe[] = [];
  let webhooks: Webhook[] = [];
  try {
    integrations = await integrationsService.list();
  } catch {
    integrations = [];
  }
  try {
    webhooks = await webhooksService.list();
  } catch {
    webhooks = [];
  }

  // Pro Provider die (erste) vorhandene Integration zuordnen.
  const byProvider = new Map<string, IntegrationSafe>();
  for (const i of integrations) {
    if (i.provider && !byProvider.has(i.provider)) byProvider.set(i.provider, i);
  }

  return (
    <div className="space-y-5">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            Integrationen
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Verbindungen zu externen Diensten — Grundlage fuer AI-Engines und
            Automationen.
          </p>
        </div>
        <IntegrationQuickCreate />
      </div>

      {/* Sicherheits-Hinweis */}
      <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <p>
          Vorbereitete Integrationen. API-Keys werden verschluesselt
          gespeichert und nie angezeigt.
        </p>
      </div>

      {/* Provider-Karten */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATION_PROVIDERS.map((p) => {
          const existing = byProvider.get(p.key);
          return (
            <Card key={p.key}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                      <Plug className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium text-neutral-900">{p.label}</p>
                      <p className="text-xs text-neutral-400">{p.key}</p>
                    </div>
                  </div>
                  {existing ? (
                    <StatusBadge
                      label={statusLabel(existing.status)}
                      color={integrationStatusColor(existing.status)}
                    />
                  ) : (
                    <Badge tone="neutral">Nicht konfiguriert</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                  <span className="text-neutral-500">Credentials</span>
                  {existing?.has_credentials ? (
                    <span className="font-medium text-green-700">
                      ✓ hinterlegt
                    </span>
                  ) : (
                    <span className="text-neutral-400">– keine</span>
                  )}
                </div>

                <div>
                  <IntegrationQuickCreate
                    label={existing ? "Konfigurieren" : "Verbinden"}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks ({webhooks.length})</CardTitle>
          <p className="text-sm text-neutral-500">
            Eingehende Webhooks externer Dienste. Das Secret wird nie im
            Klartext angezeigt.
          </p>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <EmptyState
              title="Noch keine Webhooks"
              description="Es sind keine eingehenden Webhooks konfiguriert. Webhooks werden beim Anbinden externer Dienste angelegt."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[64rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Provider</th>
                    <th className="px-4 py-2.5 font-medium">Endpoint</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Secret</th>
                    <th className="px-4 py-2.5 font-medium">Zuletzt empfangen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {webhooks.map((w) => (
                    <tr key={w.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">
                        {w.name}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700">
                        {providerLabel(w.provider)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-neutral-600">
                          {w.endpoint_url ?? "-"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700">
                        {w.status}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-neutral-500">
                          {maskSecret(w.secret)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {w.last_received_at
                          ? formatDate(w.last_received_at)
                          : "-"}
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
