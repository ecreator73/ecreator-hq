"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { websiteAuditsService, leadCompaniesService } from "@/server/services";
import type { AuditCreateInput } from "@/lib/validation/website-audit";

const ROLES = ["super_admin", "ceo", "cso", "sales"] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function rv(id?: string) {
  revalidatePath("/sales/audits", "layout");
  revalidatePath("/");
  if (id) revalidatePath(`/sales/audits/${id}`);
}

export async function createAuditAction(
  input: AuditCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...ROLES]);
    const a = await websiteAuditsService.create(input);
    rv();
    return { ok: true, data: { id: a.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function generateAuditAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await websiteAuditsService.generate(id);
    rv(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAuditAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await websiteAuditsService.remove(id);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export interface AuditFormOptions {
  companies: { id: string; name: string; website: string | null }[];
}
export async function auditFormOptionsAction(): Promise<ActionResult<AuditFormOptions>> {
  try {
    await requireRole([...ROLES]);
    const companies = await leadCompaniesService.list({}).catch(() => []);
    return {
      ok: true,
      data: { companies: companies.map((c) => ({ id: c.id, name: c.name, website: c.website })) },
    };
  } catch (e) {
    return fail(e);
  }
}
