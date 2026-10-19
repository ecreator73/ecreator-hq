import * as React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CircleAlert, CircleCheck, CircleDashed, Clock3, Minus, PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtPct, trend } from "@/lib/marketing/format";
import { formatAgo } from "@/lib/marketing/range";
import type { SourceStatus } from "@/server/marketing/dashboard.service";

/* Ruhige, datenfokussierte Bausteine: feine Linien, keine Verlaeufe. */

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-neutral-200 bg-white", className)}>
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-neutral-500">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Delta({ cur, prev, inverse = false }: { cur: number | null | undefined; prev: number | null | undefined; inverse?: boolean }) {
  const t = trend(cur, prev);
  if (t == null) return <span className="text-[11px] text-neutral-400">kein Vergleich</span>;
  const up = t > 0.0005;
  const down = t < -0.0005;
  const good = inverse ? down : up;
  const bad = inverse ? up : down;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums", good ? "text-emerald-700" : bad ? "text-rose-700" : "text-neutral-500")}>
      <Icon className="h-3 w-3" aria-hidden />
      {up ? "+" : ""}
      {fmtPct(t)}
    </span>
  );
}

/** KPI-Kachel. `value` = formatierter Wert; `missing` zeigt statt eines Werts den Grund. */
export function Kpi({
  label,
  value,
  cur,
  prev,
  hint,
  missing,
  inverse,
  compare = true,
}: {
  label: string;
  value: string;
  cur?: number | null;
  prev?: number | null;
  hint?: string;
  missing?: string | null;
  inverse?: boolean;
  compare?: boolean;
}) {
  return (
    <div className="flex min-h-[96px] flex-col justify-between rounded-lg border border-neutral-200 bg-white px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      {missing ? (
        <p className="mt-2 text-xs leading-snug text-neutral-400">{missing}</p>
      ) : (
        <div className="mt-1.5">
          <p className="text-xl font-semibold tabular-nums tracking-tight text-neutral-900">{value}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
            {compare ? <Delta cur={cur} prev={prev} inverse={inverse} /> : null}
            {hint ? <span className="text-[11px] text-neutral-400">{hint}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{children}</div>;
}

/** Hinweis «Integration erforderlich» mit Link zur Einrichtung. */
export function SetupRequired({ title = "Integration erforderlich", detail, href = "/marketing/integrations" }: { title?: string; detail?: string; href?: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/70 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        <div>
          <p className="text-sm font-medium text-neutral-800">{title}</p>
          {detail ? <p className="mt-0.5 text-xs text-neutral-500">{detail}</p> : null}
        </div>
      </div>
      <Link href={href} className="text-xs font-medium text-brand-700 hover:underline">
        Einrichtung ansehen
      </Link>
    </div>
  );
}

export function NoData({ text = "Keine Daten verfügbar", detail }: { text?: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-8 text-center">
      <p className="text-sm text-neutral-600">{text}</p>
      {detail ? <p className="mt-1 text-xs text-neutral-400">{detail}</p> : null}
    </div>
  );
}

export function SourceBadge({ status }: { status: SourceStatus }) {
  const map = {
    connected: { Icon: CircleCheck, cls: "text-emerald-700 bg-emerald-50 border-emerald-100", text: "Verbunden" },
    pending: { Icon: Clock3, cls: "text-amber-700 bg-amber-50 border-amber-100", text: "Daten werden synchronisiert" },
    error: { Icon: CircleAlert, cls: "text-rose-700 bg-rose-50 border-rose-100", text: "Fehler" },
    setup_required: { Icon: CircleDashed, cls: "text-neutral-600 bg-neutral-50 border-neutral-200", text: "Integration erforderlich" },
  } as const;
  const m = map[status.state];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", m.cls)}>
      <m.Icon className="h-3 w-3" aria-hidden />
      {m.text}
    </span>
  );
}

/** Frische-Anzeige: «zuletzt synchronisiert vor 15 Min.» */
export function Freshness({ statuses }: { statuses: SourceStatus[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
      {statuses.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              s.state === "connected" ? "bg-emerald-500" : s.state === "error" ? "bg-rose-500" : s.state === "pending" ? "bg-amber-500" : "bg-neutral-300",
            )}
            aria-hidden
          />
          <span className="font-medium text-neutral-700">{s.label}</span>
          {s.state === "setup_required"
            ? "Integration erforderlich"
            : s.key === "website" || s.key === "calendly"
              ? s.lastEventAt
                ? `letztes Ereignis ${formatAgo(s.lastEventAt)}`
                : "noch kein Ereignis"
              : s.lastSyncAt
                ? `synchronisiert ${formatAgo(s.lastSyncAt)}`
                : s.state === "error"
                  ? "Fehler"
                  : "Daten werden synchronisiert"}
        </span>
      ))}
    </div>
  );
}

export function Note({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" }) {
  return (
    <p className={cn("rounded-md px-3 py-2 text-xs leading-relaxed", tone === "warning" ? "bg-amber-50 text-amber-800" : "bg-neutral-50 text-neutral-600")}>
      {children}
    </p>
  );
}

export function SchemaMissing() {
  return (
    <SetupRequired
      title="Datenbank-Migration 0023 fehlt"
      detail="supabase/migrations/0023_marketing_intelligence.sql im Supabase-SQL-Editor ausführen. Bis dahin sind keine Marketing-Daten verfügbar."
      href="/marketing/health"
    />
  );
}
