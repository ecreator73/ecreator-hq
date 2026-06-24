import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatCHF } from "@/lib/utils";
import type { ForecastMonth } from "@/types/entities";

/**
 * Praesentationale Forecast-Tabelle: Monat (YYYY-MM) | Umsatz | Kosten | Gewinn.
 * Alle Geldwerte werden via formatCHF (Rappen) angezeigt; Gewinn gruen wenn >= 0,
 * sonst rot.
 */
export function ForecastTable({ months }: { months: ForecastMonth[] }) {
  if (!months || months.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Keine Forecast-Daten"
        description="Sobald wiederkehrende Vertraege und Kosten erfasst sind, erscheint hier die Vorschau."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
            <th className="px-4 py-2.5">Monat</th>
            <th className="px-4 py-2.5 text-right">Umsatz</th>
            <th className="px-4 py-2.5 text-right">Kosten</th>
            <th className="px-4 py-2.5 text-right">Gewinn</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {months.map((m) => (
            <tr key={m.month} className="hover:bg-neutral-50/60">
              <td className="px-4 py-2.5 font-medium text-neutral-900 tabular-nums">
                {m.month}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                {formatCHF(m.revenue)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                {formatCHF(m.cost)}
              </td>
              <td
                className={cn(
                  "px-4 py-2.5 text-right font-medium tabular-nums",
                  m.profit >= 0 ? "text-green-600" : "text-red-600",
                )}
              >
                {formatCHF(m.profit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
