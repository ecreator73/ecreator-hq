import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { productionDashboardService } from "@/server/services";
import type { WorkloadRow } from "@/types/entities";

export const metadata: Metadata = { title: "Production - Team-Auslastung" };

export default async function ProductionWorkloadPage() {
  const rows: WorkloadRow[] = await productionDashboardService
    .workload()
    .catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Production"
        title="Team-Auslastung"
        description="Offene Aufgaben, laufende Projekte und Stunden pro Teammitglied."
      />
      <Card>
        <CardHeader>
          <CardTitle>Auslastung ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-neutral-500">
            Zeiterfassung folgt (Vorbereitung).
          </p>
          {rows.length === 0 ? (
            <EmptyState
              title="Keine Auslastungsdaten"
              description="Es sind aktuell keine Teammitglieder mit Aufgaben oder Projekten vorhanden."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Mitarbeiter</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Offene Aufgaben
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Projekte
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Gesch. Stunden
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Tats. Stunden
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((r) => (
                    <tr key={r.user.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">
                        {r.user.full_name ?? "Unbekannt"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {r.openTasks}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {r.projects}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {r.estimatedHours}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {r.actualHours}
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
