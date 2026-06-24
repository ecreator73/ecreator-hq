"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  growthService,
  upsellService,
  referralService,
  reviewService,
  renewalsService,
  churnService,
  testimonialsService,
  clientsService,
} from "@/server/services";
import type { TestimonialCreateInput, TestimonialUpdateInput, ReviewRequestCreateInput } from "@/lib/validation/growth";

const ROLES = ["super_admin", "ceo", "cso", "sales"] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function rv() {
  revalidatePath("/clients/growth", "layout");
  revalidatePath("/");
}

/* ---- Scan / Generate ---- */
export async function scanGrowthAction(): Promise<ActionResult<{ clients: number }>> {
  try { await requireRole([...ROLES]); const r = await growthService.scanAll(); rv(); return { ok: true, data: r }; } catch (e) { return fail(e); }
}
export async function generateForClientAction(clientId: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await growthService.generateForClient(clientId); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function scanRenewalsAction(): Promise<ActionResult<{ created: number }>> {
  try { await requireRole([...ROLES]); const created = await renewalsService.scan(); rv(); return { ok: true, data: { created } }; } catch (e) { return fail(e); }
}

/* ---- Status-Setter / Loeschen ---- */
export async function setUpsellStatusAction(id: string, status: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await upsellService.setStatus(id, status); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteUpsellAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await upsellService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function setReferralStatusAction(id: string, status: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await referralService.setStatus(id, status); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function setReviewStatusAction(id: string, status: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await reviewService.setStatus(id, status); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function createReviewAction(input: ReviewRequestCreateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await reviewService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function setRenewalStatusAction(id: string, status: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await renewalsService.setStatus(id, status); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteChurnAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await churnService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Testimonials ---- */
export async function createTestimonialAction(input: TestimonialCreateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await testimonialsService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function updateTestimonialAction(id: string, input: TestimonialUpdateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await testimonialsService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function setTestimonialStatusAction(id: string, status: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await testimonialsService.setStatus(id, status); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteTestimonialAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await testimonialsService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Optionen ---- */
export interface GrowthFormOptions {
  clients: { id: string; name: string }[];
}
export async function growthFormOptionsAction(): Promise<ActionResult<GrowthFormOptions>> {
  try {
    await requireRole([...ROLES]);
    const clients = await clientsService.list().catch(() => []);
    return { ok: true, data: { clients: clients.map((c) => ({ id: c.id, name: c.name })) } };
  } catch (e) { return fail(e); }
}
