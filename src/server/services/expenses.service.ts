import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  expenseInsertSchema,
  expenseUpdateSchema,
  type ExpenseCreateInput,
  type ExpenseUpdateInput,
} from "@/lib/validation/expenses";
import type { Expense } from "@/types/entities";

export interface ExpenseFilters {
  category?: string;
  recurring?: boolean;
  from?: string;
  to?: string;
  search?: string;
}

export const expensesService = {
  async list(filters: ExpenseFilters = {}): Promise<Expense[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("expenses")
      .select("*")
      .is("deleted_at", null)
      .order("date", { ascending: false, nullsFirst: false });
    if (filters.category) q = q.eq("category", filters.category);
    if (filters.recurring != null) q = q.eq("recurring", filters.recurring);
    if (filters.from) q = q.gte("date", filters.from);
    if (filters.to) q = q.lte("date", filters.to);
    if (filters.search) q = q.ilike("title", `%${filters.search.trim()}%`);
    const { data, error } = await q.limit(1000);
    if (error) throw new ServiceError("Kosten konnten nicht geladen werden", error);
    return (data ?? []) as unknown as Expense[];
  },

  async getById(id: string): Promise<Expense | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Kostenposition konnte nicht geladen werden", error);
    return (data as unknown as Expense) ?? null;
  },

  async create(input: ExpenseCreateInput): Promise<Expense> {
    const parsed = expenseInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("expenses")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Kostenposition konnte nicht erstellt werden", error);
    const row = data as unknown as Expense;
    await recordAudit({ action: "create", entityType: "expense", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: ExpenseUpdateInput): Promise<Expense> {
    const parsed = expenseUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("expenses")
      .update(parsed)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw new ServiceError("Kostenposition konnte nicht aktualisiert werden", error);
    const row = data as unknown as Expense;
    await recordAudit({ action: "update", entityType: "expense", entityId: id, newValues: row });
    return row;
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Kostenposition konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "expense", entityId: id });
  },
};
