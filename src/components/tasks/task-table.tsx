"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, PriorityBadge } from "@/components/tasks/status-badge";
import { TASK_STATUSES, PRIORITIES } from "@/config/catalog";
import { formatDate, cn } from "@/lib/utils";
import {
  updateTaskAction,
  deleteTaskAction,
  type TaskFormOptions,
} from "@/app/(app)/tasks/actions";
import type { TaskWithRelations } from "@/types/entities";

const selectClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function TaskTable({
  rows,
  total,
  page,
  pageSize,
  options,
}: {
  rows: TaskWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  options: TaskFormOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState(sp.get("search") ?? "");
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Debounced Suche -> URL
  useEffect(() => {
    const current = sp.get("search") ?? "";
    if (searchInput === current) return;
    const t = setTimeout(() => setParam("search", searchInput || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, sp]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(Array.from(sp.entries()));
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleSort(col: string) {
    const params = new URLSearchParams(Array.from(sp.entries()));
    const curSort = sp.get("sort");
    const curDir = sp.get("dir") ?? "asc";
    if (curSort === col) params.set("dir", curDir === "asc" ? "desc" : "asc");
    else {
      params.set("sort", col);
      params.set("dir", "asc");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function bulk(kind: "done" | "delete") {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkError(null);
    startTransition(async () => {
      const results = await Promise.all(
        ids.map((id) =>
          kind === "done"
            ? updateTaskAction(id, { status: "done" })
            : deleteTaskAction(id),
        ),
      );
      const failed = ids.filter((_, i) => !results[i].ok);
      if (failed.length) {
        setBulkError(
          `${failed.length} von ${ids.length} Aktion(en) fehlgeschlagen.`,
        );
        setSelected(new Set(failed));
      } else {
        setSelected(new Set());
      }
      router.refresh();
    });
  }

  const hasFilters = ["search", "status", "priority", "client", "project", "assignee"].some(
    (k) => sp.get(k),
  );

  return (
    <div className="space-y-3">
      {/* Filterleiste */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Suche Titel, Beschreibung, Kunde, Projekt ..."
            className="h-9 w-72 rounded-lg border border-neutral-300 bg-white pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <select
          value={sp.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value || null)}
          className={selectClass}
        >
          <option value="">Alle Status</option>
          {TASK_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={sp.get("priority") ?? ""}
          onChange={(e) => setParam("priority", e.target.value || null)}
          className={selectClass}
        >
          <option value="">Alle Prioritaeten</option>
          {PRIORITIES.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={sp.get("client") ?? ""}
          onChange={(e) => setParam("client", e.target.value || null)}
          className={selectClass}
        >
          <option value="">Alle Kunden</option>
          {options.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={sp.get("project") ?? ""}
          onChange={(e) => setParam("project", e.target.value || null)}
          className={selectClass}
        >
          <option value="">Alle Projekte</option>
          {options.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <select
          value={sp.get("assignee") ?? ""}
          onChange={(e) => setParam("assignee", e.target.value || null)}
          className={selectClass}
        >
          <option value="">Alle Verantwortlichen</option>
          {options.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? "Unbenannt"}
            </option>
          ))}
        </select>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
            Zuruecksetzen
          </button>
        ) : null}
      </div>

      {/* Bulk-Leiste */}
      {selected.size > 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
          <span className="font-medium text-brand-800">
            {selected.size} ausgewaehlt
          </span>
          <Button size="sm" variant="secondary" onClick={() => bulk("done")} disabled={pending}>
            Als erledigt markieren
          </Button>
          <Button size="sm" variant="danger" onClick={() => bulk("delete")} disabled={pending}>
            Loeschen
          </Button>
          {pending ? <Loader2 className="h-4 w-4 animate-spin text-brand-600" /> : null}
          {bulkError ? (
            <span className="font-medium text-red-600">{bulkError}</span>
          ) : null}
        </div>
      ) : null}

      {/* Tabelle */}
      {rows.length === 0 ? (
        <EmptyState
          title="Keine Aufgaben gefunden"
          description="Passe die Filter an oder erstelle eine neue Aufgabe."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Alle auswaehlen"
                  />
                </th>
                <SortHeader label="Titel" col="title" sp={sp} onClick={toggleSort} />
                <th className="px-4 py-2.5 font-medium">Kunde / Projekt</th>
                <th className="px-4 py-2.5 font-medium">Verantwortlich</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Prioritaet</th>
                <SortHeader label="Faellig" col="due_date" sp={sp} onClick={toggleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleOne(t.id)}
                      aria-label={`${t.title} auswaehlen`}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/tasks/${t.id}`}
                      className="font-medium text-neutral-900 hover:text-brand-700"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">
                    {[t.client?.name, t.project?.title]
                      .filter(Boolean)
                      .join(" · ") || "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    {t.assignee ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar
                          name={t.assignee.full_name ?? "?"}
                          className="h-6 w-6 text-[10px]"
                        />
                        <span className="text-neutral-600">
                          {t.assignee.full_name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge label={t.status?.label} color={t.status?.color} />
                  </td>
                  <td className="px-4 py-2.5">
                    <PriorityBadge
                      label={t.priority?.label}
                      color={t.priority?.color}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">
                    {t.due_date ? formatDate(t.due_date) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          {total} Aufgabe(n) · Seite {page} / {totalPages}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setParam("page", String(page + 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  col,
  sp,
  onClick,
}: {
  label: string;
  col: string;
  sp: URLSearchParams;
  onClick: (col: string) => void;
}) {
  const active = sp.get("sort") === col;
  return (
    <th className="px-4 py-2.5 font-medium">
      <button
        type="button"
        onClick={() => onClick(col)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-neutral-700",
          active && "text-brand-700",
        )}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );
}
