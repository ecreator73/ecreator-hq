import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProposalGenerate } from "@/components/proposals/proposal-generate";
import { proposalsService } from "@/server/services";
import type { ProposalDashboard } from "@/types/entities";
import { formatCHF, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Proposal Engine - Dashboard" };

type WidgetTone = "neutral" | "brand" | "amber" | "green" | "red";

const TONE_STYLES: Record<WidgetTone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-700",
  amber: "text-amber-600",
  green: "text-green-600",
  red: "text-red-600",
};

function Widget({
  label,
  value,
  href,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: WidgetTone;
  hint?: string;
}) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          TONE_STYLES[tone],
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-neutral-400">{hint}</p> : null}
    </>
  );
  const base =
    "block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm";
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "transition-colors hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

const WORKFLOW_STEPS = [
  { label: "Lead", description: "Interessent qualifizieren" },
  { label: "Audit", description: "Analyse & Potenzial" },
  { label: "Angebot", description: "Vorschlag generieren" },
  { label: "Kunde", description: "Abschluss & Onboarding" },
];

export default async function ProposalsDashboardPage() {
  const d = await proposalsService.dashboard().catch(() => null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposal Engine"
        description="Vom Lead zum unterschriebenen Vertrag: Vorschlaege generieren, als Offerte und Praesentation aufbereiten, Vertraege vorbereiten und in Rechnungen ueberfuehren."
        actions={<ProposalGenerate />}
      />

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Widget
          label="Entwuerfe"
          value={d?.drafts ?? 0}
          href="/sales/proposals/list?status=draft"
        />
        <Widget
          label="Zur Pruefung"
          value={d?.review ?? 0}
          href="/sales/proposals/list?status=review"
          tone={(d?.review ?? 0) > 0 ? "amber" : "neutral"}
        />
        <Widget
          label="Gesendet"
          value={d?.sent ?? 0}
          href="/sales/proposals/list?status=sent"
          tone="brand"
        />
        <Widget
          label="Akzeptiert"
          value={d?.accepted ?? 0}
          href="/sales/proposals/list?status=accepted"
          tone="green"
        />
        <Widget
          label="Offene Vertraege"
          value={d?.openContracts ?? 0}
          href="/sales/proposals/list?status=accepted"
        />
        <Widget
          label="Angebotsvolumen"
          value={formatCHF(d?.volume ?? 0)}
          tone="brand"
          hint="Einmalige Summe aller Angebote"
        />
        <Widget
          label="Abschlussquote"
          value={`${d?.winRate ?? 0}%`}
          tone={(d?.winRate ?? 0) >= 30 ? "green" : "neutral"}
          hint="Akzeptiert / (Akzeptiert + Abgelehnt)"
        />
      </div>

      {/* Workflow-Hinweis */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-neutral-500">
            Jedes Angebot folgt demselben Weg. Die Proposal Engine deckt den
            Schritt vom qualifizierten Lead bis zur abschlussreifen Offerte ab.
          </p>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW_STEPS.map((step, i) => (
              <li
                key={step.label}
                className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-neutral-900">
                    {step.label}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {step.description}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
