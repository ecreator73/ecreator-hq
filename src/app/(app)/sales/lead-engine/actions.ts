"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  leadCompaniesService,
  leadSourcesService,
} from "@/server/services";
import type {
  LeadCompanyCreateInput,
  LeadCompanyUpdateInput,
  LeadSourceCreateInput,
} from "@/lib/validation/lead-engine";

const LEAD_ROLES = ["super_admin", "ceo", "cso", "sales"] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function revalidate(id?: string) {
  revalidatePath("/sales/lead-engine", "layout");
  revalidatePath("/");
  if (id) revalidatePath(`/sales/lead-engine/${id}`);
}

/* ---- Firmen ---- */
export async function createLeadCompanyAction(
  input: LeadCompanyCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...LEAD_ROLES]);
    const c = await leadCompaniesService.create(input);
    revalidate();
    return { ok: true, data: { id: c.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateLeadCompanyAction(
  id: string,
  input: LeadCompanyUpdateInput,
): Promise<ActionResult> {
  try {
    await requireRole([...LEAD_ROLES]);
    await leadCompaniesService.update(id, input);
    revalidate(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setWatchlistStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireRole([...LEAD_ROLES]);
    await leadCompaniesService.setWatchlistStatus(id, status);
    revalidate(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function recomputeLeadCompanyAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...LEAD_ROLES]);
    await leadCompaniesService.recompute(id);
    revalidate(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function handoverLeadCompanyAction(
  id: string,
): Promise<ActionResult<{ leadId: string }>> {
  try {
    await requireRole([...LEAD_ROLES]);
    const res = await leadCompaniesService.handover(id);
    revalidate(id);
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteLeadCompanyAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...LEAD_ROLES]);
    await leadCompaniesService.remove(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function bulkImportLeadCompaniesAction(
  rows: LeadCompanyCreateInput[],
): Promise<ActionResult<{ created: number; skipped: number; errors: { row: number; error: string }[] }>> {
  try {
    await requireRole([...LEAD_ROLES]);
    const res = await leadCompaniesService.bulkImport(rows);
    revalidate();
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Quellen ---- */
export async function createLeadSourceAction(
  input: LeadSourceCreateInput,
): Promise<ActionResult> {
  try {
    await requireRole([...LEAD_ROLES]);
    await leadSourcesService.create(input);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteLeadSourceAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...LEAD_ROLES]);
    await leadSourcesService.remove(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Optionen ---- */
export interface LeadEngineFormOptions {
  sources: { id: string; name: string }[];
}
export async function leadEngineFormOptionsAction(): Promise<
  ActionResult<LeadEngineFormOptions>
> {
  try {
    await requireRole([...LEAD_ROLES]);
    const sources = await leadSourcesService.list().catch(() => []);
    return { ok: true, data: { sources: sources.map((s) => ({ id: s.id, name: s.name })) } };
  } catch (e) {
    return fail(e);
  }
}
