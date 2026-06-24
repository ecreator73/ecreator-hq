"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { AuditScoreGrid } from "@/components/audits/audit-score-grid";
import { AuditActions } from "@/components/audits/audit-actions";
import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_SEVERITY_LABELS,
  auditSeverityColor,
  AUDIT_OPPORTUNITY_TYPE_LABELS,
  AUDIT_STATUS_LABELS,
  auditScoreLevel,
} from "@/config/catalog";
import { formatDate, cn } from "@/lib/utils";
import type { WebsiteAuditDetail } from "@/types/entities";

const TABS = [
  { key: "overview", label: "Uebersicht" },
  { key: "findings", label: "Findings" },
  { key: "opportunities", label: "Opportunities" },
  { key: "summary", label: "AI Zusammenfassung" },
  { key: "history", label: "Verlauf" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function AuditDetail({ audit }: { audit: WebsiteAuditDetail }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const level = auditScoreLevel(audit.overall_score);
  const title = audit.url || audit.company?.name || "Website-Audit";

  return (
    <div className="space-y-5">
      <Link
        href="/sales/audits/list"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu Audits
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-xl font-semibold tracking-tight text-neutral-900">
              {title}
            </h1>
            <StatusBadge label={level.label} color={level.tone} />
            <span className="text-sm font-medium text-neutral-500">
              {audit.overall_score}/100
            </span>
          </div>
          {audit.url && audit.company?.name ? (
            <p className="text-sm text-neutral-500">{audit.company.name}</p>
          ) : null}
        </div>
        <AuditActions auditId={audit.id} />
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {t.label}
            {t.key === "findings" && audit.findings.length > 0
              ? ` (${audit.findings.length})`
              : ""}
            {t.key === "opportunities" && audit.opportunities.length > 0
              ? ` (${audit.opportunities.length})`
              : ""}
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-5 sm:p-6">
          {tab === "overview" ? (
            <OverviewTab audit={audit} />
          ) : tab === "findings" ? (
            <FindingsTab audit={audit} />
          ) : tab === "opportunities" ? (
            <OpportunitiesTab audit={audit} />
          ) : tab === "summary" ? (
            <SummaryTab audit={audit} />
          ) : (
            <HistoryTab audit={audit} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------- */

function OverviewTab({ audit }: { audit: WebsiteAuditDetail }) {
  return (
    <div className="space-y-6">
      <AuditScoreGrid audit={audit} />
      {audit.executive_summary ? (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Zusammenfassung
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
            {audit.executive_summary}
          </dd>
        </div>
      ) : null}
    </div>
  );
}

function FindingsTab({ audit }: { audit: WebsiteAuditDetail }) {
  if (audit.findings.length === 0) {
    return (
      <EmptyState
        title="Keine Findings"
        description="Generiere das Audit, um konkrete Schwachstellen zu erhalten."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {audit.findings.map((f) => (
        <li
          key={f.id}
          className="rounded-lg border border-neutral-200 p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              {f.category
                ? (AUDIT_CATEGORY_LABELS[
                    f.category as keyof typeof AUDIT_CATEGORY_LABELS
                  ] ?? f.category)
                : "-"}
            </span>
            {f.severity ? (
              <StatusBadge
                label={
                  AUDIT_SEVERITY_LABELS[
                    f.severity as keyof typeof AUDIT_SEVERITY_LABELS
                  ] ?? f.severity
                }
                color={auditSeverityColor(f.severity)}
              />
            ) : null}
          </div>
          {f.title ? (
            <h3 className="mt-2 text-sm font-semibold text-neutral-900">
              {f.title}
            </h3>
          ) : null}
          {f.description ? (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {f.description}
            </p>
          ) : null}
          {f.recommendation ? (
            <div className="mt-3 rounded-md border-l-2 border-brand-300 bg-brand-50/60 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                Empfehlung
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                {f.recommendation}
              </p>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function OpportunitiesTab({ audit }: { audit: WebsiteAuditDetail }) {
  if (audit.opportunities.length === 0) {
    return (
      <EmptyState
        title="Keine Opportunities"
        description="Aus dem Audit ergeben sich noch keine konkreten Verkaufschancen."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {audit.opportunities.map((o) => (
        <li
          key={o.id}
          className="rounded-lg border border-neutral-200 p-4"
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
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
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
  );
}

function SummaryTab({ audit }: { audit: WebsiteAuditDetail }) {
  const hasContent =
    audit.executive_summary ||
    audit.top_problems.length > 0 ||
    audit.quick_wins.length > 0 ||
    audit.sales_opportunity;

  if (!hasContent) {
    return (
      <EmptyState
        title="Noch keine AI-Auswertung"
        description="Generiere das Audit, um eine KI-gestuetzte Zusammenfassung zu erhalten."
      />
    );
  }

  return (
    <div className="space-y-6">
      {audit.executive_summary ? (
        <section>
          <h3 className="text-sm font-semibold text-neutral-900">
            Executive Summary
          </h3>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
            {audit.executive_summary}
          </p>
        </section>
      ) : null}

      {audit.top_problems.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold text-neutral-900">
            Groesste Probleme
          </h3>
          <ol className="mt-2 space-y-1.5">
            {audit.top_problems.map((p, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-sm leading-relaxed text-neutral-700"
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

      {audit.quick_wins.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold text-neutral-900">
            Quick Wins
          </h3>
          <ul className="mt-2 space-y-1.5">
            {audit.quick_wins.map((w, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-sm leading-relaxed text-neutral-700"
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

      {audit.sales_opportunity ? (
        <section className="rounded-lg border border-brand-200 bg-brand-50/70 p-4">
          <h3 className="text-sm font-semibold text-brand-800">
            Verkaufschance
          </h3>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
            {audit.sales_opportunity}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function HistoryTab({ audit }: { audit: WebsiteAuditDetail }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Status">
        <StatusBadge
          label={
            AUDIT_STATUS_LABELS[
              audit.status as keyof typeof AUDIT_STATUS_LABELS
            ] ?? audit.status
          }
          color={audit.status === "generated" ? "green" : "gray"}
        />
      </Field>
      <Field label="Generiert am">
        {audit.generated_at ? formatDate(audit.generated_at) : "-"}
      </Field>
      <Field label="Erstellt am">
        {audit.created_at ? formatDate(audit.created_at) : "-"}
      </Field>
    </dl>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-neutral-800">{children}</dd>
    </div>
  );
}
