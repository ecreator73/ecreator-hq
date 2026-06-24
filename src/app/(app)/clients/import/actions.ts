"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { importService } from "@/server/services";
import type {
  CustomerImportOptions,
  CustomerPreview,
  ImportResult,
} from "@/server/services";

/**
 * Server Actions des Import-Systems. Import/Bulk-Edit sind machtvolle Massen-
 * operationen -> Rollen-Guard zusaetzlich zur RLS. Finance-Import nur fuer
 * finance-berechtigte Rollen.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const IMPORT_ROLES = ["super_admin", "ceo", "cso"] as const;
const FINANCE_ROLES = ["super_admin", "ceo", "finance"] as const;

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}

function rv() {
  revalidatePath("/clients", "layout");
  revalidatePath("/finance", "layout");
  revalidatePath("/");
}

type Raw = Record<string, string>;
type Mapping = Record<string, string>;

export async function previewCustomersAction(
  rawRows: Raw[],
  mapping: Mapping,
  options: CustomerImportOptions,
): Promise<ActionResult<CustomerPreview>> {
  try {
    await requireRole([...IMPORT_ROLES]);
    const data = await importService.previewCustomers(rawRows, mapping, options);
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

export async function importCustomersAction(
  rawRows: Raw[],
  mapping: Mapping,
  options: CustomerImportOptions,
): Promise<ActionResult<ImportResult>> {
  try {
    await requireRole([...IMPORT_ROLES]);
    const data = await importService.importCustomers(rawRows, mapping, options);
    rv();
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

export async function importContractsAction(
  rawRows: Raw[],
  mapping: Mapping,
): Promise<ActionResult<ImportResult>> {
  try {
    await requireRole([...IMPORT_ROLES]);
    const data = await importService.importContracts(rawRows, mapping);
    rv();
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

export async function importInvoicesAction(
  rawRows: Raw[],
  mapping: Mapping,
): Promise<ActionResult<ImportResult>> {
  try {
    await requireRole([...FINANCE_ROLES]);
    const data = await importService.importInvoices(rawRows, mapping);
    rv();
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

export async function bulkUpdateClientsAction(
  ids: string[],
  patch: { status?: string; account_manager_id?: string | null },
): Promise<ActionResult<{ updated: number; errors: { id: string; error: string }[] }>> {
  try {
    await requireRole([...IMPORT_ROLES]);
    const data = await importService.bulkUpdateClients(ids, patch);
    rv();
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

export async function bulkUpdateContractsAction(
  ids: string[],
  patch: { status?: string },
): Promise<ActionResult<{ updated: number; errors: { id: string; error: string }[] }>> {
  try {
    await requireRole([...IMPORT_ROLES]);
    const data = await importService.bulkUpdateContracts(ids, patch);
    rv();
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}
