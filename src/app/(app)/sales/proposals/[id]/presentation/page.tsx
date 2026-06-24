import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/audits/print-button";
import { proposalsService } from "@/server/services";
import {
  PRESENTATION_STRUCTURE,
  PROPOSAL_TYPE_LABELS,
} from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import type { ProposalDetail } from "@/types/entities";

export const metadata: Metadata = { title: "Sales - Praesentation" };

export default async function ProposalPresentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const proposal = await proposalsService.getDetail(id).catch(() => null);
  if (!proposal) notFound();

  const recipient =
    proposal.client?.name || proposal.lead?.company_name || "Interessent";

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

      {/* Folien */}
      <div className="space-y-5">
        {PRESENTATION_STRUCTURE.map((slide, index) => (
          <Slide
            key={slide}
            index={index}
            total={PRESENTATION_STRUCTURE.length}
            title={slide}
            proposal={proposal}
            recipient={recipient}
          />
        ))}
      </div>
    </div>
  );
}

function Slide({
  index,
  total,
  title,
  proposal,
  recipient,
}: {
  index: number;
  total: number;
  title: string;
  proposal: ProposalDetail;
  recipient: string;
}) {
  return (
    <section className="flex min-h-[340px] break-inside-avoid flex-col rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm print:min-h-0 print:break-after-page print:rounded-none print:border-0 print:shadow-none">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          {siteConfig.company}
        </p>
        <p className="text-xs text-neutral-400">
          {index + 1} / {total}
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center py-6">
        <SlideContent
          title={title}
          proposal={proposal}
          recipient={recipient}
        />
      </div>
    </section>
  );
}

function SlideContent({
  title,
  proposal,
  recipient,
}: {
  title: string;
  proposal: ProposalDetail;
  recipient: string;
}) {
  const typeLabel = proposal.proposal_type
    ? (PROPOSAL_TYPE_LABELS[
        proposal.proposal_type as keyof typeof PROPOSAL_TYPE_LABELS
      ] ?? proposal.proposal_type)
    : null;

  // Heading + Fliesstext-Slides
  const textMap: Record<string, string | null> = {
    Ausgangslage: proposal.situation,
    Problem: proposal.situation,
    Zielbild: proposal.goal,
    Loesung: proposal.solution,
    Ablauf: proposal.next_steps,
    "Naechste Schritte": proposal.next_steps,
  };

  if (title === "Titel") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
          Vorschlag
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          {proposal.title}
        </h2>
        {typeLabel ? (
          <p className="text-base text-neutral-500">{typeLabel}</p>
        ) : null}
        <p className="text-sm text-neutral-400">
          Praesentiert fuer{" "}
          <span className="font-medium text-neutral-600">{recipient}</span>
        </p>
        <p className="text-xs text-neutral-400">
          {siteConfig.company} &middot; {formatDate(proposal.created_at)}
        </p>
      </div>
    );
  }

  if (title === "Leistungen") {
    return (
      <div className="space-y-5">
        <SlideHeading>Leistungen</SlideHeading>
        {proposal.items.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Noch keine Leistungen erfasst.
          </p>
        ) : (
          <ul className="space-y-3">
            {proposal.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3"
              >
                <div className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                  />
                  <span className="text-base text-neutral-800">
                    {item.title}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-medium text-neutral-500">
                  {formatCHF(item.total_price)}
                  {item.recurring ? (
                    <span className="text-xs text-neutral-400"> / Monat</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (title === "Investition") {
    return (
      <div className="space-y-5">
        <SlideHeading>Investition</SlideHeading>
        <dl className="grid gap-4 sm:grid-cols-3">
          <PriceBox label="Einmalig" value={formatCHF(proposal.amount)} />
          <PriceBox
            label="Monatlich"
            value={formatCHF(proposal.monthly_amount)}
          />
          <PriceBox label="Setup" value={formatCHF(proposal.setup_fee)} />
        </dl>
        {proposal.contract_duration_months ? (
          <p className="text-sm text-neutral-500">
            Laufzeit: {proposal.contract_duration_months} Monate
          </p>
        ) : null}
      </div>
    );
  }

  // Standard Text-Slide
  const text = textMap[title];
  return (
    <div className="space-y-4">
      <SlideHeading>{title}</SlideHeading>
      {text ? (
        <p className="whitespace-pre-wrap text-lg leading-relaxed text-neutral-700">
          {text}
        </p>
      ) : (
        <p className="text-sm text-neutral-400">Noch kein Inhalt hinterlegt.</p>
      )}
    </div>
  );
}

function SlideHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
      {children}
    </h2>
  );
}

function PriceBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 text-center">
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="mt-2 text-xl font-semibold text-neutral-900">{value}</dd>
    </div>
  );
}
