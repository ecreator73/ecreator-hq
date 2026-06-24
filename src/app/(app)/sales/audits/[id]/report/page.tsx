import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuditScoreGrid } from "@/components/audits/audit-score-grid";
import { PrintButton } from "@/components/audits/print-button";
import { StatusBadge } from "@/components/tasks/status-badge";
import { websiteAuditsService } from "@/server/services";
import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_SEVERITIES,
  AUDIT_SEVERITY_LABELS,
  auditSeverityColor,
  AUDIT_OPPORTUNITY_TYPE_LABELS,
  auditScoreLevel,
} from "@/config/catalog";
import { formatDate } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import type { AuditFinding } from "@/types/entities";

export const metadata: Metadata = { title: "Sales - Website-Audit Report" };

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const audit = await websiteAuditsService.getDetail(id).catch(() => null);
  if (!audit) notFound();

  const level = auditScoreLevel(audit.overall_score);
  const title = audit.company?.name || audit.url || "Website-Audit";

  // Findings nach Schweregrad gruppieren (kritisch -> niedrig).
  const findingsBySeverity = AUDIT_SEVERITIES.map((sev) => ({
    severity: sev.key,
    label: sev.label,
    items: audit.findings.filter((f) => f.severity === sev.key),
  })).filter((group) => group.items.length > 0);
  const ungroupedFindings = audit.findings.filter(
    (f) => !f.severity || !AUDIT_SEVERITIES.some((s) => s.key === f.severity),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none">
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

      {/* Druckbarer Report */}
      <article className="space-y-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Branding-Kopf */}
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {siteConfig.company}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Website-Audit
            </h1>
            <p className="text-sm text-neutral-600">{title}</p>
            {audit.url ? (
              <p className="text-sm text-neutral-400">{audit.url}</p>
            ) : null}
          </div>
          <div className="text-left sm:text-right">
            <div className="flex items-baseline gap-2 sm:justify-end">
              <span className="text-5xl font-semibold tracking-tight text-neutral-900">
                {audit.overall_score}
              </span>
              <span className="text-sm text-neutral-400">/ 100</span>
            </div>
            <div className="mt-2 sm:flex sm:justify-end">
              <StatusBadge label={level.label} color={level.tone} />
            </div>
          </div>
        </header>

        {/* Kategorie-Scores */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Bewertung nach Kategorie
          </h2>
          <AuditScoreGrid audit={audit} />
        </section>

        {/* Executive Summary */}
        {audit.executive_summary ? (
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Executive Summary
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {audit.executive_summary}
            </p>
          </section>
        ) : null}

        {/* Top-Probleme */}
        {audit.top_problems.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Groesste Probleme
            </h2>
            <ol className="space-y-2">
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
          </section>
        ) : null}

        {/* Quick Wins */}
        {audit.quick_wins.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Quick Wins
            </h2>
            <ul className="space-y-2">
              {audit.quick_wins.map((w, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-sm leading-relaxed text-neutral-700"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500"
                  />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Findings, gruppiert nach Severity */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-neutral-900">
            Detail-Findings
          </h2>
          {audit.findings.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Keine konkreten Findings vorhanden.
            </p>
          ) : (
            <div className="space-y-5">
              {findingsBySeverity.map((group) => (
                <div key={group.severity} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      label={group.label}
                      color={auditSeverityColor(group.severity)}
                    />
                    <span className="text-xs text-neutral-400">
                      {group.items.length}{" "}
                      {group.items.length === 1 ? "Finding" : "Findings"}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {group.items.map((f) => (
                      <FindingItem key={f.id} finding={f} />
                    ))}
                  </ul>
                </div>
              ))}
              {ungroupedFindings.length > 0 ? (
                <ul className="space-y-3">
                  {ungroupedFindings.map((f) => (
                    <FindingItem key={f.id} finding={f} />
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </section>

        {/* Opportunities */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-neutral-900">
            Verkaufschancen (Opportunities)
          </h2>
          {audit.opportunities.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Keine Opportunities abgeleitet.
            </p>
          ) : (
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
                  {o.reason ? (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                      {o.reason}
                    </p>
                  ) : null}
                  {o.recommendation ? (
                    <div className="mt-3 rounded-md border-l-2 border-brand-300 bg-brand-50/60 px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                        Empfehlung
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                        {o.recommendation}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sales-Opportunity */}
        {audit.sales_opportunity ? (
          <section className="break-inside-avoid rounded-lg border border-brand-200 bg-brand-50/70 p-4">
            <h2 className="text-base font-semibold text-brand-800">
              Empfohlener naechster Schritt
            </h2>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
              {audit.sales_opportunity}
            </p>
          </section>
        ) : null}

        {/* Fusszeile */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-4 text-xs text-neutral-400">
          <span>
            {siteConfig.company} &middot; Website-Audit
            {audit.generated_at
              ? ` vom ${formatDate(audit.generated_at)}`
              : ""}
          </span>
          <span>Vertraulich</span>
        </footer>
      </article>
    </div>
  );
}

function FindingItem({ finding }: { finding: AuditFinding }) {
  return (
    <li className="break-inside-avoid rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          {finding.category
            ? (AUDIT_CATEGORY_LABELS[
                finding.category as keyof typeof AUDIT_CATEGORY_LABELS
              ] ?? finding.category)
            : "-"}
        </span>
        {finding.severity ? (
          <StatusBadge
            label={
              AUDIT_SEVERITY_LABELS[
                finding.severity as keyof typeof AUDIT_SEVERITY_LABELS
              ] ?? finding.severity
            }
            color={auditSeverityColor(finding.severity)}
          />
        ) : null}
      </div>
      {finding.title ? (
        <h3 className="mt-2 text-sm font-semibold text-neutral-900">
          {finding.title}
        </h3>
      ) : null}
      {finding.description ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
          {finding.description}
        </p>
      ) : null}
      {finding.recommendation ? (
        <div className="mt-3 rounded-md border-l-2 border-brand-300 bg-brand-50/60 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
            Empfehlung
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
            {finding.recommendation}
          </p>
        </div>
      ) : null}
    </li>
  );
}
