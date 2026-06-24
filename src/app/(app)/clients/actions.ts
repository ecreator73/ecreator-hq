"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  clientsService,
  reportingCallsService,
  clientInteractionsService,
  clientChecklistsService,
  teamService,
  projectsService,
  contactsService,
  filesService,
} from "@/server/services";
import type { ClientCreateInput, ClientUpdateInput } from "@/lib/validation/clients";
import type {
  ReportingCallCreateInput,
  ReportingCallUpdateInput,
} from "@/lib/validation/reporting-calls";
import type { ClientInteractionCreateInput } from "@/lib/validation/client-interactions";
import type { ProjectCreateInput } from "@/lib/validation/projects";
import type { ContactCreateInput } from "@/lib/validation/contacts";
import type { FileCreateInput } from "@/lib/validation/files";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function revalidateClients(clientId?: string) {
  revalidatePath("/clients", "layout");
  revalidatePath("/");
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

/* ---- Kunden ---- */
export async function createClientAction(
  input: ClientCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const client = await clientsService.create(input);
    revalidateClients();
    return { ok: true, data: { id: client.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateClientAction(
  id: string,
  input: ClientUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await clientsService.update(id, input);
    revalidateClients(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Reporting Calls ---- */
export async function createReportingCallAction(
  input: ReportingCallCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const rc = await reportingCallsService.create(input);
    revalidateClients(input.client_id ? String(input.client_id) : undefined);
    return { ok: true, data: { id: rc.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateReportingCallAction(
  id: string,
  input: ReportingCallUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await reportingCallsService.update(id, input);
    revalidateClients();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markReportingCallStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await reportingCallsService.markStatus(id, status);
    revalidateClients();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteReportingCallAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await reportingCallsService.remove(id);
    revalidateClients();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function createTasksFromReportingAction(
  id: string,
): Promise<ActionResult<{ created: number }>> {
  try {
    await requireUser();
    const created = await reportingCallsService.createTasksFrom(id);
    revalidateClients();
    return { ok: true, data: { created } };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Kontaktverlauf ---- */
export async function createClientInteractionAction(
  input: ClientInteractionCreateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await clientInteractionsService.create(input);
    revalidateClients(input.client_id ? String(input.client_id) : undefined);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Onboarding / Offboarding / Checklisten ---- */
export async function createChecklistAction(
  clientId: string,
  kind: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await clientChecklistsService.create(clientId, kind);
    revalidateClients(clientId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function startOnboardingAction(
  clientId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await clientChecklistsService.startOnboarding(clientId);
    revalidateClients(clientId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleChecklistItemAction(
  itemId: string,
  completed: boolean,
  clientId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await clientChecklistsService.toggleItem(itemId, completed);
    revalidateClients(clientId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteChecklistAction(
  checklistId: string,
  clientId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await clientChecklistsService.remove(checklistId);
    revalidateClients(clientId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Optionen ---- */
export interface ClientFormOptions {
  users: { id: string; full_name: string | null }[];
}
export async function clientFormOptionsAction(): Promise<
  ActionResult<ClientFormOptions>
> {
  try {
    await requireUser();
    const users = await teamService.listMembers().catch(() => []);
    return { ok: true, data: { users } };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Projekte ---- */
export async function createProjectAction(
  input: ProjectCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const project = await projectsService.create(input);
    revalidateClients(input.client_id ? String(input.client_id) : undefined);
    return { ok: true, data: { id: project.id } };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Ansprechpartner ---- */
export async function createContactAction(
  input: ContactCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const contact = await contactsService.create(input);
    revalidateClients(input.client_id ? String(input.client_id) : undefined);
    return { ok: true, data: { id: contact.id } };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Dateien (Link/Referenz) ---- */
export async function createFileAction(
  input: FileCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const file = await filesService.create(input);
    revalidateClients(input.client_id ? String(input.client_id) : undefined);
    return { ok: true, data: { id: file.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function removeFileAction(
  id: string,
  clientId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await filesService.remove(id);
    revalidateClients(clientId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
