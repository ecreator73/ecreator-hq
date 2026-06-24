"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { executiveAlertsService, companyGoalsService } from "@/server/services";
import type { ExecutiveAlertCreateInput, CompanyGoalCreateInput, CompanyGoalUpdateInput } from "@/lib/validation/executive";

const ROLES = ["super_admin", "ceo", "cso"] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function rv() {
  revalidatePath("/executive", "layout");
}

/* ---- Alerts ---- */
export async function createExecutiveAlertAction(input: ExecutiveAlertCreateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await executiveAlertsService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function resolveExecutiveAlertAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await executiveAlertsService.resolve(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteExecutiveAlertAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await executiveAlertsService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Goals ---- */
export async function createGoalAction(input: CompanyGoalCreateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await companyGoalsService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function updateGoalAction(id: string, input: CompanyGoalUpdateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await companyGoalsService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteGoalAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await companyGoalsService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
