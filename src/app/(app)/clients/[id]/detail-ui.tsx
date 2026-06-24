"use client";

import type { ReactNode } from "react";
import { STATUS_REGISTRY, type StatusEntity } from "@/config/catalog";

export type TabKey =
  | "overview"
  | "projects"
  | "tasks"
  | "reporting"
  | "contracts"
  | "files"
  | "finance"
  | "activity"
  | "notes";

/**
 * Geteiltes Design-Vokabular der Client Detail Page. Sorgt fuer ein
 * konsistentes, ruhiges Premium-Layout ueber alle Tabs (Attio/Linear-Anmutung).
 */

/** Catalog-Farbe (gray|blue|green|amber|red) fuer einen Status -> StatusBadge. */
export function statusColorOf(entity: StatusEntity, key: string | null): string | undefined {
  if (!key) return undefined;
  const map = STATUS_REGISTRY[entity] as Record<string, { color?: string }> | undefined;
  return map?.[key]?.color;
}

/** Titelbare Karten-Sektion mit optionaler Aktion rechts. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        "rounded-xl border border-neutral-200 bg-white shadow-sm " + (className ?? "")
      }
    >
      {title || action ? (
        <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title ? (
              <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
            ) : null}
            {description ? (
              <p className="mt-0.5 truncate text-xs text-neutral-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

/** Dezente Leerzeile innerhalb einer Sektion. */
export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-sm text-neutral-400">{children}</p>
  );
}

/** Kompakte Beschriftung + Wert (fuer Detail-Raster). */
export function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-neutral-800">{children}</dd>
    </div>
  );
}

/** Listenzeile (anklickbar/statisch) mit konsistentem Innenabstand. */
export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li
      className={
        "flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-neutral-50/60 " +
        (className ?? "")
      }
    >
      {children}
    </li>
  );
}

/** Umrandete Liste (Container fuer Row). */
export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200">
      {children}
    </ul>
  );
}

export function formatBytes(n: number | null | undefined): string {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
