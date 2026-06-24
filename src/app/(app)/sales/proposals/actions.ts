"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  proposalsService,
  proposalItemsService,
  pricingItemsService,
  clientsService,
  leadsService,
} from "@/server/services";
import type {
  ProposalCreateInput,
  ProposalUpdateInput,
  ProposalGenerateInput,
  ProposalItemCreateInput,
  PricingItemCreateInput,
  PricingItemUpdateInput,
} from "@/lib/validation/proposals";

const ROLES = ["super_admin", "ceo", "cso", "sales"] as const;
const PRICE_ROLES = ["super_admin", "ceo"] as const;
const FINANCE_ROLES = ["super_admin", "ceo", "finance"] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function rv(id?: string) {
  revalidatePath("/sales/proposals", "layout");
  revalidatePath("/");
  if (id) revalidatePath(`/sales/proposals/${id}`);
}

/* ---- Angebote ---- */
export async function generateProposalAction(input: ProposalGenerateInput): Promise<ActionResult<{ id: string }>> {
  try { await requireRole([...ROLES]); const p = await proposalsService.generate(input); rv(); return { ok: true, data: { id: p.id } }; } catch (e) { return fail(e); }
}
export async function createProposalAction(input: ProposalCreateInput): Promise<ActionResult<{ id: string }>> {
  try { await requireRole([...ROLES]); const p = await proposalsService.create(input); rv(); return { ok: true, data: { id: p.id } }; } catch (e) { return fail(e); }
}
export async function updateProposalAction(id: string, input: ProposalUpdateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await proposalsService.update(id, input); rv(id); return { ok: true }; } catch (e) { return fail(e); }
}
export async function setProposalStatusAction(id: string, status: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await proposalsService.setStatus(id, status); rv(id); return { ok: true }; } catch (e) { return fail(e); }
}
export async function newProposalVersionAction(id: string): Promise<ActionResult<{ id: string }>> {
  try { await requireRole([...ROLES]); const p = await proposalsService.newVersion(id); rv(); return { ok: true, data: { id: p.id } }; } catch (e) { return fail(e); }
}
export async function deleteProposalAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await proposalsService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function createInvoiceDraftAction(id: string): Promise<ActionResult<{ invoiceId: string }>> {
  try { await requireRole([...FINANCE_ROLES]); const r = await proposalsService.createInvoiceDraft(id); rv(id); return { ok: true, data: r }; } catch (e) { return fail(e); }
}

/* ---- Positionen ---- */
export async function addProposalItemAction(input: ProposalItemCreateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await proposalItemsService.add(input); rv(input.proposal_id ? String(input.proposal_id) : undefined); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteProposalItemAction(id: string, proposalId: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await proposalItemsService.remove(id, proposalId); rv(proposalId); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Preislogik (nur super_admin/ceo) ---- */
export async function createPricingItemAction(input: PricingItemCreateInput): Promise<ActionResult> {
  try { await requireRole([...PRICE_ROLES]); await pricingItemsService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function updatePricingItemAction(id: string, input: PricingItemUpdateInput): Promise<ActionResult> {
  try { await requireRole([...PRICE_ROLES]); await pricingItemsService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deletePricingItemAction(id: string): Promise<ActionResult> {
  try { await requireRole([...PRICE_ROLES]); await pricingItemsService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Optionen ---- */
export interface ProposalFormOptions {
  leads: { id: string; company_name: string }[];
  clients: { id: string; name: string }[];
}
export async function proposalFormOptionsAction(): Promise<ActionResult<ProposalFormOptions>> {
  try {
    await requireRole([...ROLES]);
    const [leadsRes, clientRows] = await Promise.all([
      leadsService.list({}, { pageSize: 500 }).catch(() => ({ rows: [] as { id: string; company_name: string }[] })),
      clientsService.list().catch(() => []),
    ]);
    return {
      ok: true,
      data: {
        leads: (leadsRes.rows ?? []).map((l) => ({ id: l.id, company_name: l.company_name })),
        clients: clientRows.map((c) => ({ id: c.id, name: c.name })),
      },
    };
  } catch (e) { return fail(e); }
}
