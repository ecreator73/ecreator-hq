import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PromptQuickCreate } from "@/components/ai/prompt-quick-create";
import { PromptTestRunner } from "@/components/ai/prompt-test-runner";
import { aiPromptsService } from "@/server/services";
import type { PromptFilters } from "@/server/services";
import type { AiPrompt } from "@/types/entities";
import {
  AI_PROMPT_CATEGORIES,
  AI_PROMPT_CATEGORY_LABELS,
  AI_PROMPT_STATUSES,
  AI_MODEL_LABELS,
} from "@/config/catalog";

export const metadata: Metadata = { title: "AI Prompts" };

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type SP = { category?: string; status?: string; q?: string };

function categoryLabel(key: string | null): string {
  if (!key) return "Allgemein";
  return (
    AI_PROMPT_CATEGORY_LABELS[key as keyof typeof AI_PROMPT_CATEGORY_LABELS] ??
    key
  );
}

function modelLabel(key: string | null): string {
  if (!key) return "-";
  return AI_MODEL_LABELS[key as keyof typeof AI_MODEL_LABELS] ?? key;
}

export default async function AiPromptsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const filters: PromptFilters = {
    category: sp.category || undefined,
    status: sp.status || undefined,
    search: sp.q || undefined,
  };

  let prompts: AiPrompt[] = [];
  try {
    prompts = await aiPromptsService.list(filters);
  } catch {
    prompts = [];
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Prompts ({prompts.length})</CardTitle>
            <PromptQuickCreate />
          </div>
          <form
            method="get"
            className="flex flex-wrap items-end gap-3"
            aria-label="Prompts filtern"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="filter-category"
                className="block text-xs font-medium text-neutral-500"
              >
                Kategorie
              </label>
              <select
                id="filter-category"
                name="category"
                defaultValue={filters.category ?? ""}
                className={inputClass}
              >
                <option value="">Alle Kategorien</option>
                {AI_PROMPT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="filter-status"
                className="block text-xs font-medium text-neutral-500"
              >
                Status
              </label>
              <select
                id="filter-status"
                name="status"
                defaultValue={filters.status ?? ""}
                className={inputClass}
              >
                <option value="">Alle Status</option>
                {AI_PROMPT_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grow space-y-1.5">
              <label
                htmlFor="filter-q"
                className="block text-xs font-medium text-neutral-500"
              >
                Suche
              </label>
              <input
                id="filter-q"
                name="q"
                type="search"
                defaultValue={filters.search ?? ""}
                placeholder="Name oder Beschreibung ..."
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
            >
              Filtern
            </button>
          </form>
        </CardHeader>
      </Card>

      {prompts.length === 0 ? (
        <EmptyState
          title="Keine Prompts vorhanden"
          description="Es gibt keine Prompt-Templates, die zu den aktuellen Filtern passen. Lege ein neues Template an, um wiederverwendbare AI-Anweisungen zu speichern."
          action={<PromptQuickCreate />}
        />
      ) : (
        <div className="space-y-4">
          {prompts.map((p) => (
            <Card key={p.id}>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <CardTitle>{p.name}</CardTitle>
                    {p.description ? (
                      <p className="max-w-2xl text-sm text-neutral-500">
                        {p.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{categoryLabel(p.category)}</Badge>
                    <StatusBadge
                      label={p.status === "active" ? "Aktiv" : "Inaktiv"}
                      color={p.status === "active" ? "green" : "gray"}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                  <span>
                    Modell:{" "}
                    <span className="font-medium text-neutral-700">
                      {modelLabel(p.model)}
                    </span>
                  </span>
                  <span>
                    Temperatur:{" "}
                    <span className="font-medium text-neutral-700">
                      {p.temperature}
                    </span>
                  </span>
                </div>
                {p.variables.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-neutral-400">Variablen:</span>
                    {p.variables.map((v) => (
                      <Badge key={v} tone="neutral" className="font-mono">
                        {v}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">Keine Variablen.</p>
                )}
              </CardHeader>
              <CardContent className="border-t border-neutral-100 pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Test-Run
                </p>
                <PromptTestRunner promptId={p.id} variables={p.variables} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
