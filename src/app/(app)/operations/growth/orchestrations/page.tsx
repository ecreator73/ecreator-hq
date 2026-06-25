import type { Metadata } from "next";
import { Workflow } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { OrchestrationManager } from "@/components/growth-engine/orchestration-manager";
import { orchestrationsService } from "@/server/services";

export const metadata: Metadata = { title: "Growth - Orchestrierung" };

export default async function GrowthOrchestrationsPage() {
  const items = await orchestrationsService.list().catch(() => []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-brand-600" />
            Orchestrierung
          </CardTitle>
          <CardDescription>
            Regeln verknuepfen einen Trigger mit einer Aktion. Sie erzeugen
            ausschliesslich Vorschlaege - also Empfehlungen, Aufgaben oder
            Alerts. Eine Regel versendet NIE ungefragt E-Mails, Verträge oder
            Rechnungen. Der Mensch bleibt jederzeit der Entscheider und gibt
            jede Aktion bewusst frei.
          </CardDescription>
        </CardHeader>
        {items.length === 0 ? (
          <CardContent>
            <p className="text-sm text-neutral-500">
              Es existieren noch keine Orchestrierungs-Regeln. Lege ueber
              &laquo;Neue Regel&raquo; die erste Trigger-zu-Aktion-Regel an.
            </p>
          </CardContent>
        ) : null}
      </Card>

      <OrchestrationManager items={items} />
    </div>
  );
}
