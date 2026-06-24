import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { PricingQuickCreate } from "@/components/proposals/pricing-quick-create";
import { pricingItemsService } from "@/server/services";
import type { PricingItem } from "@/types/entities";
import { PRICING_CATEGORIES, PRICING_CATEGORY_LABELS } from "@/config/catalog";
import { formatCHF } from "@/lib/utils";

export const metadata: Metadata = { title: "Preise - Proposal Engine" };

/** Reihenfolge der Kategorie-Gruppen gemaess Katalog; Unbekanntes ans Ende. */
const CATEGORY_ORDER = PRICING_CATEGORIES.map((c) => c.key);

function categoryLabel(category: string | null): string {
  if (!category) return "Ohne Kategorie";
  return (
    PRICING_CATEGORY_LABELS[category as keyof typeof PRICING_CATEGORY_LABELS] ??
    category
  );
}

function categoryRank(category: string | null): number {
  if (!category) return CATEGORY_ORDER.length + 1;
  const idx = CATEGORY_ORDER.indexOf(
    category as (typeof CATEGORY_ORDER)[number],
  );
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}

export default async function ProposalsPricingPage() {
  const items = await pricingItemsService.list().catch(() => [] as PricingItem[]);

  // Gruppierung nach Kategorie, sortiert nach Katalog-Reihenfolge, dann Name.
  const groups = new Map<string, PricingItem[]>();
  for (const item of items) {
    const key = item.category ?? "__none__";
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  const orderedGroups = Array.from(groups.entries()).sort((a, b) => {
    const ca = a[0] === "__none__" ? null : a[0];
    const cb = b[0] === "__none__" ? null : b[0];
    const rankDiff = categoryRank(ca) - categoryRank(cb);
    if (rankDiff !== 0) return rankDiff;
    return categoryLabel(ca).localeCompare(categoryLabel(cb), "de");
  });
  for (const [, list] of orderedGroups) {
    list.sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Preise"
        description="Preisvorlagen fuer Offerten und Vertraege. Beim Erstellen einer Position lassen sich diese Vorlagen wiederverwenden."
        actions={<PricingQuickCreate />}
      />

      <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Preisvorlagen — bearbeitbar nur durch Super Admin / CEO.</p>
      </div>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle>Preisvorlagen ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState
              title="Keine Preisvorlagen vorhanden"
              description="Lege wiederverwendbare Preise an, um Offerten und Vertraege schneller zu erstellen."
              action={<PricingQuickCreate />}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Kategorie</th>
                    <th className="px-4 py-2.5 text-right font-medium">Preis</th>
                    <th className="px-4 py-2.5 font-medium">Wiederkehrend</th>
                    <th className="px-4 py-2.5 font-medium">Aktiv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {orderedGroups.flatMap(([groupKey, list]) => {
                    const cat = groupKey === "__none__" ? null : groupKey;
                    const rows: ReactNode[] = [
                      <tr key={`head-${groupKey}`} className="bg-neutral-50/70">
                        <th
                          colSpan={5}
                          className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
                        >
                          {categoryLabel(cat)}
                        </th>
                      </tr>,
                    ];
                    for (const item of list) {
                      rows.push(
                        <tr key={item.id} className="align-top hover:bg-neutral-50">
                          <td className="px-4 py-2.5 font-medium text-neutral-900">
                            {item.name}
                          </td>
                          <td className="px-4 py-2.5 text-neutral-600">
                            {categoryLabel(item.category)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                            {item.unit_price != null
                              ? formatCHF(item.unit_price)
                              : "-"}
                          </td>
                          <td className="px-4 py-2.5">
                            {item.recurring ? (
                              <Badge tone="brand">monatlich</Badge>
                            ) : (
                              <Badge tone="neutral">einmalig</Badge>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {item.active ? (
                              <Badge tone="green">aktiv</Badge>
                            ) : (
                              <Badge tone="neutral">inaktiv</Badge>
                            )}
                          </td>
                        </tr>,
                      );
                    }
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
