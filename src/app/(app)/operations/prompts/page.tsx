import type { Metadata } from "next";
import { Search, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PromptCard } from "@/components/knowledge/prompt-card";
import { PromptLibQuickCreate } from "@/components/knowledge/prompt-lib-quick-create";
import { promptLibraryService } from "@/server/services";
import type { PromptLibraryItem } from "@/types/entities";
import { PROMPT_LIBRARY_CATEGORIES } from "@/config/catalog";

export const metadata: Metadata = { title: "Prompts - Operations" };

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type SP = { category?: string; q?: string };

const one = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export default async function OperationsPromptsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filters = {
    category: one(sp.category),
    search: one(sp.q),
  };

  let prompts: PromptLibraryItem[] = [];
  try {
    prompts = await promptLibraryService.list(filters);
  } catch {
    prompts = [];
  }

  return (
    <div className="space-y-5">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Prompts</h2>
          <p className="text-sm text-neutral-500">
            {prompts.length} Prompts in der Bibliothek.
          </p>
        </div>
        <PromptLibQuickCreate />
      </div>

      {/* Filter (GET-Form) */}
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="category"
            className="text-xs font-medium text-neutral-500"
          >
            Kategorie
          </label>
          <select
            id="category"
            name="category"
            defaultValue={filters.category ?? ""}
            className={inputClass}
          >
            <option value="">Alle Kategorien</option>
            {PROMPT_LIBRARY_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 flex-col gap-1 min-w-[12rem]">
          <label htmlFor="q" className="text-xs font-medium text-neutral-500">
            Suche
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.search ?? ""}
            placeholder="Titel oder Prompt-Text ..."
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
        >
          <Search className="h-4 w-4" />
          Filtern
        </button>
      </form>

      {/* Grid */}
      {prompts.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Noch keine Prompts"
          description="Sammle hier wiederverwendbare Prompts fuer Claude Code, Lovable, Ads, Sales und mehr. Lege deinen ersten Prompt an, um ihn dem ganzen Team verfuegbar zu machen."
          action={<PromptLibQuickCreate />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {prompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}
    </div>
  );
}
