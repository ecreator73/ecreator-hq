import { AlertTriangle, BarChart3, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/finance/kpi-card";
import { growthEngineService } from "@/server/services";

export const metadata = { title: "Growth - Wochenreport" };

export default async function GrowthReportPage() {
  const r = await growthEngineService.weeklyReport().catch(() => null);

  if (!r) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 sm:pt-6">
            <EmptyState
              icon={BarChart3}
              title="Kein Wochenreport verfuegbar"
              description="Sobald die Growth Engine Daten gesammelt hat, erscheint hier der woechentliche Executive-Report."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const sections: { title: string; items: { label: string; value: string }[] }[] = [
    { title: "Sales", items: r.sales },
    { title: "Kunden", items: r.clients },
    { title: "Umsatz", items: r.revenue },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Wochenreport
          </p>
          <CardTitle className="text-lg">{r.headline}</CardTitle>
        </CardHeader>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {section.items.map((item) => (
                <KpiCard key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Chancen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r.opportunities.length > 0 ? (
              <ul className="space-y-3">
                {r.opportunities.map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-neutral-700">
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">Keine Chancen erfasst.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Risiken
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r.risks.length > 0 ? (
              <ul className="space-y-3">
                {r.risks.map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-neutral-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">Keine Risiken erfasst.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
