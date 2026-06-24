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
import { ChurnDismiss } from "@/components/growth/churn-dismiss";
import { churnService } from "@/server/services";
import type { ChurnRiskWithClient } from "@/types/entities";

export const metadata: Metadata = { title: "Growth - Churn" };

/** Score-Badge: je hoeher das Risiko, desto roter. */
function churnColor(score: number): string {
  if (score >= 70) return "red";
  if (score >= 40) return "amber";
  return "gray";
}

export default async function ChurnPage() {
  // Rollen-Guard liegt im growth/layout.tsx. Hier nur Daten laden.
  let ch: ChurnRiskWithClient[] = [];
  try {
    ch = await churnService.list();
  } catch {
    ch = [];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Churn-Risiken ({ch.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {ch.length === 0 ? (
          <EmptyState
            title="Keine Churn-Risiken"
            description="Aktuell sind keine Kunden als abwanderungsgefaehrdet eingestuft. Scanne Wachstumschancen im Dashboard, um Risiken automatisch zu erkennen."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Kunde</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Gruende</th>
                  <th className="px-4 py-2.5 text-right font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {ch.map((c) => (
                  <tr key={c.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      {c.client ? (
                        <Link
                          href={`/clients/${c.client.id}`}
                          className="font-medium text-neutral-900 hover:text-brand-700"
                        >
                          {c.client.name}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={String(c.score)}
                        color={churnColor(c.score)}
                      />
                    </td>
                    <td className="px-4 py-2.5 max-w-md text-neutral-600">
                      {c.reasons ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ChurnDismiss id={c.id} />
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
