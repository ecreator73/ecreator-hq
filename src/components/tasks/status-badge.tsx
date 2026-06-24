import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE_MAP = {
  gray: "neutral",
  blue: "brand",
  green: "green",
  amber: "amber",
  red: "red",
} as const;

type CatalogColor = keyof typeof TONE_MAP;

function tone(color: string | null | undefined) {
  return TONE_MAP[(color ?? "gray") as CatalogColor] ?? "neutral";
}

export function StatusBadge({
  label,
  color,
}: {
  label?: string | null;
  color?: string | null;
}) {
  return <Badge tone={tone(color)}>{label ?? "-"}</Badge>;
}

const DOT_COLOR: Record<string, string> = {
  gray: "bg-neutral-400",
  blue: "bg-brand-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function PriorityBadge({
  label,
  color,
}: {
  label?: string | null;
  color?: string | null;
}) {
  if (!label) return <span className="text-neutral-400">-</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-neutral-600">
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full",
          DOT_COLOR[color ?? "gray"] ?? "bg-neutral-400",
        )}
      />
      {label}
    </span>
  );
}
