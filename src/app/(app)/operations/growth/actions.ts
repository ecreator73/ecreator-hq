"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  growthEngineService,
  revenueJourneysService,
  growthRecommendationsService,
  orchestrationsService,
  growthAlertsService,
} from "@/server/services";
import type {
  OrchestrationCreateInput,
  OrchestrationUpdateInput,
} from "@/lib/validation/growth-engine";
import type { AssistantAnswer } from "@/types/entities";

/**
 * Server Actions der Autonomous Growth Engine. Nur super_admin/ceo/cso duerfen
 * die Orchestrierung steuern (zusaetzlich zur RLS). Die Engine erzeugt
 * Aufgaben/Alerts - sie versendet NIE ungefragt E-Mails/Verträge/Rechnungen.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const ROLES = ["super_admin", "ceo", "cso"] as const;

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}

function rv() {
  revalidatePath("/operations/growth", "layout");
  revalidatePath("/");
}

/* --- Engine --- */

export async function scanGrowthEngineAction(): Promise<
  ActionResult<{ created: number; tasks: number; alerts: number }>
> {
  try {
    await requireRole([...ROLES]);
    const r = await growthEngineService.generateRecommendations();
    rv();
    return { ok: true, data: r };
  } catch (e) {
    return fail(e);
  }
}

export async function syncJourneysAction(): Promise<
  ActionResult<{ created: number; updated: number }>
> {
  try {
    await requireRole([...ROLES]);
    const r = await revenueJourneysService.sync();
    rv();
    return { ok: true, data: r };
  } catch (e) {
    return fail(e);
  }
}

export async function assistantAction(query: string): Promise<ActionResult<AssistantAnswer>> {
  try {
    await requireRole([...ROLES]);
    const answer = await growthEngineService.assistant(query);
    return { ok: true, data: answer };
  } catch (e) {
    return fail(e);
  }
}

/* --- Recommendations --- */

export async function setRecommendationStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await growthRecommendationsService.setStatus(id, status);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeRecommendationAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await growthRecommendationsService.remove(id);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* --- Revenue Journeys --- */

export async function setJourneyStageAction(id: string, stage: string): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await revenueJourneysService.setStage(id, stage);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setJourneyStatusAction(id: string, status: string): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await revenueJourneysService.setStatus(id, status);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeJourneyAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await revenueJourneysService.remove(id);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* --- Orchestrations --- */

export async function createOrchestrationAction(
  input: OrchestrationCreateInput,
): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await orchestrationsService.create(input);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateOrchestrationAction(
  id: string,
  input: OrchestrationUpdateInput,
): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await orchestrationsService.update(id, input);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setOrchestrationStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await orchestrationsService.setStatus(id, status);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeOrchestrationAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await orchestrationsService.remove(id);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* --- Growth Alerts --- */

export async function resolveGrowthAlertAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await growthAlertsService.resolve(id);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeGrowthAlertAction(id: string): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await growthAlertsService.remove(id);
    rv();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
