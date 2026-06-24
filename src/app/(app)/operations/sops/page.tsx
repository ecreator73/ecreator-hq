import type { Metadata } from "next";
import { Search, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SopCard } from "@/components/knowledge/sop-card";
import { SopQuickCreate } from "@/components/knowledge/sop-quick-create";
import { sopsService } from "@/server/services";
import type { Sop } from "@/types/entities";
import { KNOWLEDGE_CATEGORIES } from "@/config/catalog";

export const metadata: Metadata = { title: "SOPs - Operations" };

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type SP = { category?: string; q?: string };

const one = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export default async function OperationsSopsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filters = {
    category: one(sp.category),
    search: one(sp.q),
  };

  let sops: Sop[] = [];
  try {
    sops = await sopsService.list(filters);
  } catch {
    sops = [];
  }

  return (
    <div className="space-y-5">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">SOPs</h2>
          <p className="text-sm text-neutral-500">
            {sops.length} Standard-Arbeitsanweisungen.
          </p>
        </div>
        <SopQuickCreate />
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

        <div className="flex flex-1 flex-col gap-1 min-w-[12rem]">
          <label htmlFor="q" className="text-xs font-medium text-neutral-500">
            Suche
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.search ?? ""}
            placeholder="Titel ..."
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
      {sops.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Noch keine SOPs"
          description="Lege deine erste Standard-Arbeitsanweisung an - z. B. fuer Kunden-Onboarding, Website Launch oder Ads Setup. SOPs halten wiederkehrende Prozesse Schritt fuer Schritt fest."
          action={<SopQuickCreate />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sops.map((sop) => (
            <SopCard key={sop.id} sop={sop} />
          ))}
        </div>
      )}
    </div>
  );
}
