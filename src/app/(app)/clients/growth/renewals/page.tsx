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
import { renewalsService } from "@/server/services";
import type { RenewalWithClient } from "@/types/entities";
import { RENEWAL_STATUSES } from "@/config/catalog";
import { setRenewalStatusAction } from "@/app/(app)/clients/growth/actions";

export const metadata: Metadata = { title: "Growth - Verlaengerungen" };

/** Score-Badge: Farbe nach Hoehe des Verlaengerungs-Scores (0-100). */
function scoreColor(score: number): string {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "gray";
}

export default async function RenewalsPage() {
  // Rollen-Guard liegt im growth/layout.tsx. Hier nur Daten laden.
  let rns: RenewalWithClient[] = [];
  try {
    rns = await renewalsService.list();
  } catch {
    rns = [];
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Verlaengerungen ({rns.length})</CardTitle>
        <p className="text-sm text-neutral-500">
          Verträge mit Ende in 90 Tagen werden automatisch erfasst.
        </p>
      </CardHeader>
      <CardContent>
        {rns.length === 0 ? (
          <EmptyState
            title="Keine anstehenden Verlaengerungen"
            description="Sobald Verträge in den naechsten 90 Tagen auslaufen, erscheinen sie hier automatisch zur Bearbeitung."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Kunde</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Wahrscheinlichkeit
                  </th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rns.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      {r.client ? (
                        <Link
                          href={`/clients/${r.client.id}`}
                          className="font-medium text-neutral-900 hover:text-brand-700"
                        >
                          {r.client.name}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {r.renewal_probability}%
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={String(r.renewal_score)}
                        color={scoreColor(r.renewal_score)}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusSelect
                        id={r.id}
                        value={r.status}
                        statuses={RENEWAL_STATUSES}
                        action={setRenewalStatusAction}
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
  );
}
