"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  leadsService,
  salesActivitiesService,
  meetingsService,
  offersService,
  contractsService,
  tasksService,
  salesDashboardService,
  clientsService,
  teamService,
} from "@/server/services";
import type { LeadCreateInput, LeadUpdateInput } from "@/lib/validation/leads";
import type { SalesActivityCreateInput } from "@/lib/validation/sales-activities";
import type { MeetingCreateInput } from "@/lib/validation/meetings";
import type { OfferCreateInput, OfferUpdateInput } from "@/lib/validation/offers";
import type { ContractCreateInput } from "@/lib/validation/contracts";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error: e instanceof Error ? e.message : "Unbekannter Fehler",
  };
}
function revalidateSales(leadId?: string) {
  revalidatePath("/sales", "layout");
  revalidatePath("/");
  if (leadId) revalidatePath(`/sales/leads/${leadId}`);
}

/* ---- Leads ---- */
export async function createLeadAction(
  input: LeadCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const lead = await leadsService.create(input);
    revalidateSales();
    return { ok: true, data: { id: lead.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateLeadAction(
  id: string,
  input: LeadUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await leadsService.update(id, input);
    revalidateSales(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await leadsService.remove(id);
    revalidateSales();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function moveLeadAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await leadsService.move(id, status);
    revalidateSales(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function convertLeadAction(
  id: string,
): Promise<ActionResult<{ clientId: string }>> {
  try {
    await requireUser();
    const client = await leadsService.convertToClient(id);
    revalidateSales(id);
    revalidatePath("/clients", "layout");
    return { ok: true, data: { clientId: client.id } };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Aktivitaeten ---- */
export async function createSalesActivityAction(
  input: SalesActivityCreateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await salesActivitiesService.create(input);
    revalidateSales(input.lead_id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Termine (meetings) ---- */
export async function createSalesMeetingAction(
  input: MeetingCreateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await meetingsService.create(input);
    revalidateSales(input.lead_id ? String(input.lead_id) : undefined);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateMeetingStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await meetingsService.update(id, { status: status as never });
    revalidateSales();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Angebote ---- */
export async function createOfferAction(
  input: OfferCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const offer = await offersService.create(input);
    revalidateSales();
    return { ok: true, data: { id: offer.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateOfferAction(
  id: string,
  input: OfferUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await offersService.update(id, input);
    revalidateSales();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteOfferAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await offersService.remove(id);
    revalidateSales();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Verträge ---- */
export async function createContractAction(
  input: ContractCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const contract = await contractsService.create(input);
    revalidateSales();
    revalidatePath("/clients", "layout");
    return { ok: true, data: { id: contract.id } };
  } catch (e) {
    return fail(e);
  }
}

/** Vertragsalerts: fuer auslaufende Verträge Verlaengerungs-Aufgaben erzeugen. */
export async function createRenewalTasksAction(): Promise<
  ActionResult<{ created: number }>
> {
  try {
    await requireUser();
    const expiring = await salesDashboardService.contractsExpiring(90);
    let created = 0;
    for (const c of expiring) {
      await tasksService.create({
        title: `Vertrag verlaengern: ${c.title}`,
        client_id: c.client_id ?? undefined,
        priority: "high",
        due_date: c.end_date ?? undefined,
      });
      created++;
    }
    revalidateSales();
    return { ok: true, data: { created } };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Optionen fuer Dropdowns ---- */
export interface SalesFormOptions {
  clients: { id: string; name: string }[];
  users: { id: string; full_name: string | null }[];
  leads: { id: string; company_name: string }[];
}
export async function salesFormOptionsAction(): Promise<
  ActionResult<SalesFormOptions>
> {
  try {
    await requireUser();
    const [clients, users, leadRows] = await Promise.all([
      clientsService
        .list()
        .then((r) => r.map((c) => ({ id: c.id, name: c.name })))
        .catch(() => []),
      teamService.listMembers().catch(() => []),
      leadsService
        .list({}, { pageSize: 200 })
        .then((r) => r.rows.map((l) => ({ id: l.id, company_name: l.company_name })))
        .catch(() => []),
    ]);
    return { ok: true, data: { clients, users, leads: leadRows } };
  } catch (e) {
    return fail(e);
  }
}
