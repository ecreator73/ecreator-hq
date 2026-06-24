import { Badge } from "@/components/ui/badge";
import type { ClientWarning } from "@/types/entities";

const TONE_BY_SEVERITY: Record<
  ClientWarning["severity"],
  "red" | "amber" | "neutral"
> = {
  danger: "red",
  warn: "amber",
  info: "neutral",
};

/** Rendert Kunden-Warnungen als farbige Badges. Nichts, wenn die Liste leer ist. */
export function ClientWarnings({ warnings }: { warnings: ClientWarning[] }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {warnings.map((w, i) => (
        <Badge key={`${w.type}-${i}`} tone={TONE_BY_SEVERITY[w.severity] ?? "neutral"}>
          {w.label}
        </Badge>
      ))}
    </div>
  );
}
