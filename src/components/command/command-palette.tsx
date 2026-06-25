"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  CornerDownLeft,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { globalSearchAction } from "@/app/(app)/command-actions";
import type { SearchGroup } from "@/server/services";

export type CreateKind = "lead" | "client" | "task";

interface Cmd {
  id: string;
  label: string;
  sub?: string | null;
  kbd?: string;
  run: () => void;
}
interface Section {
  label: string;
  items: Cmd[];
}

export function CommandPalette({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (kind: CreateKind) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [selected, setSelected] = useState(0);
  const [pending, start] = useTransition();

  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  const create = (k: CreateKind) => {
    onClose();
    onCreate(k);
  };

  // Beim Oeffnen zuruecksetzen + fokussieren
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Debounced Suche
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const h = window.setTimeout(() => {
      start(async () => setResults(await globalSearchAction(q)));
    }, 220);
    return () => window.clearTimeout(h);
  }, [query, open]);

  const isSearch = query.trim().length >= 2;

  const sections: Section[] = useMemo(() => {
    if (isSearch) {
      return results.map((g) => ({
        label: g.label,
        items: g.items.map((it) => ({
          id: `${g.key}-${it.id}`,
          label: it.title || "—",
          sub: it.subtitle,
          run: () => go(it.href),
        })),
      }));
    }
    return [
      {
        label: "Schnellaktionen",
        items: [
          { id: "new-lead", label: "Neuer Lead", kbd: "L", run: () => create("lead") },
          { id: "new-client", label: "Neuer Kunde", kbd: "C", run: () => create("client") },
          { id: "new-task", label: "Neue Aufgabe", kbd: "Q", run: () => create("task") },
          { id: "new-offer", label: "Neues Angebot", run: () => go("/sales/offers") },
          { id: "new-contract", label: "Neuer Vertrag", run: () => go("/sales/contracts") },
          { id: "new-reporting", label: "Neuer Reporting-Call", run: () => go("/clients/reporting") },
        ],
      },
      {
        label: "Navigation",
        items: [
          { id: "nav-home", label: "Home", run: () => go("/") },
          { id: "nav-leads", label: "Leads", run: () => go("/sales/leads") },
          { id: "nav-sales", label: "Sales", run: () => go("/sales") },
          { id: "nav-clients", label: "Clients", run: () => go("/clients") },
          { id: "nav-production", label: "Production", run: () => go("/production") },
          { id: "nav-finance", label: "Finance", run: () => go("/finance") },
          { id: "nav-calendar", label: "Kalender", run: () => go("/calendar") },
          { id: "nav-notifications", label: "Benachrichtigungen", run: () => go("/notifications") },
        ],
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearch, results]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[selected]?.run();
    }
  }

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-neutral-900/40 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Suche und Schnellaktionen"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-neutral-100 px-4">
          {pending ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-neutral-400" />
          ) : (
            <Search className="h-5 w-5 shrink-0 text-neutral-400" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen oder Aktion … (Kunden, Leads, Aufgaben, Projekte …)"
            className="h-12 w-full border-0 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
          />
          <kbd className="hidden shrink-0 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto py-2">
          {isSearch && flat.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-400">
              {pending ? "Suche …" : `Keine Ergebnisse für „${query.trim()}".`}
            </p>
          ) : (
            sections.map((section) => (
              <div key={section.label} className="mb-1">
                <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  {section.label}
                </p>
                <ul>
                  {section.items.map((item) => {
                    runningIndex += 1;
                    const idx = runningIndex;
                    const active = idx === selected;
                    const isAction = item.id.startsWith("new-");
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setSelected(idx)}
                          onClick={item.run}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                            active ? "bg-brand-50" : "hover:bg-neutral-50",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                              active ? "bg-brand-100 text-brand-600" : "bg-neutral-100 text-neutral-400",
                            )}
                          >
                            {isAction ? <Plus className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium text-neutral-900">
                            {item.label}
                          </span>
                          {item.sub ? (
                            <span className="shrink-0 truncate text-xs text-neutral-400">{item.sub}</span>
                          ) : null}
                          {item.kbd ? (
                            <kbd className="shrink-0 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                              {item.kbd}
                            </kbd>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" /> öffnen
          </span>
          <span>↑↓ navigieren</span>
          <span>esc schliessen</span>
        </div>
      </div>
    </div>
  );
}
