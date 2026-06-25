import type { Metadata } from "next";
import { monthlyFinancialsService } from "@/server/services";
import type { MonthOverviewRow } from "@/server/services/monthly-financials.service";
import type { MonthlyEntry } from "@/types/entities";
import { MonthlyTable } from "@/components/finance/monthly-table";

export const metadata: Metadata = { title: "Finance - Monatsuebersicht" };

const pad = (n: number) => String(n).padStart(2, "0");

function parseMonthParam(raw: string | undefined): { y: number; m: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [ys, ms] = raw.split("-");
    const y = Number(ys);
    const m = Number(ms);
    if (Number.isFinite(y) && m >= 1 && m <= 12) return { y, m };
  }
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1 };
}

export default async function MonthlyFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const { y, m } = parseMonthParam(sp.month);

  const monthDate = `${y}-${pad(m)}-01`;
  const monthLabel = new Intl.DateTimeFormat("de-CH", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));

  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  const prevMonthParam = `${prev.y}-${pad(prev.m)}`;
  const nextMonthParam = `${next.y}-${pad(next.m)}`;
  const prevMonthDate = `${prev.y}-${pad(prev.m)}-01`;

  let entries: MonthlyEntry[] = [];
  let overview: MonthOverviewRow[] = [];
  let loadError = false;
  try {
    [entries, overview] = await Promise.all([
      monthlyFinancialsService.listForMonth(monthDate),
      monthlyFinancialsService.overview(y),
    ]);
  } catch {
    loadError = true;
    overview = Array.from({ length: 12 }, (_, i) => ({
      month: `${y}-${pad(i + 1)}-01`,
      revenue: 0,
      cost: 0,
      profit: 0,
    }));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-500">
        Manuelle Monatszahlen: trage pro Monat alle Umsaetze und Kosten direkt
        ein. Bewusst <strong>nicht</strong> an Rechnungen oder Verträge
        gekoppelt - reine Handerfassung.
      </p>

      {/* key=month -> bei Monatswechsel frisch initialisieren */}
      <MonthlyTable
        key={monthDate}
        month={monthDate}
        monthLabel={monthLabel}
        prevMonthParam={prevMonthParam}
        nextMonthParam={nextMonthParam}
        prevMonthDate={prevMonthDate}
        entries={entries}
        overview={overview}
        year={y}
        loadError={loadError}
      />
    </div>
  );
}
