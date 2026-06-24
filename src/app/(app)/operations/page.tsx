import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  ListChecks,
  Sparkles,
  FileText,
  Workflow,
  MessageSquareCode,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { GlobalSearch } from "@/components/knowledge/global-search";
import {
  knowledgeSearchService,
  knowledgeArticlesService,
  sopsService,
} from "@/server/services";
import type {
  KnowledgeSearchResults,
  KnowledgeArticle,
  Sop,
} from "@/types/entities";
import {
  KNOWLEDGE_CATEGORY_LABELS,
  PROMPT_LIBRARY_CATEGORY_LABELS,
} from "@/config/catalog";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Operations - Wissenszentrale" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

function categoryLabel<M extends Record<string, string>>(
  map: M,
  key: string | null,
): string {
  if (!key) return "-";
  return (map[key as keyof M] as string | undefined) ?? key;
}

/** Zaehlt alle Treffer ueber die vier Gruppen hinweg. */
function totalResults(r: KnowledgeSearchResults): number {
  return (
    r.meetings.length + r.articles.length + r.sops.length + r.prompts.length
  );
}

/* -------------------------------------------------------------------------- */
/*  Suchergebnisse                                                            */
/* -------------------------------------------------------------------------- */

function ResultGroup({
  title,
  icon: Icon,
  count,
  emptyHint,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  emptyHint: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="gap-0">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-brand-600" />
          {title}
          <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium tabular-nums text-neutral-500">
            {count}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <EmptyState title="Keine Treffer" description={emptyHint} />
        ) : (
          <ul className="divide-y divide-neutral-100">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

function ResultRow({
  href,
  title,
  meta,
}: {
  href: string;
  title: string;
  meta?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-brand-700"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-neutral-900 group-hover:text-brand-700">
            {title}
          </span>
          {meta ? (
            <span className="block truncate text-xs text-neutral-500">
              {meta}
            </span>
          ) : null}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-brand-500" />
      </Link>
    </li>
  );
}

function SearchResults({ results }: { results: KnowledgeSearchResults }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ResultGroup
        title="Meetings"
        icon={CalendarClock}
        count={results.meetings.length}
        emptyHint="Keine Meetings passen zur Suche."
      >
        {results.meetings.map((m) => (
          <ResultRow
            key={m.id}
            href={`/operations/meetings/${m.id}`}
            title={m.title}
            meta={m.meeting_date ? formatDate(m.meeting_date) : undefined}
          />
        ))}
      </ResultGroup>

      <ResultGroup
        title="Wissen / Artikel"
        icon={BookOpen}
        count={results.articles.length}
        emptyHint="Keine Artikel passen zur Suche."
      >
        {results.articles.map((a) => (
          <ResultRow
            key={a.id}
            href="/operations/knowledge"
            title={a.title}
            meta={categoryLabel(KNOWLEDGE_CATEGORY_LABELS, a.category)}
          />
        ))}
      </ResultGroup>

      <ResultGroup
        title="SOPs"
        icon={ListChecks}
        count={results.sops.length}
        emptyHint="Keine SOPs passen zur Suche."
      >
        {results.sops.map((s) => (
          <ResultRow
            key={s.id}
            href="/operations/sops"
            title={s.title}
            meta={categoryLabel(KNOWLEDGE_CATEGORY_LABELS, s.category)}
          />
        ))}
      </ResultGroup>

      <ResultGroup
        title="Prompts"
        icon={Sparkles}
        count={results.prompts.length}
        emptyHint="Keine Prompts passen zur Suche."
      >
        {results.prompts.map((p) => (
          <ResultRow
            key={p.id}
            href="/operations/prompts"
            title={p.title}
            meta={categoryLabel(PROMPT_LIBRARY_CATEGORY_LABELS, p.category)}
          />
        ))}
      </ResultGroup>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Schnellzugriff (ohne Suche)                                               */
/* -------------------------------------------------------------------------- */

const QUICK_LINKS: {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    href: "/operations/knowledge",
    label: "Wissen",
    description: "Artikel, Playbooks und internes Know-how.",
    icon: BookOpen,
  },
  {
    href: "/operations/meetings",
    label: "Meetings",
    description: "Transkripte, Zusammenfassungen und ToDos.",
    icon: CalendarClock,
  },
  {
    href: "/operations/sops",
    label: "SOPs",
    description: "Standardprozesse Schritt fuer Schritt.",
    icon: Workflow,
  },
  {
    href: "/operations/prompts",
    label: "Prompts",
    description: "Wiederverwendbare KI-Prompts mit Variablen.",
    icon: MessageSquareCode,
  },
];

function QuickAccess() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {QUICK_LINKS.map((q) => (
        <Link
          key={q.href}
          href={q.href}
          className={cn(
            "group flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm",
            "transition-colors hover:border-brand-300 hover:bg-brand-50/40",
          )}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <q.icon className="h-5 w-5" />
          </span>
          <span className="mt-1 text-sm font-semibold text-neutral-900 group-hover:text-brand-700">
            {q.label}
          </span>
          <span className="text-xs text-neutral-500">{q.description}</span>
        </Link>
      ))}
    </div>
  );
}

