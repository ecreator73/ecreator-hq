import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/finance/kpi-card";
import { PrintButton } from "@/components/audits/print-button";
import { executiveService } from "@/server/services";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Executive - Briefing" };

/** Liste mit kleinen Aufzaehlungspunkten; leer -> dezenter Hinweis. */
function BulletList({
  items,
  emptyLabel,
  tone = "neutral",
}: {
  items: string[];
  emptyLabel: string;
  tone?: "neutral" | "amber" | "red";
}) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-400">{emptyLabel}</p>;
  }
  const dotTone =
    tone === "red"
      ? "bg-red-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-brand-500";
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-700">
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotTone}`}
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Kleine Ueberschrift fuer einen Abschnitt innerhalb einer Briefing-Card. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
      {children}
    </p>
  );
}

export default async function ExecutiveBriefingPage() {
  // Rollen-Guard liegt im executive/layout.tsx (requireRole). Hier nur Daten laden.
  const [mb, wr] = await Promise.all([
    executiveService.morningBriefing().catch(() => null),
    executiveService.weeklyReport().catch(() => null),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none">
      {/* Aktionsleiste (nicht gedruckt) */}
      <div className="flex items-center justify-end print:hidden">
        <PrintButton />
      </div>

      {/* Tagesbriefing */}
      <Card>
        <CardHeader>
          <CardTitle>Tagesbriefing</CardTitle>
        </CardHeader>
        <CardContent>
          {!mb ? (
            <EmptyState
              title="Kein Tagesbriefing verfuegbar"
              description="Sobald Daten zu Umsatz, Leads und Produktion vorliegen, erscheint hier das taegliche Briefing."
            />
          ) : (
            <div className="space-y-6">
              <p className="text-base font-medium leading-relaxed text-neutral-900">
                {mb.headline}
              </p>

              {/* Kennzahlen als KPI-Cards */}
              {mb.numbers.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {mb.numbers.map((n, i) => (
                    <KpiCard key={i} label={n.label} value={n.value} />
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-2.5">
                  <SectionLabel>Risiken</SectionLabel>
                  <BulletList
                    items={mb.risks}
                    emptyLabel="Keine Risiken erkannt."
                    tone="red"
                  />
                </div>
                <div className="space-y-2.5">
                  <SectionLabel>Heisse Leads</SectionLabel>
                  <BulletList
                    items={mb.hotLeads}
                    emptyLabel="Keine heissen Leads."
                  />
                </div>
                <div className="space-y-2.5">
                  <SectionLabel>Probleme</SectionLabel>
                  <BulletList
                    items={mb.problems}
                    emptyLabel="Keine offenen Probleme."
                    tone="amber"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wochen-CEO-Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Wochen-CEO-Report</CardTitle>
          <span className="text-xs text-neutral-400 print:hidden">
            {formatDate(new Date())}
          </span>
        </CardHeader>
        <CardContent>
          {!wr ? (
            <EmptyState
              title="Kein Wochen-Report verfuegbar"
              description="Sobald Umsatz- und Aktivitaetsdaten der Woche vorliegen, erscheint hier der CEO-Report."
            />
          ) : (
            <div className="space-y-6">
              <p className="text-base font-medium leading-relaxed text-neutral-900">
                {wr.headline}
              </p>

              {/* Umsatz-Kennzahlen */}
              {wr.revenue.length > 0 ? (
                <div className="space-y-2.5">
                  <SectionLabel>Umsatz</SectionLabel>
                  <dl className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200">
                    {wr.revenue.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <dt className="text-sm text-neutral-600">{r.label}</dt>
                        <dd className="text-sm font-semibold tabular-nums text-neutral-900">
                          {r.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2.5">
                  <SectionLabel>Highlights</SectionLabel>
                  <BulletList
                    items={wr.highlights}
                    emptyLabel="Keine Highlights diese Woche."
                  />
                </div>
                <div className="space-y-2.5">
                  <SectionLabel>Risiken</SectionLabel>
                  <BulletList
                    items={wr.risks}
                    emptyLabel="Keine Risiken erkannt."
                    tone="red"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
