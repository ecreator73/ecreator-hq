import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { ProposalGenerate } from "@/components/proposals/proposal-generate";
import { proposalsService } from "@/server/services";
import type { ProposalWithRelations } from "@/types/entities";
import {
  PROPOSAL_STATUSES,
  PROPOSAL_TYPES,
  PROPOSAL_TYPE_LABELS,
  statusLabel,
} from "@/config/catalog";
import { formatCHF, formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Proposal Engine - Angebote" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

function statusColor(status: string): string | undefined {
  return PROPOSAL_STATUSES.find((s) => s.key === status)?.color;
}

function typeLabel(type: string | null): string {
  if (!type) return "-";
  return (
    PROPOSAL_TYPE_LABELS[type as keyof typeof PROPOSAL_TYPE_LABELS] ?? type
  );
}

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export default async function ProposalsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const sp = (await searchParams) as SP;
  const status = one(sp.status) ?? "";
  const type = one(sp.type) ?? "";
  const q = one(sp.q) ?? "";

  let proposals: ProposalWithRelations[] = [];
  try {
    proposals = await proposalsService.list({
      status: status || undefined,
      proposalType: type || undefined,
      search: q || undefined,
    });
  } catch {
    proposals = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Angebote"
        description="Alle Vorschlaege im Ueberblick - filtern nach Status, Typ und Stichwort."
        actions={<ProposalGenerate />}
      />

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Angebote ({proposals.length})</CardTitle>
          </div>
          {/* Filter (GET-Form) */}
          <form
            method="get"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto]"
          >
            <select name="status" defaultValue={status} className={inputClass}>
              <option value="">Alle Status</option>
              {PROPOSAL_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <select name="type" defaultValue={type} className={inputClass}>
              <option value="">Alle Typen</option>
              {PROPOSAL_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Nach Titel suchen ..."
              className={inputClass}
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Filtern
            </button>
          </form>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <EmptyState
              title="Keine Angebote gefunden"
              description="Es gibt keine Angebote, die zu den aktuellen Filtern passen. Generiere einen neuen Vorschlag oder passe die Filter an."
              action={<ProposalGenerate />}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[64rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Titel</th>
                    <th className="px-4 py-2.5 font-medium">Typ</th>
                    <th className="px-4 py-2.5 font-medium">Kunde / Lead</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Einmalig
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Monatlich
                    </th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Erstellt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {proposals.map((p) => (
                    <tr key={p.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/sales/proposals/${p.id}`}
                          className="font-medium text-neutral-900 hover:text-brand-700"
                        >
                          {p.title}
                        </Link>
                        <span
                          className={cn(
                            "ml-2 inline-flex items-center rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-neutral-500",
                          )}
                        >
                          v{p.version}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700">
                        {typeLabel(p.proposal_type)}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700">
                        {p.client?.name ?? p.lead?.company_name ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {p.amount != null ? formatCHF(p.amount) : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {p.monthly_amount != null
                          ? formatCHF(p.monthly_amount)
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          label={statusLabel("proposal", p.status)}
                          color={statusColor(p.status)}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {formatDate(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
