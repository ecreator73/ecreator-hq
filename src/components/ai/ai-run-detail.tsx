import { StatusBadge } from "@/components/tasks/status-badge";
import { AI_RUN_STATUS_LABELS, aiRunStatusColor } from "@/config/catalog";
import { formatDate } from "@/lib/utils";
import type { AiRun } from "@/types/entities";

function statusLabel(status: string): string {
  return (
    AI_RUN_STATUS_LABELS[status as keyof typeof AI_RUN_STATUS_LABELS] ?? status
  );
}

function JsonBlock({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown> | null;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      {value && Object.keys(value).length > 0 ? (
        <pre className="max-h-64 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-700">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 px-3 py-2 text-xs text-neutral-400">
          Keine Daten
        </p>
      )}
    </div>
  );
}

export function AiRunDetail({ run }: { run: AiRun }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Status
          </dt>
          <dd className="mt-1">
            <StatusBadge
              label={statusLabel(run.status)}
              color={aiRunStatusColor(run.status)}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Modell
          </dt>
          <dd className="mt-1 text-sm text-neutral-700">{run.model ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Tokens
          </dt>
          <dd className="mt-1 text-sm tabular-nums text-neutral-700">
            {run.token_usage != null ? run.token_usage.toLocaleString("de-CH") : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Kosten
          </dt>
          <dd className="mt-1 text-sm tabular-nums text-neutral-700">
            {run.cost_estimate != null
              ? `${run.cost_estimate.toFixed(4)} USD`
              : "-"}
          </dd>
        </div>
      </dl>

      {run.error_message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {run.error_message}
        </div>
      ) : null}

      <JsonBlock label="Eingabe" value={run.input_data} />
      <JsonBlock label="Ausgabe" value={run.output_data} />

      <p className="text-xs text-neutral-400">
        Erstellt am {formatDate(run.created_at)}
      </p>
    </div>
  );
}