function RecentList({
  title,
  icon: Icon,
  emptyHint,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyHint: string;
  items: { id: string; href: string; title: string; meta: string }[];
}) {
  return (
    <Card>
      <CardHeader className="gap-0">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-brand-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState title="Noch nichts vorhanden" description={emptyHint} />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {items.map((it) => (
              <ResultRow
                key={it.id}
                href={it.href}
                title={it.title}
                meta={it.meta}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function OperationsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = one(sp.q)?.trim();

  if (q) {
    const results = await knowledgeSearchService
      .search(q)
      .catch(() => null);

    return (
      <div className="space-y-6">
        <GlobalSearch defaultValue={q} />
        {results === null ? (
          <EmptyState
            title="Suche nicht verfuegbar"
            description="Die Suche konnte aktuell nicht ausgefuehrt werden. Bitte versuche es spaeter erneut."
          />
        ) : (
          <>
            <p className="text-sm text-neutral-500">
              {totalResults(results)} Treffer fuer{" "}
              <span className="font-medium text-neutral-700">
                &laquo;{q}&raquo;
              </span>
            </p>
            <SearchResults results={results} />
          </>
        )}
      </div>
    );
  }

  // Ohne Suchbegriff: Schnellzugriff + zuletzt aktualisierte Inhalte.
  const [recentArticles, recentSops] = await Promise.all([
    knowledgeArticlesService.list({}).catch(() => [] as KnowledgeArticle[]),
    sopsService.list({}).catch(() => [] as Sop[]),
  ]);

  const articleItems = recentArticles.slice(0, 5).map((a) => ({
    id: a.id,
    href: "/operations/knowledge",
    title: a.title,
    meta: a.updated_at
      ? `Aktualisiert ${formatDate(a.updated_at)}`
      : categoryLabel(KNOWLEDGE_CATEGORY_LABELS, a.category),
  }));

  const sopItems = recentSops.slice(0, 5).map((s) => ({
    id: s.id,
    href: "/operations/sops",
    title: s.title,
    meta: categoryLabel(KNOWLEDGE_CATEGORY_LABELS, s.category),
  }));

  return (
    <div className="space-y-6">
      <GlobalSearch />

      <Card className="border-brand-100 bg-brand-50/40">
        <CardContent className="flex flex-col gap-1 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
            <FileText className="h-4 w-4" />
            Zentrale Wissenszentrale
          </div>
          <p className="text-sm text-neutral-600">
            Meetings, Wissensartikel, SOPs und Prompts an einem Ort - alles
            durchsuchbar. Tippe oben einen Suchbegriff ein oder springe direkt
            in ein Modul.
          </p>
        </CardContent>
      </Card>

      <QuickAccess />

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentList
          title="Zuletzt aktualisierte Artikel"
          icon={BookOpen}
          emptyHint="Lege deinen ersten Wissensartikel an."
          items={articleItems}
        />
        <RecentList
          title="SOPs"
          icon={Workflow}
          emptyHint="Erstelle deinen ersten Standardprozess."
          items={sopItems}
        />
      </div>
    </div>
  );
}
