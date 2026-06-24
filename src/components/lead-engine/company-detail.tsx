"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusSelect } from "@/components/production/status-select";
import { ScoreBars } from "@/components/lead-engine/score-bars";
import {
  HandoverButton,
  RecomputeButton,
} from "@/components/lead-engine/lead-actions";
import { CompanyForm } from "@/components/lead-engine/company-form";
import {
  WATCHLIST_STATUSES,
  WEBSITE_SCAN_CHECKS,
  LEAD_OPPORTUNITY_TYPE_LABELS,
  leadScoreLevel,
} from "@/config/catalog";
import { setWatchlistStatusAction } from "@/app/(app)/sales/lead-engine/actions";
import { formatDate, cn } from "@/lib/utils";
import type {
  LeadCompanyWithStats,
  LeadOpportunity,
  WebsiteScan,
} from "@/types/entities";

const TABS = [
  { key: "overview", label: "Uebersicht" },
  { key: "website", label: "Website Analyse" },
  { key: "opportunities", label: "Opportunities" },
  { key: "recommendations", label: "Empfehlungen" },
  { key: "activity", label: "Aktivitaeten" },
  { key: "handover", label: "Sales Uebergabe" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const BADGE_TONE: Record<string, "neutral" | "brand" | "green" | "amber" | "red"> = {
  red: "red",
  amber: "amber",
  blue: "brand",
  gray: "neutral",
  green: "green",
};

export function CompanyDetail({
  company,
  opportunities,
}: {
  company: LeadCompanyWithStats;
  opportunities: LeadOpportunity[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-5">
      <Link
        href="/sales/lead-engine/companies"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu Firmen
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              {company.name}
            </h1>
            {company.industry ? (
              <span className="text-sm font-medium text-neutral-500">
                {company.industry}
              </span>
            ) : null}
            {company.handed_over ? (
              <Badge tone="green">Uebergeben</Badge>
            ) : null}
          </div>
          <div className="max-w-md">
            <ScoreBars company={company} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect
            id={company.id}
            value={company.watchlist_status}
            statuses={WATCHLIST_STATUSES}
            action={setWatchlistStatusAction}
          />
          <RecomputeButton companyId={company.id} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </Button>
        </div>
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
            {t.key === "opportunities" && opportunities.length > 0
              ? ` (${opportunities.length})`
              : ""}
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-5 sm:p-6">
          {tab === "overview" ? (
            <OverviewTab company={company} />
          ) : tab === "website" ? (
            <WebsiteTab company={company} />
          ) : tab === "opportunities" ? (
            <OpportunitiesTab opportunities={opportunities} />
          ) : tab === "recommendations" ? (
            <RecommendationsTab opportunities={opportunities} />
          ) : tab === "activity" ? (
            <EmptyState
              title="Aktivitaet folgt"
              description="Kontakt- und Aktivitaetsverlauf fuer diese Firma wird hier erfasst."
            />
          ) : (
            <HandoverTab company={company} />
          )}
        </CardContent>
      </Card>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Firma bearbeiten"
        size="lg"
      >
        <CompanyForm
          mode="edit"
          id={company.id}
          options={{
            sources: company.source
              ? [{ id: company.source.id, name: company.source.name }]
              : [],
          }}
          initial={{
            name: company.name,
            industry: company.industry,
            website: company.website,
            contact_name: company.contact_name,
            email: company.email,
            phone: company.phone,
            city: company.city,
            canton: company.canton,
            country: company.country,
            source_id: company.source_id,
            website_scan: company.website_scan,
            watchlist_status: company.watchlist_status,
            notes: company.notes,
          }}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}

/* ----------------------------------------------------------------------- */

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

function OverviewTab({ company }: { company: LeadCompanyWithStats }) {
  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Firma">{company.name}</Field>
        <Field label="Branche">{company.industry ?? "-"}</Field>
        <Field label="Ansprechpartner">{company.contact_name ?? "-"}</Field>
        <Field label="E-Mail">
          {company.email ? (
            <a
              href={`mailto:${company.email}`}
              className="text-brand-700 hover:underline"
            >
              {company.email}
            </a>
          ) : (
            "-"
          )}
        </Field>
        <Field label="Telefon">
          {company.phone ? (
            <a
              href={`tel:${company.phone}`}
              className="text-brand-700 hover:underline"
            >
              {company.phone}
            </a>
          ) : (
            "-"
          )}
        </Field>
        <Field label="Website">
          {company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="text-brand-700 hover:underline"
            >
              {company.website}
            </a>
          ) : (
            "-"
          )}
        </Field>
        <Field label="Stadt">{company.city ?? "-"}</Field>
        <Field label="Kanton">{company.canton ?? "-"}</Field>
        <Field label="Land">{company.country ?? "-"}</Field>
        <Field label="Quelle">{company.source?.name ?? "-"}</Field>
        <Field label="Opportunities">{company.opportunity_count}</Field>
        <Field label="Erfasst am">
          {company.created_at ? formatDate(company.created_at) : "-"}
        </Field>
      </dl>

      {company.notes ? (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Notizen
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
            {company.notes}
          </dd>
        </div>
      ) : null}
    </div>
  );
}

function WebsiteTab({ company }: { company: LeadCompanyWithStats }) {
  const scan: WebsiteScan = company.website_scan ?? {};

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {WEBSITE_SCAN_CHECKS.map((check) => {
          const value = scan[check.key as keyof WebsiteScan] as
            | boolean
            | undefined;
          const known = value !== undefined && value !== null;
          return (
            <li
              key={check.key}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="text-sm text-neutral-700">{check.label}</span>
              {!known ? (
                <span className="text-xs text-neutral-400">unbekannt</span>
              ) : value ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Ja
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                  <X className="h-4 w-4" aria-hidden="true" />
                  Nein
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="Ladezeit">
          {typeof scan.load_time_ms === "number"
            ? `${scan.load_time_ms} ms`
            : "-"}
        </Field>
        <Field label="Zuletzt analysiert">
          {company.last_analyzed_at
            ? formatDate(company.last_analyzed_at)
            : "-"}
        </Field>
      </dl>
    </div>
  );
}

function OpportunitiesTab({
  opportunities,
}: {
  opportunities: LeadOpportunity[];
}) {
  if (opportunities.length === 0) {
    return (
      <EmptyState
        title="Keine Opportunities"
        description="Fuehre eine Analyse durch, um Opportunities fuer diese Firma zu ermitteln."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {opportunities.map((opp) => {
        const level = leadScoreLevel(opp.score);
        return (
          <li
            key={opp.id}
            className="rounded-lg border border-neutral-200 p-4"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-neutral-800">
                {opp.opportunity_type
                  ? (LEAD_OPPORTUNITY_TYPE_LABELS[
                      opp.opportunity_type as keyof typeof LEAD_OPPORTUNITY_TYPE_LABELS
                    ] ?? opp.opportunity_type)
                  : "Allgemein"}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-neutral-900">
                  {opp.score}
                </span>
                <Badge tone={BADGE_TONE[level.tone] ?? "neutral"}>
                  {level.label}
                </Badge>
              </span>
            </div>
            {opp.findings ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
                {opp.findings}
              </p>
            ) : (
              <p className="text-sm italic text-neutral-400">
                Keine Befunde erfasst.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RecommendationsTab({
  opportunities,
}: {
  opportunities: LeadOpportunity[];
}) {
  const withRecs = opportunities.filter((o) => o.recommendations?.trim());
  if (withRecs.length === 0) {
    return (
      <EmptyState
        title="Keine Empfehlungen"
        description="Sobald Opportunities ausgewertet sind, erscheinen hier konkrete Handlungsempfehlungen."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {withRecs.map((opp) => (
        <li key={opp.id} className="rounded-lg border border-neutral-200 p-4">
          <p className="mb-1.5 text-sm font-semibold text-neutral-800">
            {opp.opportunity_type
              ? (LEAD_OPPORTUNITY_TYPE_LABELS[
                  opp.opportunity_type as keyof typeof LEAD_OPPORTUNITY_TYPE_LABELS
                ] ?? opp.opportunity_type)
              : "Allgemein"}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
            {opp.recommendations}
          </p>
        </li>
      ))}
    </ul>
  );
}

function HandoverTab({ company }: { company: LeadCompanyWithStats }) {
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm leading-relaxed text-neutral-600">
        Bei der Uebergabe an die Sales-Pipeline wird aus dieser Firma ein Lead
        mit dem Status <span className="font-medium text-neutral-800">Neu</span>{" "}
        im Sales-CRM erstellt. Die Firma bleibt in der Lead Engine als{" "}
        <span className="font-medium text-neutral-800">uebergeben</span>{" "}
        markiert.
      </p>
      <HandoverButton
        companyId={company.id}
        handedOver={company.handed_over}
        leadId={company.handed_over_lead_id ?? undefined}
      />
      {company.handed_over && company.handed_over_at ? (
        <p className="text-xs text-neutral-400">
          Uebergeben am {formatDate(company.handed_over_at)}
        </p>
      ) : null}
    </div>
  );
}
