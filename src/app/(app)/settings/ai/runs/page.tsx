import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiRunsTable } from "@/components/ai/ai-runs-table";
import { aiRunsService } from "@/server/services";
import type { AiRun } from "@/types/entities";
import { AI_RUN_STATUSES } from "@/config/catalog";

export const metadata: Metadata = { title: "AI - Runs" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export default async function AiRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const sp = (await searchParams) as SP;
  const status = one(sp.status) || undefined;

  let runs: AiRun[] = [];
  try {
    runs = await aiRunsService.list({ status });
  } catch {
    runs = [];
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>AI-Runs ({runs.length})</CardTitle>
          <form method="get" className="flex items-center gap-2">
            <label
              htmlFor="status"
              className="text-xs font-medium uppercase tracking-wide text-neutral-400"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status ?? ""}
              className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Alle Status</option>
              {AI_RUN_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
            >
              Filtern
            </button>
          </form>
        </div>
        <p className="text-sm text-neutral-500">
          Protokoll aller AI-Laeufe — Eingabe, Ausgabe, Modell, Tokens und
          Kosten. Klicke eine Zeile fuer Details.
        </p>
      </CardHeader>
      <CardContent>
        <AiRunsTable runs={runs} />
      </CardContent>
    </Card>
  );
}
