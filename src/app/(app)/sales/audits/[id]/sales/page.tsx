import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, Sparkles, MessageSquareQuote } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PrintButton } from "@/components/audits/print-button";
import { StatusBadge } from "@/components/tasks/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { websiteAuditsService } from "@/server/services";
import {
  AUDIT_OPPORTUNITY_TYPE_LABELS,
  auditScoreLevel,
} from "@/config/catalog";

export const metadata: Metadata = { title: "Sales - Audit Verkaufs-Version" };

export default async function AuditSalesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const audit = await websiteAuditsService.getDetail(id).catch(() => null);
  if (!audit) notFound();

  const level = auditScoreLevel(audit.overall_score);
  const title = audit.company?.name || audit.url || "Website-Audit";

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      {/* Aktionsleiste (nicht gedruckt) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/sales/audits/${audit.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zum Audit
        </Link>
        <PrintButton />
      </div>

      {/* Kopf */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Sales-Version
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-500">
            {audit.overall_score}/100
          </span>
          <StatusBadge label={level.label} color={level.tone} />
        </div>
      </header>

      {/* Probleme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Probleme
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audit.top_problems.length > 0 ? (
            <ol className="space-y-2.5">
              {audit.top_problems.map((p, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-sm leading-relaxed text-neutral-700"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-semibold text-red-700">
                    {i + 1}
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="Keine Probleme erfasst"
              description="Generiere das Audit, um die groessten Schwachstellen zu sehen."
            />
          )}
        </CardContent>
      </Card>

      {/* Chancen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-500" />
            Chancen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audit.opportunities.length > 0 ? (
            <ul className="space-y-3">
              {audit.opportunities.map((o) => (
                <li
                  key={o.id}
                  className="break-inside-avoid rounded-lg border border-neutral-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      {o.opportunity_type
                        ? (AUDIT_OPPORTUNITY_TYPE_LABELS[
                            o.opportunity_type as keyof typeof AUDIT_OPPORTUNITY_TYPE_LABELS
                          ] ?? o.opportunity_type)
                        : "-"}
                    </h3>
                    <StatusBadge
                      label={`${o.score}/100`}
                      color={auditScoreLevel(o.score).tone}
                    />
                  </div>
                  {o.recommendation ? (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                      {o.recommendation}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Keine Chancen abgeleitet"
              description="Aus dem Audit ergeben sich noch keine konkreten Verkaufschancen."
            />
          )}
        </CardContent>
      </Card>

      {/* Gespraechsaufhaenger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-brand-600" />
            Gespraechsaufhaenger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {audit.executive_summary || audit.sales_opportunity ? (
            <>
              {audit.executive_summary ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                  {audit.executive_summary}
                </p>
              ) : null}
              {audit.sales_opportunity ? (
                <div className="rounded-lg border border-brand-200 bg-brand-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    Aufhaenger fuers Gespraech
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                    {audit.sales_opportunity}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Noch kein Aufhaenger"
              description="Generiere das Audit, um eine Gespraechsgrundlage zu erhalten."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
