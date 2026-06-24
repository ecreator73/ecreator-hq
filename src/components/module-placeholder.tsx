import * as React from "react";
import { Hammer, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Einheitlicher, strukturierter Platzhalter fuer Module, die erst in spaeteren
 * Phasen gebaut werden. Erklaert Zweck + geplante Inhalte - bewusst OHNE
 * sinnlose Mockdaten.
 */
export function ModulePlaceholder({
  title,
  description,
  eyebrow,
  purpose,
  upcoming,
  phase,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  /** Wofuer dieser Bereich da ist. */
  purpose: string;
  /** Was hier in spaeteren Phasen entsteht. */
  upcoming: string[];
  /** In welcher Phase das Modul ausgebaut wird. */
  phase?: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} eyebrow={eyebrow} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600" />
              Zweck dieses Bereichs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-neutral-600">
              {purpose}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hammer className="h-4 w-4 text-neutral-400" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge tone="amber">In Vorbereitung</Badge>
            <p className="text-sm text-neutral-500">
              {phase
                ? `Dieses Modul wird in Phase ${phase} ausgebaut.`
                : "Dieses Modul wird in einer spaeteren Phase ausgebaut."}{" "}
              Aktuell ist nur die Struktur angelegt.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Was hier spaeter entsteht</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {upcoming.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-neutral-600"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400"
                />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
