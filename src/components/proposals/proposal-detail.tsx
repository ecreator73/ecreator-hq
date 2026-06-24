"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  FileText,
  Pencil,
  Presentation,
  ScrollText,
  ReceiptText,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { ProposalActions } from "@/components/proposals/proposal-actions";
import { ProposalItemsEditor } from "@/components/proposals/proposal-items";
import { ProposalForm } from "@/components/proposals/proposal-form";
import {
  PROPOSAL_STATUSES,
  PROPOSAL_TYPE_LABELS,
  PRESENTATION_STRUCTURE,
  statusLabel,
} from "@/config/catalog";
import { formatCHF, formatDate, cn } from "@/lib/utils";
import type { ProposalDetail as ProposalDetailType } from "@/types/entities";

const TABS = [
  { key: "overview", label: "Uebersicht" },
  { key: "items", label: "Leistungen" },
  { key: "pricing", label: "Preis" },
  { key: "documents", label: "Dokumente" },
  { key: "presentation", label: "Praesentation" },
  { key: "contract", label: "Vertrag" },
  { key: "activity", label: "Aktivitaet" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function statusColor(status: string): string | undefined {
  return PROPOSAL_STATUSES.find((s) => s.key === status)?.color;
}

export function ProposalDetail({
  proposal,
}: {
  proposal: ProposalDetailType;
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);

  const partner = proposal.client
    ? { kind: "Kunde", label: proposal.client.name }
    : proposal.lead
      ? { kind: "Lead", label: proposal.lead.company_name }
      : null;

  return (
    <div className="space-y-5">
      <Link
        href="/sales/proposals/list"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu Angeboten
      </Link>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              {proposal.title}
            </h1>
            <Badge tone="neutral">v{proposal.version}</Badge>
            <StatusBadge
              label={statusLabel("proposal", proposal.status)}
              color={statusColor(proposal.status)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
            {partner ? (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {partner.kind}: {partner.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-neutral-400">
                <Building2 className="h-4 w-4" />
                Kein Kunde / Lead verknuepft
              </span>
            )}
            {proposal.proposal_type ? (
              <span>
                {PROPOSAL_TYPE_LABELS[
                  proposal.proposal_type as keyof typeof PROPOSAL_TYPE_LABELS
                ] ?? proposal.proposal_type}
              </span>
            ) : null}
            <span>Erstellt {formatDate(proposal.created_at)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      <ProposalActions proposal={proposal} />

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
            {t.key === "items" && proposal.items.length > 0
              ? ` (${proposal.items.length})`
              : ""}
            {t.key === "activity" && proposal.versions.length > 0
              ? ` (${proposal.versions.length})`
              : ""}
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-5 sm:p-6">
          {tab === "overview" ? (
            <OverviewTab proposal={proposal} />
          ) : tab === "items" ? (
            <ProposalItemsEditor
              proposalId={proposal.id}
              items={proposal.items}
            />
          ) : tab === "pricing" ? (
            <PricingTab proposal={proposal} />
          ) : tab === "documents" ? (
            <DocumentsTab proposal={proposal} />
          ) : tab === "presentation" ? (
            <PresentationTab />
          ) : tab === "contract" ? (
            <ContractTab proposal={proposal} />
          ) : (
            <ActivityTab proposal={proposal} />
          )}
        </CardContent>
      </Card>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Angebot bearbeiten"
        size="lg"
      >
        <ProposalForm
          proposal={proposal}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function OverviewTab({ proposal }: { proposal: ProposalDetailType }) {
  const blocks = [
    { label: "Ausgangslage", value: proposal.situation },
    { label: "Ziel", value: proposal.goal },
    { label: "Loesung", value: proposal.solution },
    { label: "Naechste Schritte", value: proposal.next_steps },
  ];
  const hasContent = blocks.some((b) => b.value && b.value.trim());

  if (!hasContent) {
    return (
      <EmptyState
        title="Noch kein Inhalt erfasst"
        description="Hinterlege Ausgangslage, Ziel, Loesung und naechste Schritte ueber 'Bearbeiten'."
      />
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((b) =>
        b.value && b.value.trim() ? (
          <section key={b.label} className="space-y-1.5">
            <h3 className="text-sm font-semibold text-neutral-900">
              {b.label}
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
              {b.value}
            </p>
          </section>
        ) : null,
      )}
    </div>
  );
}

function PricingTab({ proposal }: { proposal: ProposalDetailType }) {
  const rows = [
    { label: "Einmalig", value: proposal.amount },
    { label: "Monatlich", value: proposal.monthly_amount },
    { label: "Setup-Gebuehr", value: proposal.setup_fee },
  ];
  return (
    <div className="space-y-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4"
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {r.label}
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-neutral-900">
              {formatCHF(r.value)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="rounded-xl border border-neutral-200 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Laufzeit
        </span>
        <p className="mt-1 text-sm text-neutral-700">
          {proposal.contract_duration_months != null
            ? `${proposal.contract_duration_months} Monate`
            : "Keine Laufzeit definiert"}
        </p>
      </div>
    </div>
  );
}

function DocLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link href={href}>
      <Button variant="secondary" size="sm">
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}

function DocumentsTab({ proposal }: { proposal: ProposalDetailType }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <DocLink
          href={`/sales/proposals/${proposal.id}/offer`}
          icon={FileText}
          label="Offerte"
        />
        <DocLink
          href={`/sales/proposals/${proposal.id}/presentation`}
          icon={Presentation}
          label="Praesentation"
        />
        <DocLink
          href={`/sales/proposals/${proposal.id}/contract`}
          icon={ScrollText}
          label="Vertrag"
        />
      </div>

      {proposal.invoice_id ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50/70 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm text-green-800">
            <ReceiptText className="h-4 w-4" />
            Rechnungsentwurf erstellt.
          </span>
          <Link
            href="/finance/invoices"
            className="text-sm font-medium text-green-700 underline-offset-2 hover:underline"
          >
            Zu den Rechnungen
          </Link>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          Noch kein Rechnungsentwurf vorhanden. Erstelle ihn ueber die
          Aktionen oben.
        </p>
      )}
    </div>
  );
}

function PresentationTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        Gliederung der Verkaufspraesentation. Die fertige Praesentation
        oeffnest du im Tab "Dokumente".
      </p>
      <ol className="space-y-2">
        {PRESENTATION_STRUCTURE.map((slide, i) => (
          <li
            key={slide}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm"
          >
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
              {i + 1}
            </span>
            <span className="font-medium text-neutral-800">{slide}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ContractTab({ proposal }: { proposal: ProposalDetailType }) {
  const rows = [
    {
      label: "Laufzeit",
      value:
        proposal.contract_duration_months != null
          ? `${proposal.contract_duration_months} Monate`
          : null,
    },
    {
      label: "Vertragsstart",
      value: proposal.contract_start_date
        ? formatDate(proposal.contract_start_date)
        : null,
    },
    { label: "Zahlungsbedingungen", value: proposal.payment_terms },
    { label: "Kuendigung", value: proposal.cancellation_terms },
  ];

  return (
    <div className="space-y-5">
      <dl className="space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {r.label}
            </dt>
            <dd className="whitespace-pre-wrap text-sm text-neutral-700">
              {r.value && String(r.value).trim() ? (
                r.value
              ) : (
                <span className="text-neutral-400">Nicht definiert</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Entwurf - kein Rechtsersatz. Bitte vor Vertragsabschluss rechtlich
        pruefen lassen.
      </div>
    </div>
  );
}

function ActivityTab({ proposal }: { proposal: ProposalDetailType }) {
  if (proposal.versions.length === 0) {
    return (
      <EmptyState
        title="Keine Versionen"
        description="Sobald neue Versionen erstellt werden, erscheinen sie hier."
      />
    );
  }
  return (
    <ol className="space-y-2">
      {proposal.versions.map((v) => {
        const isCurrent = v.id === proposal.id;
        return (
          <li
            key={v.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm",
              isCurrent
                ? "border-brand-200 bg-brand-50/50"
                : "border-neutral-200 bg-white",
            )}
          >
            <div className="flex items-center gap-2.5">
              <Badge tone={isCurrent ? "brand" : "neutral"}>
                v{v.version}
              </Badge>
              <StatusBadge
                label={statusLabel("proposal", v.status)}
                color={statusColor(v.status)}
              />
              {isCurrent ? (
                <span className="text-xs font-medium text-brand-700">
                  aktuelle Ansicht
                </span>
              ) : (
                <Link
                  href={`/sales/proposals/${v.id}`}
                  className="text-xs font-medium text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
                >
                  oeffnen
                </Link>
              )}
            </div>
            <span className="text-xs text-neutral-400">
              {formatDate(v.created_at)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
