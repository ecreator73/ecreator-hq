import Link from "next/link";
import { MapPin, Coins } from "lucide-react";
import { CREATOR_STATUSES, statusLabel } from "@/config/catalog";
import { StatusBadge } from "@/components/tasks/status-badge";
import { StarRating } from "@/components/creators/star-rating";
import { formatCHF, cn } from "@/lib/utils";
import type { CreatorWithStats } from "@/types/entities";

// Farbe je Status-Key (fuer Status-Badge).
const COLOR_MAP = new Map<string, string>(
  CREATOR_STATUSES.map((s) => [s.key, s.color]),
);

function scoreTone(score: number): string {
  if (score >= 70) return "bg-green-50 text-green-700 border-green-100";
  if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-neutral-100 text-neutral-600 border-neutral-200";
}

function fullName(creator: CreatorWithStats): string {
  return [creator.first_name, creator.last_name].filter(Boolean).join(" ").trim();
}

function region(creator: CreatorWithStats): string | null {
  const parts = [creator.city, creator.canton].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/**
 * Praesentationale Creator-Karte fuer die Pipeline (und andere Listen).
 * Folgt sales/lead-card.tsx: Link mit draggable={false}, damit ein
 * umschliessendes draggable-Element das Drag steuern kann.
 */
export function CreatorCard({ creator }: { creator: CreatorWithStats }) {
  const place = region(creator);
  return (
    <Link
      href={`/production/creators/${creator.id}`}
      draggable={false}
      className="block rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-colors hover:border-brand-300"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-neutral-900">
          {fullName(creator) || "Unbenannt"}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold",
            scoreTone(creator.score),
          )}
          title="Score"
        >
          {creator.score}
        </span>
      </div>

      <div className="mt-1.5">
        <StatusBadge
          label={statusLabel("creator", creator.status)}
          color={COLOR_MAP.get(creator.status)}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-neutral-500">
        {place ? (
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{place}</span>
          </span>
        ) : (
          <span />
        )}
        {creator.full_day_rate != null ? (
          <span className="inline-flex shrink-0 items-center gap-1">
            <Coins className="h-3.5 w-3.5" />
            {formatCHF(creator.full_day_rate)}
          </span>
        ) : null}
      </div>

      {creator.rating_avg != null ? (
        <div className="mt-2">
          <StarRating value={creator.rating_avg} size="sm" />
        </div>
      ) : null}
    </Link>
  );
}
