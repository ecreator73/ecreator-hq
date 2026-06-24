"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  aiPromptsService,
  aiRunsService,
  automationJobsService,
  integrationsService,
  webhooksService,
} from "@/server/services";
import type {
  AiPromptCreateInput,
  AiPromptUpdateInput,
  AutomationJobCreateInput,
  AutomationJobUpdateInput,
  IntegrationCreateInput,
  IntegrationUpdateInput,
  WebhookCreateInput,
  WebhookUpdateInput,
} from "@/lib/validation/ai";
import type { AiRun } from "@/types/entities";

const AI_ROLES = ["super_admin", "ceo", "developer"] as const;
const ADMIN_ONLY = ["super_admin"] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function revalidateAi() {
  revalidatePath("/settings/ai", "layout");
}

/* ---- Prompt Templates ---- */
export async function createPromptAction(
  input: AiPromptCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...AI_ROLES]);
    const p = await aiPromptsService.create(input);
    revalidateAi();
    return { ok: true, data: { id: p.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updatePromptAction(
  id: string,
  input: AiPromptUpdateInput,
): Promise<ActionResult> {
  try {
    await requireRole([...AI_ROLES]);
    await aiPromptsService.update(id, input);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setPromptStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireRole([...AI_ROLES]);
    await aiPromptsService.setStatus(id, status);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deletePromptAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...AI_ROLES]);
    await aiPromptsService.remove(id);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function testPromptAction(
  id: string,
  values: Record<string, unknown>,
): Promise<ActionResult<AiRun>> {
  try {
    await requireRole([...AI_ROLES]);
    const run = await aiRunsService.testRun(id, values);
    revalidateAi();
    return { ok: true, data: run };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Automation Jobs ---- */
export async function createJobAction(
  input: AutomationJobCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...AI_ROLES]);
    const j = await automationJobsService.create(input);
    revalidateAi();
    return { ok: true, data: { id: j.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateJobAction(
  id: string,
  input: AutomationJobUpdateInput,
): Promise<ActionResult> {
  try {
    await requireRole([...AI_ROLES]);
    await automationJobsService.update(id, input);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setJobStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireRole([...AI_ROLES]);
    await automationJobsService.setStatus(id, status);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function runJobAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...AI_ROLES]);
    await automationJobsService.runNow(id);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteJobAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...AI_ROLES]);
    await automationJobsService.remove(id);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Integrationen (nur Super Admin) ---- */
export async function createIntegrationAction(
  input: IntegrationCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...ADMIN_ONLY]);
    const i = await integrationsService.create(input);
    revalidateAi();
    return { ok: true, data: { id: i.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateIntegrationAction(
  id: string,
  input: IntegrationUpdateInput,
): Promise<ActionResult> {
  try {
    await requireRole([...ADMIN_ONLY]);
    await integrationsService.update(id, input);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setIntegrationStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireRole([...ADMIN_ONLY]);
    await integrationsService.setStatus(id, status);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteIntegrationAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...ADMIN_ONLY]);
    await integrationsService.remove(id);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Webhooks (nur Super Admin) ---- */
export async function createWebhookAction(
  input: WebhookCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...ADMIN_ONLY]);
    const w = await webhooksService.create(input);
    revalidateAi();
    return { ok: true, data: { id: w.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteWebhookAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...ADMIN_ONLY]);
    await webhooksService.remove(id);
    revalidateAi();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
