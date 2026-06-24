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
import { upsellService } from "@/server/services";
import type { UpsellOpportunityWithClient } from "@/types/entities";
import {
  UPSELL_OPPORTUNITY_TYPE_LABELS,
  GROWTH_STATUSES,
} from "@/config/catalog";
import { setUpsellStatusAction } from "@/app/(app)/clients/growth/actions";
import { formatCHF } from "@/lib/utils";

export const metadata: Metadata = { title: "Growth - Upsell" };

/** Score-Badge: Farbe nach Hoehe der Chance (0-100). */
function scoreColor(score: number): string {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "gray";
}

function typeLabel(type: string | null): string {
  if (!type) return "-";
  return (
    UPSELL_OPPORTUNITY_TYPE_LABELS[
      type as keyof typeof UPSELL_OPPORTUNITY_TYPE_LABELS
    ] ?? type
  );
}

export default async function UpsellPage() {
  // Rollen-Guard liegt im growth/layout.tsx. Hier nur Daten laden.
  let ups: UpsellOpportunityWithClient[] = [];
  try {
    ups = await upsellService.list();
  } catch {
    ups = [];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upsell-Chancen ({ups.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {ups.length === 0 ? (
          <EmptyState
            title="Keine Upsell-Chancen"
            description="Scanne Wachstumschancen im Dashboard, um automatisch Upsell-Potenziale fuer deine Kunden zu erkennen."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[72rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Kunde</th>
                  <th className="px-4 py-2.5 font-medium">Typ</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Geschaetzter Wert
                  </th>
                  <th className="px-4 py-2.5 font-medium">Begruendung</th>
                  <th className="px-4 py-2.5 font-medium">Empfehlung</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {ups.map((u) => (
                  <tr key={u.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      {u.client ? (
                        <Link
                          href={`/clients/${u.client.id}`}
                          className="font-medium text-neutral-900 hover:text-brand-700"
                        >
                          {u.client.name}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {typeLabel(u.opportunity_type)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={String(u.score)}
                        color={scoreColor(u.score)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {u.estimated_value != null
                        ? formatCHF(u.estimated_value)
                        : "-"}
                    </td>
                    <td className="px-4 py-2.5 max-w-xs text-neutral-600">
                      {u.reason ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 max-w-xs text-neutral-600">
                      {u.recommendation ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusSelect
                        id={u.id}
                        value={u.status}
                        statuses={GROWTH_STATUSES}
                        action={setUpsellStatusAction}
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
