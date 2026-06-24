import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/audits/print-button";
import { StatusBadge } from "@/components/tasks/status-badge";
import { proposalsService } from "@/server/services";
import {
  PROPOSAL_TYPE_LABELS,
  PROPOSAL_STATUSES,
  statusLabel,
} from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Sales - Offerte" };

export default async function ProposalOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const proposal = await proposalsService.getDetail(id).catch(() => null);
  if (!proposal) notFound();

  const recipient =
    proposal.client?.name || proposal.lead?.company_name || "Interessent";
  const typeLabel = proposal.proposal_type
    ? (PROPOSAL_TYPE_LABELS[
        proposal.proposal_type as keyof typeof PROPOSAL_TYPE_LABELS
      ] ?? proposal.proposal_type)
    : null;
  const statusColor =
    PROPOSAL_STATUSES.find((s) => s.key === proposal.status)?.color ?? "gray";

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none">
      {/* Aktionsleiste (nicht gedruckt) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/sales/proposals/${proposal.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zum Vorschlag
        </Link>
        <PrintButton />
      </div>

      {/* Druckbare Offerte */}
      <article className="space-y-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Branding-Kopf */}
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {siteConfig.company}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Offerte
            </h1>
            <p className="text-sm text-neutral-600">{proposal.title}</p>
            {typeLabel ? (
              <p className="text-sm text-neutral-400">{typeLabel}</p>
            ) : null}
          </div>
          <div className="space-y-1 text-left sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Fuer
            </p>
            <p className="text-base font-semibold text-neutral-900">
              {recipient}
            </p>
            <div className="sm:flex sm:justify-end">
              <StatusBadge
                label={statusLabel("proposal", proposal.status)}
                color={statusColor}
              />
            </div>
            <p className="text-xs text-neutral-400">
              Version {proposal.version} &middot;{" "}
              {formatDate(proposal.created_at)}
            </p>
          </div>
        </header>

        {/* Ausgangslage */}
        {proposal.situation ? (
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Ausgangslage
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {proposal.situation}
            </p>
          </section>
        ) : null}

        {/* Ziel */}
        {proposal.goal ? (
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">Ziel</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {proposal.goal}
            </p>
          </section>
        ) : null}

        {/* Loesung */}
        {proposal.solution ? (
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Unsere Loesung
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {proposal.solution}
            </p>
          </section>
        ) : null}

        {/* Leistungsumfang */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-neutral-900">
            Leistungsumfang
          </h2>
          {proposal.items.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Noch keine Leistungen erfasst.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {proposal.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 px-4 py-3 break-inside-avoid"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-neutral-900">
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-500">
                        {item.description}
                      </p>
                    ) : null}
                    {item.quantity && item.quantity !== 1 ? (
                      <p className="text-xs text-neutral-400">
                        Menge: {item.quantity}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-neutral-900">
                      {formatCHF(item.total_price)}
                      {item.recurring ? (
                        <span className="text-xs font-normal text-neutral-400">
                          {" "}
                          / Monat
                        </span>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Investition */}
        <section className="break-inside-avoid space-y-3">
          <h2 className="text-base font-semibold text-neutral-900">
            Investition
          </h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Einmalig
              </dt>
              <dd className="mt-1 text-lg font-semibold text-neutral-900">
                {formatCHF(proposal.amount)}
              </dd>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Monatlich
              </dt>
              <dd className="mt-1 text-lg font-semibold text-neutral-900">
                {formatCHF(proposal.monthly_amount)}
              </dd>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Setup
              </dt>
              <dd className="mt-1 text-lg font-semibold text-neutral-900">
                {formatCHF(proposal.setup_fee)}
              </dd>
            </div>
          </dl>
          {proposal.contract_duration_months ? (
            <p className="text-sm text-neutral-500">
              Laufzeit:{" "}
              <span className="font-medium text-neutral-700">
                {proposal.contract_duration_months} Monate
              </span>
            </p>
          ) : null}
          <p className="text-xs text-neutral-400">
            Alle Preise verstehen sich exkl. MwSt.
          </p>
        </section>

        {/* Naechste Schritte */}
        {proposal.next_steps ? (
          <section className="break-inside-avoid space-y-2 rounded-lg border border-brand-200 bg-brand-50/70 p-4">
            <h2 className="text-base font-semibold text-brand-800">
              Naechste Schritte
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
              {proposal.next_steps}
            </p>
          </section>
        ) : null}

        {/* Fusszeile */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-4 text-xs text-neutral-400">
          <span>
            {siteConfig.company} &middot; Offerte &middot;{" "}
            {formatDate(proposal.created_at)}
          </span>
          <span>Vertraulich</span>
        </footer>
      </article>
    </div>
  );
}
