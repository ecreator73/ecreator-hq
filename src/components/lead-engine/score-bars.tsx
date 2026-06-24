import { Badge } from "@/components/ui/badge";
import { leadScoreLevel } from "@/config/catalog";
import { cn } from "@/lib/utils";
import type { LeadCompanyWithStats } from "@/types/entities";

type BadgeTone = "neutral" | "brand" | "green" | "amber" | "red";

// leadScoreLevel liefert StatusColor (red/amber/blue/gray/green) — auf Badge-Tone mappen.
const TONE_MAP: Record<string, BadgeTone> = {
  red: "red",
  amber: "amber",
  blue: "brand",
  gray: "neutral",
  green: "green",
};

const BAR_TONE: Record<string, string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-brand-500",
  green: "bg-green-500",
  gray: "bg-neutral-400",
};

const ROWS: { key: keyof LeadCompanyWithStats; label: string }[] = [
  { key: "website_score", label: "Website" },
  { key: "ads_score", label: "Ads" },
  { key: "content_score", label: "Content" },
  { key: "recruiting_score", label: "Recruiting" },
  { key: "crm_score", label: "CRM" },
];

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function barTone(score: number) {
  return BAR_TONE[leadScoreLevel(score).tone] ?? BAR_TONE.gray;
}

/**
 * Praesentationale Score-Uebersicht: 5 horizontale Balken (Website/Ads/Content/
 * Recruiting/CRM) plus Gesamt-Badge ueber leadScoreLevel(overall_score).
 */
export function ScoreBars({ company }: { company: LeadCompanyWithStats }) {
  const overall = clamp(company.overall_score);
  const level = leadScoreLevel(overall);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-neutral-700">Gesamt-Score</span>
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-neutral-900">
            {overall}
          </span>
          <Badge tone={TONE_MAP[level.tone] ?? "neutral"}>{level.label}</Badge>
        </span>
      </div>
      <ul className="space-y-2">
        {ROWS.map((row) => {
          const score = clamp(Number(company[row.key] ?? 0));
          return (
            <li key={row.key} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs font-medium text-neutral-500">
                {row.label}
              </span>
              <span
                className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${row.label}-Score ${score} von 100`}
              >
                <span
                  className={cn("block h-full rounded-full", barTone(score))}
                  style={{ width: `${score}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-neutral-700">
                {score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
