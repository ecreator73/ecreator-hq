import type { Metadata } from "next";
import { Database, ShieldCheck, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssistantPanel } from "@/components/growth-engine/assistant-panel";

export const metadata: Metadata = { title: "Growth - Assistant" };

export default function GrowthAssistantPage() {
  // Rollen-Guard, Kopfzeile und Sub-Navigation liefert das Layout. Hier nur Inhalt.
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            AI Assistant
          </CardTitle>
          <CardDescription>
            Fragen, datenbasiert beantwortet - keine erfundenen Antworten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssistantPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>So funktioniert es</CardTitle>
          <CardDescription>
            Jede Antwort wird live aus dem echten Datenbestand berechnet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-neutral-600">
            <li className="flex items-start gap-3">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>
                Die Antworten stammen direkt aus deinen echten Daten - Leads,
                Kunden, Vertraege und Projekte - nicht aus einem generischen
                Sprachmodell.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>
                Keine erfundenen Zahlen: Gibt es zu einer Frage keine Daten,
                sagt der Assistant das ehrlich, statt etwas zu raten.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>
                Waehle eine der vorgeschlagenen Fragen oder formuliere deine
                eigene - die Antwort verweist auf die konkreten Datensaetze.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
