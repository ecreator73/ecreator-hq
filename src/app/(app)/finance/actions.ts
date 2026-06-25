"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  invoicesService,
  expensesService,
  clientsService,
  monthlyFinancialsService,
} from "@/server/services";
import type { InvoiceCreateInput, InvoiceUpdateInput } from "@/lib/validation/invoices";
import type { ExpenseCreateInput, ExpenseUpdateInput } from "@/lib/validation/expenses";
import type {
  MonthlyEntryCreateInput,
  MonthlyEntryUpdateInput,
} from "@/lib/validation/monthly-financials";

const FINANCE_ROLES = ["super_admin", "ceo", "finance"] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function revalidateFinance() {
  revalidatePath("/finance", "layout");
  revalidatePath("/");
}

/* ---- Rechnungen ---- */
export async function createInvoiceAction(
  input: InvoiceCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...FINANCE_ROLES]);
    const inv = await invoicesService.create(input);
    revalidateFinance();
    return { ok: true, data: { id: inv.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateInvoiceAction(
  id: string,
  input: InvoiceUpdateInput,
): Promise<ActionResult> {
  try {
    await requireRole([...FINANCE_ROLES]);
    await invoicesService.update(id, input);
    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setInvoiceStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireRole([...FINANCE_ROLES]);
    await invoicesService.setStatus(id, status);
    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...FINANCE_ROLES]);
    await invoicesService.remove(id);
    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Kosten ---- */
export async function createExpenseAction(
  input: ExpenseCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...FINANCE_ROLES]);
    const exp = await expensesService.create(input);
    revalidateFinance();
    return { ok: true, data: { id: exp.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateExpenseAction(
  id: string,
  input: ExpenseUpdateInput,
): Promise<ActionResult> {
  try {
    await requireRole([...FINANCE_ROLES]);
    await expensesService.update(id, input);
    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...FINANCE_ROLES]);
    await expensesService.remove(id);
    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Monatsuebersicht (manuelle Monatsfinanzen) ---- */
export async function createMonthlyEntryAction(
  input: MonthlyEntryCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...FINANCE_ROLES]);
    const row = await monthlyFinancialsService.create(input);
    revalidateFinance();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateMonthlyEntryAction(
  id: string,
  input: MonthlyEntryUpdateInput,
): Promise<ActionResult> {
  try {
    await requireRole([...FINANCE_ROLES]);
    await monthlyFinancialsService.update(id, input);
    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteMonthlyEntryAction(
  id: string,
): Promise<ActionResult> {
  try {
    await requireRole([...FINANCE_ROLES]);
    await monthlyFinancialsService.remove(id);
    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function copyPreviousMonthAction(
  fromMonth: string,
  toMonth: string,
): Promise<ActionResult<{ copied: number }>> {
  try {
    await requireRole([...FINANCE_ROLES]);
    const res = await monthlyFinancialsService.copyFromMonth(fromMonth, toMonth);
    revalidateFinance();
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Optionen ---- */
export interface FinanceFormOptions {
  clients: { id: string; name: string }[];
}
export async function financeFormOptionsAction(): Promise<
  ActionResult<FinanceFormOptions>
> {
  try {
    await requireRole([...FINANCE_ROLES]);
    const clientRows = await clientsService.list().catch(() => []);
    return {
      ok: true,
      data: { clients: clientRows.map((c) => ({ id: c.id, name: c.name })) },
    };
  } catch (e) {
    return fail(e);
  }
}
