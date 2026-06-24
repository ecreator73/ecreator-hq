import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/finance/kpi-card";
import { ExpenseQuickCreate } from "@/components/finance/expense-quick-create";
import { expensesService } from "@/server/services";
import type { ExpenseFilters } from "@/server/services";
import type { Expense } from "@/types/entities";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  RECURRING_FREQUENCY_LABELS,
} from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import { recurringMonthlyAmount } from "@/lib/finance";

export const metadata: Metadata = { title: "Finance - Kosten" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

function categoryLabel(category: string | null): string {
  if (!category) return "-";
  return (
    EXPENSE_CATEGORY_LABELS[
      category as keyof typeof EXPENSE_CATEGORY_LABELS
    ] ?? category
  );
}

function frequencyLabel(frequency: string | null): string {
  if (!frequency) return "Wiederkehrend";
  return (
    RECURRING_FREQUENCY_LABELS[
      frequency as keyof typeof RECURRING_FREQUENCY_LABELS
    ] ?? frequency
  );
}

const selectClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-56";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; recurring?: string }>;
}) {
  const sp = (await searchParams) as SP;
  const category = one(sp.category) ?? "";
  const onlyRecurring = one(sp.recurring) === "true";

  const filters: ExpenseFilters = {
    category: category || undefined,
    recurring: onlyRecurring ? true : undefined,
  };

  let expenses: Expense[] = [];
  try {
    expenses = await expensesService.list(filters);
  } catch {
    expenses = [];
  }

  // Summen fuer die aktuelle Liste.
  const totalAmount = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const recurringPerMonth = expenses
    .filter((e) => e.recurring)
    .reduce(
      (s, e) => s + recurringMonthlyAmount(e.amount, e.recurring_frequency),
      0,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Betriebliche Ausgaben nach Kategorie - einmalig oder wiederkehrend.
        </p>
        <ExpenseQuickCreate />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Kosten gesamt (Liste)"
          value={formatCHF(totalAmount)}
          sublabel={`${expenses.length} Position${
            expenses.length === 1 ? "" : "en"
          }`}
        />
        <KpiCard
          label="Wiederkehrend / Monat"
          value={formatCHF(recurringPerMonth)}
          sublabel="Monatliches Aequivalent der wiederkehrenden Kosten"
          tone="amber"
        />
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Kosten ({expenses.length})</CardTitle>
          </div>
          <form
            method="get"
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <label
                htmlFor="category"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500"
              >
                Kategorie
              </label>
              <select
                id="category"
                name="category"
                defaultValue={category}
                className={selectClass}
              >
                <option value="">Alle Kategorien</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 shadow-sm">
              <input
                type="checkbox"
                name="recurring"
                value="true"
                defaultChecked={onlyRecurring}
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-100"
              />
              Nur wiederkehrend
            </label>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
            >
              Filtern
            </button>
            {category || onlyRecurring ? (
              <a
                href="/finance/expenses"
                className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
              >
                Zuruecksetzen
              </a>
            ) : null}
          </form>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <EmptyState
              title="Keine Kosten gefunden"
              description="Es gibt keine Kostenpositionen, die zu den aktuellen Filtern passen. Passe die Filter an oder erfasse eine neue Position."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Titel</th>
                    <th className="px-4 py-2.5 font-medium">Kategorie</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Betrag
                    </th>
                    <th className="px-4 py-2.5 font-medium">Wiederkehrend</th>
                    <th className="px-4 py-2.5 font-medium">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {expenses.map((e) => (
                    <tr key={e.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">
                        {e.title}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone="neutral">{categoryLabel(e.category)}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {formatCHF(e.amount ?? 0)}
                      </td>
                      <td className="px-4 py-2.5">
                        {e.recurring ? (
                          <Badge tone="amber">
                            {frequencyLabel(e.recurring_frequency)}
                          </Badge>
                        ) : (
                          <span className="text-neutral-400">einmalig</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {e.date ? formatDate(e.date) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
