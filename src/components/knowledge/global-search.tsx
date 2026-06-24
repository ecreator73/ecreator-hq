import { Search } from "lucide-react";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/**
 * Praesentationale globale Suche fuer die Operations-Uebersicht.
 * Reines GET-Formular auf /operations (kein Client-State noetig) - der
 * Suchbegriff landet als ?q=... in der URL und wird serverseitig ausgewertet.
 */
export function GlobalSearch({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="get" action="/operations" className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Wissen, Meetings, SOPs und Prompts durchsuchen ..."
          aria-label="Globale Suche"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        <Search className="h-4 w-4" />
        Suchen
      </button>
    </form>
  );
}
