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
import { SourceQuickCreate } from "@/components/lead-engine/source-quick-create";
import {
  leadSourcesService,
  leadDiscoveryRunsService,
} from "@/server/services";
import type { LeadSourceRow, LeadDiscoveryRun } from "@/types/entities";
import { LEAD_DISCOVERY_SOURCE_TYPE_LABELS } from "@/config/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Lead Engine - Quellen" };

/** Label fuer den Quellen-Typ (faellt auf den Rohwert zurueck). */
function sourceTypeLabel(type: string | null): string {
  if (!type) return "-";
  return (
    LEAD_DISCOVERY_SOURCE_TYPE_LABELS[
      type as keyof typeof LEAD_DISCOVERY_SOURCE_TYPE_LABELS
    ] ?? type
  );
}

/** Ampelfarbe fuer den Status eines Discovery-Laufs. */
function runStatusColor(
  status: string,
): "gray" | "blue" | "green" | "amber" | "red" {
  switch (status) {
    case "done":
    case "finished":
    case "completed":
    case "success":
      return "green";
    case "running":
    case "in_progress":
      return "blue";
    case "queued":
    case "pending":
      return "amber";
    case "failed":
    case "error":
      return "red";
    default:
      return "gray";
  }
}

/** Kurzauszug der Logs fuer die Tabellenzelle. */
function logsExcerpt(logs: string | null): string {
  if (!logs) return "-";
  const flat = logs.replace(/\s+/g, " ").trim();
  if (!flat) return "-";
  return flat.length > 80 ? `${flat.slice(0, 80)}...` : flat;
}

export default async function LeadEngineSourcesPage() {
  // Demo-Modus: Services werfen -> leere Zustaende via EmptyState.
  const sources: LeadSourceRow[] = await leadSourcesService
    .list()
    .catch(() => []);
  const runs: LeadDiscoveryRun[] = await leadDiscoveryRunsService
    .recent(30)
    .catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Quellen und Discovery-Laeufe der Lead Engine verwalten.
        </p>
        <SourceQuickCreate />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quellen ({sources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <EmptyState
              title="Noch keine Quellen"
              description="Lege eine Quelle an, um Leads aus Importen oder kuenftigen Discovery-Laeufen zu buendeln."
              action={<SourceQuickCreate variant="secondary" />}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Typ</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Erstellt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {sources.map((s) => (
                    <tr key={s.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">
                        {s.name}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700">
                        {sourceTypeLabel(s.source_type)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          tone={s.status === "active" ? "green" : "neutral"}
                        >
                          {s.status === "active" ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {formatDate(s.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discovery-Laeufe ({runs.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            Discovery-Architektur vorbereitet — automatische Suche folgt als
            AI-Engine.
          </p>
          {runs.length === 0 ? (
            <EmptyState
              title="Noch keine Laeufe"
              description="Sobald die Discovery-Engine aktiv ist, erscheinen hier die einzelnen Laeufe mit Ergebnissen und Logs."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Quelle</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Gefunden
                    </th>
                    <th className="px-4 py-2.5 font-medium">Gestartet</th>
                    <th className="px-4 py-2.5 font-medium">Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {runs.map((r) => (
                    <tr key={r.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-2.5 text-neutral-700">
                        {r.source?.name ?? "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          label={r.status}
                          color={runStatusColor(r.status)}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {r.leads_found}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {r.started_at ? formatDate(r.started_at) : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-500">
                        {logsExcerpt(r.logs)}
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
