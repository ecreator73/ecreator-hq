import type { Metadata } from "next";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ArticleCard } from "@/components/knowledge/article-card";
import { ArticleQuickCreate } from "@/components/knowledge/article-quick-create";
import { knowledgeArticlesService } from "@/server/services";
import type { KnowledgeArticle } from "@/types/entities";
import {
  KNOWLEDGE_CATEGORIES,
  ARTICLE_STATUSES,
} from "@/config/catalog";

export const metadata: Metadata = { title: "Wissen - Operations" };

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type SP = { category?: string; status?: string; q?: string };

const one = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export default async function OperationsKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filters = {
    category: one(sp.category),
    status: one(sp.status),
    search: one(sp.q),
  };

  let articles: KnowledgeArticle[] = [];
  try {
    articles = await knowledgeArticlesService.list(filters);
  } catch {
    articles = [];
  }

  return (
    <div className="space-y-5">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Wissen</h2>
          <p className="text-sm text-neutral-500">
            {articles.length} Artikel in der Wissensdatenbank.
          </p>
        </div>
        <ArticleQuickCreate />
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
            {KNOWLEDGE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="status"
            className="text-xs font-medium text-neutral-500"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filters.status ?? ""}
            className={inputClass}
          >
            <option value="">Alle Status</option>
            {ARTICLE_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
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
            placeholder="Titel oder Inhalt ..."
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
      {articles.length === 0 ? (
        <EmptyState
          title="Keine Artikel gefunden"
          description="Es gibt noch keine Wissensartikel - oder keiner passt zu den aktuellen Filtern. Lege deinen ersten Artikel an, um Wissen zentral zu sammeln."
          action={<ArticleQuickCreate />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
