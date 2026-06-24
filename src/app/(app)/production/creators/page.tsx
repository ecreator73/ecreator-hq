import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Trophy, CalendarClock, Layers, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StarRating } from "@/components/creators/star-rating";
import { CreatorQuickCreate } from "@/components/creators/creator-quick-create";
import { creatorsService } from "@/server/services";
import type { CreatorWithStats } from "@/types/entities";
import { CREATOR_TYPE_LABELS } from "@/config/catalog";
import { formatCHF, formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Creator-Pool - Dashboard" };

interface CreatorDashboard {
  total: number;
  active: number;
  pool: number;
  newCount: number;
  avgDayRate: number | null;
  byCanton: { canton: string; count: number }[];
  byType: { type: string; count: number }[];
  topCreators: CreatorWithStats[];
  recentlyBooked: CreatorWithStats[];
}

const EMPTY_DASHBOARD: CreatorDashboard = {
  total: 0,
  active: 0,
  pool: 0,
  newCount: 0,
  avgDayRate: null,
  byCanton: [],
  byType: [],
  topCreators: [],
  recentlyBooked: [],
};

/** Vollstaendiger Anzeigename eines Creators. */
function creatorName(c: CreatorWithStats): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "Unbenannt";
}

type WidgetTone = "neutral" | "brand" | "amber" | "green";

const TONE_STYLES: Record<WidgetTone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-700",
  amber: "text-amber-600",
  green: "text-green-600",
};

function Widget({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: WidgetTone;
}) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          TONE_STYLES[tone],
        )}
      >
        {value}
      </p>
    </>
  );
  const base =
    "block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm";
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "transition-colors hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

export default async function CreatorDashboardPage() {
  const d = await creatorsService.dashboard().catch(() => EMPTY_DASHBOARD);

  const maxCanton = Math.max(1, ...d.byCanton.map((c) => c.count));
  const maxType = Math.max(1, ...d.byType.map((t) => t.count));

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-neutral-900">
            Creator-Pool
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Talent-Datenbank im Ueberblick - Pool, Auslastung und Top-Creator.
          </p>
        </div>
        <div className="shrink-0">
          <CreatorQuickCreate />
        </div>
      </div>

      {/* KPI-Widgets */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Widget
          label="Aktive Creator"
          value={d.active}
          href="/production/creators/list?status=active"
          tone="green"
        />
        <Widget
          label="Neue Creator"
          value={d.newCount}
          href="/production/creators/list?status=new"
          tone={d.newCount > 0 ? "amber" : "neutral"}
        />
        <Widget
          label="Creator Pool"
          value={d.pool}
          href="/production/creators/list?status=pool"
          tone="brand"
        />
        <Widget
          label="Gesamt"
          value={d.total}
          href="/production/creators/list"
        />
        <Widget
          label="Durchschnittspreis / Tag"
          value={formatCHF(d.avgDayRate)}
          tone="brand"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Creator nach Region */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              Creator nach Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.byCanton.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="Keine Regionen"
                description="Sobald Creator mit Kanton erfasst sind, erscheint hier die Verteilung."
              />
            ) : (
              <ul className="space-y-3">
                {d.byCanton.map((row) => (
                  <li key={row.canton} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-neutral-800">
                        {row.canton}
                      </span>
                      <span className="tabular-nums text-neutral-500">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.round((row.count / maxCanton) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Creator nach Kategorie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              Creator nach Kategorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.byType.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="Keine Kategorien"
                description="Sobald Creator mit Creator-Typen erfasst sind, erscheint hier die Verteilung."
              />
            ) : (
              <ul className="space-y-3">
                {d.byType.map((row) => (
                  <li key={row.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-neutral-800">
                        {CREATOR_TYPE_LABELS[
                          row.type as keyof typeof CREATOR_TYPE_LABELS
                        ] ?? row.type}
                      </span>
                      <span className="tabular-nums text-neutral-500">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.round((row.count / maxType) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top Creator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              Top Creator
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.topCreators.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Noch keine Creator"
                description="Lege Creator an, um hier die Talente mit dem hoechsten Score zu sehen."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {d.topCreators.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <Link
                      href={`/production/creators/${c.id}`}
                      className="min-w-0 truncate font-medium text-neutral-900 hover:text-brand-700"
                    >
                      {creatorName(c)}
                    </Link>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-700">
                      Score {c.score}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Zuletzt gebucht */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock
                className="h-4 w-4 text-neutral-400"
                aria-hidden="true"
              />
              Zuletzt gebucht
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.recentlyBooked.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Noch keine Buchungen"
                description="Sobald Creator fuer Shootings besetzt wurden, erscheinen sie hier."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {d.recentlyBooked.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <Link
                      href={`/production/creators/${c.id}`}
                      className="min-w-0 truncate font-medium text-neutral-900 hover:text-brand-700"
                    >
                      {creatorName(c)}
                    </Link>
                    <span className="shrink-0 text-sm tabular-nums text-neutral-500">
                      {c.last_booked ? formatDate(c.last_booked) : "-"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
