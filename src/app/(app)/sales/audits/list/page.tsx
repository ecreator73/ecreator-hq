import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { AuditCreate } from "@/components/audits/audit-create";
import { websiteAuditsService } from "@/server/services";
import type { WebsiteAuditWithRelations } from "@/types/entities";
import { AUDIT_STATUS_LABELS, auditScoreLevel } from "@/config/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Website-Audits - Audits" };

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type SP = { minScore?: string; maxScore?: string; q?: string };

function toNumber(v: string | undefined): number | undefined {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function statusLabel(status: string | null): string {
  if (!status) return "-";
  return (
    AUDIT_STATUS_LABELS[status as keyof typeof AUDIT_STATUS_LABELS] ?? status
  );
}

export default async function AuditsListPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const filters = {
    minScore: toNumber(sp.minScore),
    maxScore: toNumber(sp.maxScore),
    search: sp.q?.trim() || undefined,
  };

  let audits: WebsiteAuditWithRelations[] = [];
  try {
    audits = await websiteAuditsService.list(filters);
  } catch {
    audits = [];
  }

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex items-center justify-end">
        <AuditCreate />
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Audits ({audits.length})</CardTitle>
          </div>
          <form
            method="GET"
            className="flex flex-wrap items-end gap-3"
            aria-label="Audits filtern"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="filter-minScore"
                className="block text-xs font-medium text-neutral-600"
              >
                Min-Score
              </label>
              <input
                id="filter-minScore"
                name="minScore"
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                placeholder="0"
                defaultValue={sp.minScore ?? ""}
                className={`${inputClass} w-28`}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="filter-maxScore"
                className="block text-xs font-medium text-neutral-600"
              >
                Max-Score
              </label>
              <input
                id="filter-maxScore"
                name="maxScore"
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                placeholder="100"
                defaultValue={sp.maxScore ?? ""}
                className={`${inputClass} w-28`}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label
                htmlFor="filter-q"
                className="block text-xs font-medium text-neutral-600"
              >
                Suche (URL)
              </label>
              <input
                id="filter-q"
                name="q"
                type="search"
                placeholder="z. B. beispiel.ch"
                defaultValue={sp.q ?? ""}
                className={`${inputClass} min-w-[12rem]`}
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50"
            >
              Filtern
            </button>
            <Link
              href="/sales/audits/list"
              className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
            >
              Zuruecksetzen
            </Link>
          </form>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <EmptyState
              title="Keine Audits gefunden"
              description="Es gibt keine Website-Audits, die zu den aktuellen Filtern passen. Passe die Filter an oder lege ein neues Audit an."
              action={<AuditCreate />}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">URL / Firma</th>
                    <th className="px-4 py-2.5 font-medium">Firma</th>
                    <th className="px-4 py-2.5 font-medium">Gesamt-Score</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Erstellt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {audits.map((a) => {
                    const level = auditScoreLevel(a.overall_score);
                    return (
                      <tr key={a.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/sales/audits/${a.id}`}
                            className="font-medium text-neutral-900 hover:text-brand-700"
                          >
                            {a.url || a.company?.name || "Ohne Bezeichnung"}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-neutral-700">
                          {a.company?.name ?? "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge
                            label={`${Math.round(a.overall_score)}/100 - ${level.label}`}
                            color={level.tone}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">
                          {statusLabel(a.status)}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">
                          {a.created_at ? formatDate(a.created_at) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
