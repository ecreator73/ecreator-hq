"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ASSISTANT_QUESTIONS } from "@/config/catalog";
import { assistantAction } from "@/app/(app)/operations/growth/actions";
import type { AssistantAnswer } from "@/types/entities";

/**
 * AI-Assistant-Panel: beantwortet kanonische Fragen datenbasiert
 * ("Welche Leads sollte Fabian heute anrufen?" etc.). Keine freie KI-Halluzi-
 * nation - die Antworten kommen direkt aus den echten Daten der Engine.
 */
export function AssistantPanel({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ask(q: string) {
    if (!q.trim()) return;
    setError(null);
    setQuery(q);
    startTransition(async () => {
      const res = await assistantAction(q);
      if (!res.ok) {
        setError(res.error);
        setAnswer(null);
        return;
      }
      setAnswer(res.data ?? null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ASSISTANT_QUESTIONS.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => ask(q.label)}
            disabled={pending}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-left text-xs font-medium text-neutral-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
          >
            {q.label}
          </button>
        ))}
      </div>

      {!compact ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(query);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Eigene Frage stellen ..."
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Fragen
          </Button>
        </form>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : answer ? (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
          <p className="flex items-start gap-2 text-sm font-medium text-neutral-800">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
            {answer.summary}
          </p>
          {answer.items.length > 0 ? (
            <ul className="space-y-1.5">
              {answer.items.map((it, i) => {
                const inner = (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{it.title}</p>
                      {it.subtitle ? (
                        <p className="truncate text-xs text-neutral-500">{it.subtitle}</p>
                      ) : null}
                    </div>
                    {it.badge ? (
                      <Badge tone="brand" className="shrink-0">
                        {it.badge}
                      </Badge>
                    ) : null}
                  </div>
                );
                return (
                  <li key={i}>
                    {it.href ? (
                      <Link href={it.href} className="block hover:opacity-80">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-neutral-400">
          Waehle eine Frage oder stelle eine eigene - die Antwort basiert auf echten Daten.
        </p>
      )}
    </div>
  );
}
