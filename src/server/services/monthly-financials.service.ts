import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  monthlyEntryInsertSchema,
  monthlyEntryUpdateSchema,
  type MonthlyEntryCreateInput,
  type MonthlyEntryUpdateInput,
} from "@/lib/validation/monthly-financials";
import type { MonthlyEntry } from "@/types/entities";

/** Aggregat pro Monat fuer die Jahresuebersicht (Geldwerte in Rappen). */
export interface MonthOverviewRow {
  month: string; // YYYY-MM-01
  revenue: number;
  cost: number;
  profit: number;
}

function firstOfMonth(year: number, month1to12: number): string {
  return `${year}-${String(month1to12).padStart(2, "0")}-01`;
}

/**
 * Manuelle Monatsfinanzen. Bewusst entkoppelt von Rechnungen/Verträgen -
 * reine Handerfassung von Umsaetzen und Kosten pro Monat.
 */
export const monthlyFinancialsService = {
  /** Alle Posten eines Monats (YYYY-MM-01), Umsaetze + Kosten sortiert. */
  async listForMonth(month: string): Promise<MonthlyEntry[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("monthly_financials")
      .select("*")
      .eq("month", month)
      .is("deleted_at", null)
      .order("kind", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error)
      throw new ServiceError("Monatsdaten konnten nicht geladen werden", error);
    return (data ?? []) as unknown as MonthlyEntry[];
  },

  /** Jahresuebersicht: 12 Zeilen (Jan-Dez) mit Umsatz/Kosten/Gewinn. */
  async overview(year: number): Promise<MonthOverviewRow[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("monthly_financials")
      .select("month, kind, amount")
      .gte("month", firstOfMonth(year, 1))
      .lte("month", firstOfMonth(year, 12))
      .is("deleted_at", null);
    if (error)
      throw new ServiceError("Jahresuebersicht konnte nicht geladen werden", error);

    const map = new Map<string, { revenue: number; cost: number }>();
    for (let m = 1; m <= 12; m++) map.set(firstOfMonth(year, m), { revenue: 0, cost: 0 });
    for (const r of (data ?? []) as Array<{
      month: string;
      kind: string;
      amount: number | null;
    }>) {
      const key = String(r.month).slice(0, 10);
      const bucket = map.get(key);
      if (!bucket) continue;
      if (r.kind === "revenue") bucket.revenue += r.amount ?? 0;
      else bucket.cost += r.amount ?? 0;
    }
    return [...map.entries()].map(([month, v]) => ({
      month,
      revenue: v.revenue,
      cost: v.cost,
      profit: v.revenue - v.cost,
    }));
  },

  async create(input: MonthlyEntryCreateInput): Promise<MonthlyEntry> {
    const parsed = monthlyEntryInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("monthly_financials")
      .insert(parsed)
      .select("*")
      .single();
    if (error)
      throw new ServiceError("Posten konnte nicht erstellt werden", error);
    const row = data as unknown as MonthlyEntry;
    await recordAudit({
      action: "create",
      entityType: "monthly_financial",
      entityId: row.id,
      newValues: row,
    });
    return row;
  },

  async update(
    id: string,
    input: MonthlyEntryUpdateInput,
  ): Promise<MonthlyEntry> {
    const parsed = monthlyEntryUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("monthly_financials")
      .update(parsed)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error)
      throw new ServiceError("Posten konnte nicht aktualisiert werden", error);
    const row = data as unknown as MonthlyEntry;
    await recordAudit({
      action: "update",
      entityType: "monthly_financial",
      entityId: id,
      newValues: row,
    });
    return row;
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("monthly_financials")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error)
      throw new ServiceError("Posten konnte nicht geloescht werden", error);
    await recordAudit({
      action: "delete",
      entityType: "monthly_financial",
      entityId: id,
    });
  },

  /**
   * Kopiert alle Posten aus einem Monat in einen anderen. Posten, deren
   * (kind, label) im Zielmonat schon existieren, werden uebersprungen
   * (idempotent gegen versehentliches Doppelklicken).
   */
  async copyFromMonth(
    fromMonth: string,
    toMonth: string,
  ): Promise<{ copied: number }> {
    const { supabase } = await getContext();
    const [{ data: source }, { data: target }] = await Promise.all([
      supabase
        .from("monthly_financials")
        .select("kind, label, amount, category, note, sort_order")
        .eq("month", fromMonth)
        .is("deleted_at", null),
      supabase
        .from("monthly_financials")
        .select("kind, label")
        .eq("month", toMonth)
        .is("deleted_at", null),
    ]);

    const existing = new Set(
      ((target ?? []) as Array<{ kind: string; label: string }>).map(
        (t) => `${t.kind}::${t.label.trim().toLowerCase()}`,
      ),
    );
    const rows = ((source ?? []) as Array<{
      kind: string;
      label: string;
      amount: number | null;
      category: string | null;
      note: string | null;
      sort_order: number | null;
    }>)
      .filter(
        (s) => !existing.has(`${s.kind}::${s.label.trim().toLowerCase()}`),
      )
      .map((s) => ({
        month: toMonth,
        kind: s.kind,
        label: s.label,
        amount: s.amount ?? 0,
        category: s.category,
        note: s.note,
        sort_order: s.sort_order ?? 0,
      }));

    if (rows.length === 0) return { copied: 0 };
    const { error } = await supabase.from("monthly_financials").insert(rows);
    if (error)
      throw new ServiceError("Vormonat konnte nicht uebernommen werden", error);
    return { copied: rows.length };
  },
};
