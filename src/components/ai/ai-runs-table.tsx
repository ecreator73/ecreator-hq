"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { AiRunDetail } from "@/components/ai/ai-run-detail";
import { AI_RUN_STATUS_LABELS, aiRunStatusColor } from "@/config/catalog";
import { formatDate } from "@/lib/utils";
import type { AiRun } from "@/types/entities";

function statusLabel(status: string): string {
  return (
    AI_RUN_STATUS_LABELS[status as keyof typeof AI_RUN_STATUS_LABELS] ?? status
  );
}

export function AiRunsTable({ runs }: { runs: AiRun[] }) {
  const [selected, setSelected] = useState<AiRun | null>(null);

  if (runs.length === 0) {
    return (
      <EmptyState
        title="Noch keine AI Runs"
        description="Sobald Prompts ausgefuehrt oder getestet werden, erscheinen die Laeufe hier."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-2.5 font-medium">Prompt</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Entitaet</th>
              <th className="px-4 py-2.5 font-medium">Modell</th>
              <th className="px-4 py-2.5 font-medium">Zeitpunkt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {runs.map((run) => (
              <tr
                key={run.id}
                onClick={() => setSelected(run)}
                className="cursor-pointer align-top hover:bg-neutral-50"
              >
                <td className="px-4 py-2.5 font-medium text-neutral-900">
                  {run.prompt?.name ?? "-"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge
                    label={statusLabel(run.status)}
                    color={aiRunStatusColor(run.status)}
                  />
                </td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {run.entity_type ?? "-"}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {run.model ?? "-"}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {formatDate(run.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.prompt?.name ?? "AI Run"}
        size="lg"
      >
        {selected ? <AiRunDetail run={selected} /> : null}
      </Modal>
    </>
  );
}
