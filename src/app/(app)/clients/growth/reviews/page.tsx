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
import { StatusSelect } from "@/components/production/status-select";
import { ReviewQuickCreate } from "@/components/growth/review-quick-create";
import { reviewService, referralService } from "@/server/services";
import type {
  ReviewRequestWithClient,
  ReferralOpportunityWithClient,
} from "@/types/entities";
import { REVIEW_STATUSES, GROWTH_STATUSES } from "@/config/catalog";
import {
  setReviewStatusAction,
  setReferralStatusAction,
} from "@/app/(app)/clients/growth/actions";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Growth - Reviews" };

/** Score-Badge: Farbe nach Hoehe der Chance (0-100). */
function scoreColor(score: number): string {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "gray";
}

function ClientCell({
  client,
}: {
  client: { id: string; name: string } | null;
}) {
  if (!client) return <span className="text-neutral-400">-</span>;
  return (
    <Link
      href={`/clients/${client.id}`}
      className="font-medium text-neutral-900 hover:text-brand-700"
    >
      {client.name}
    </Link>
  );
}

export default async function ReviewsPage() {
  // Rollen-Guard liegt im growth/layout.tsx. Hier nur Daten laden.
  let revs: ReviewRequestWithClient[] = [];
  try {
    revs = await reviewService.list();
  } catch {
    revs = [];
  }

  let refs: ReferralOpportunityWithClient[] = [];
  try {
    refs = await referralService.list();
  } catch {
    refs = [];
  }

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ReviewQuickCreate />
      </div>

      {/* Bewertungsanfragen */}
      <Card>
        <CardHeader>
          <CardTitle>Bewertungsanfragen ({revs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {revs.length === 0 ? (
            <EmptyState
              title="Keine Bewertungsanfragen"
              description="Frage zufriedene Kunden um eine Bewertung an, um Vertrauen und Sichtbarkeit aufzubauen."
              action={<ReviewQuickCreate />}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Kunde</th>
                    <th className="px-4 py-2.5 font-medium">Anfragedatum</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Bewertungs-Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {revs.map((r) => (
                    <tr key={r.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-2.5">
                        <ClientCell client={r.client} />
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {r.request_date ? formatDate(r.request_date) : "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusSelect
                          id={r.id}
                          value={r.status}
                          statuses={REVIEW_STATUSES}
                          action={setReviewStatusAction}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        {r.review_url ? (
                          <a
                            href={r.review_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-700 hover:text-brand-800 hover:underline"
                          >
                            Link oeffnen
                          </a>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empfehlungschancen */}
      <Card>
        <CardHeader>
          <CardTitle>Empfehlungschancen ({refs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {refs.length === 0 ? (
            <EmptyState
              title="Keine Empfehlungschancen"
              description="Scanne Wachstumschancen im Dashboard, um Kunden mit hohem Empfehlungspotenzial automatisch zu erkennen."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Kunde</th>
                    <th className="px-4 py-2.5 font-medium">Score</th>
                    <th className="px-4 py-2.5 font-medium">Begruendung</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {refs.map((r) => (
                    <tr key={r.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-2.5">
                        <ClientCell client={r.client} />
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          label={String(r.score)}
                          color={scoreColor(r.score)}
                        />
                      </td>
                      <td className="px-4 py-2.5 max-w-md text-neutral-600">
                        {r.reason ?? "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusSelect
                          id={r.id}
                          value={r.status}
                          statuses={GROWTH_STATUSES}
                          action={setReferralStatusAction}
                        />
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
