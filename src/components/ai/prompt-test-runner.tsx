"use client";

import { useState, useTransition } from "react";
import { AlertCircle, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiRunDetail } from "@/components/ai/ai-run-detail";
import { testPromptAction } from "@/app/(app)/settings/ai/actions";
import type { AiRun } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/**
 * Test-Runner fuer einen Prompt: je Variable ein Eingabefeld, fuehrt einen
 * Vorschau-Run aus (testPromptAction) und zeigt das Ergebnis via <AiRunDetail/>.
 */
export function PromptTestRunner({
  promptId,
  variables,
}: {
  promptId: string;
  variables: string[];
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(variables.map((v) => [v, ""])),
  );
  const [run, setRun] = useState<AiRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function runTest() {
    setError(null);
    setRun(null);
    startTransition(async () => {
      const result = await testPromptAction(promptId, values);
      if (result.ok && result.data) setRun(result.data);
      else if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {variables.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {variables.map((v) => (
            <div key={v} className="space-y-1.5">
              <label className="block font-mono text-sm font-medium text-neutral-700">
                {v}
              </label>
              <input
                value={values[v] ?? ""}
                onChange={(e) => set(v, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          Dieser Prompt hat keine Variablen.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={runTest} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Laeuft ...
            </>
          ) : (
            <>
              <FlaskConical className="h-4 w-4" />
              Test-Run
            </>
          )}
        </Button>
        <p className="text-xs text-neutral-500">
          Vorschau — keine Live-AI-Verbindung in dieser Phase.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {run ? <AiRunDetail run={run} /> : null}
    </div>
  );
}
