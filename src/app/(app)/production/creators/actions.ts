"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  creatorsService,
  creatorAssetsService,
  creatorAvailabilityService,
  creatorRatingsService,
  shootAssignmentsService,
  shootsService,
} from "@/server/services";
import type {
  CreatorCreateInput,
  CreatorUpdateInput,
  CreatorAssetCreateInput,
  CreatorAvailabilityCreateInput,
  CreatorRatingCreateInput,
  ShootAssignmentCreateInput,
} from "@/lib/validation/creators";
import type { CreatorMatch, MatchCriteria } from "@/types/entities";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function revalidate(creatorId?: string) {
  revalidatePath("/production/creators", "layout");
  revalidatePath("/production");
  revalidatePath("/");
  if (creatorId) revalidatePath(`/production/creators/${creatorId}`);
}

/* ---- Creator ---- */
export async function createCreatorAction(
  input: CreatorCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const c = await creatorsService.create(input);
    revalidate();
    return { ok: true, data: { id: c.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateCreatorAction(
  id: string,
  input: CreatorUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await creatorsService.update(id, input);
    revalidate(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setCreatorStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await creatorsService.setStatus(id, status);
    revalidate(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteCreatorAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await creatorsService.remove(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function importCreatorsAction(
  rows: CreatorCreateInput[],
): Promise<ActionResult<{ created: number; errors: { row: number; error: string }[] }>> {
  try {
    await requireUser();
    const result = await creatorsService.bulkCreate(rows);
    revalidate();
    return { ok: true, data: result };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Matching ---- */
export async function matchCreatorsAction(
  criteria: MatchCriteria,
): Promise<ActionResult<CreatorMatch[]>> {
  try {
    await requireUser();
    const matches = await creatorsService.match(criteria);
    return { ok: true, data: matches };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Portfolio ---- */
export async function createCreatorAssetAction(
  input: CreatorAssetCreateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await creatorAssetsService.create(input);
    revalidate(input.creator_id ? String(input.creator_id) : undefined);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteCreatorAssetAction(
  id: string,
  creatorId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await creatorAssetsService.remove(id);
    revalidate(creatorId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Verfuegbarkeit ---- */
export async function createAvailabilityAction(
  input: CreatorAvailabilityCreateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await creatorAvailabilityService.create(input);
    revalidate(input.creator_id ? String(input.creator_id) : undefined);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteAvailabilityAction(
  id: string,
  creatorId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await creatorAvailabilityService.remove(id);
    revalidate(creatorId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Bewertungen ---- */
export async function createRatingAction(
  input: CreatorRatingCreateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await creatorRatingsService.create(input);
    revalidate(input.creator_id ? String(input.creator_id) : undefined);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteRatingAction(
  id: string,
  creatorId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await creatorRatingsService.remove(id);
    revalidate(creatorId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Besetzung (Staffing) ---- */
export async function createAssignmentAction(
  input: ShootAssignmentCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const a = await shootAssignmentsService.create(input);
    revalidate(input.creator_id ? String(input.creator_id) : undefined);
    return { ok: true, data: { id: a.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function setAssignmentStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await shootAssignmentsService.setStatus(id, status);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function updateAssignmentRateAction(
  id: string,
  agreedRate: number | undefined,
): Promise<ActionResult> {
  try {
    await requireUser();
    await shootAssignmentsService.update(id, { agreed_rate: agreedRate });
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteAssignmentAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await shootAssignmentsService.remove(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Optionen ---- */
export interface CreatorFormOptions {
  shoots: { id: string; title: string; shooting_date: string | null }[];
}
export async function creatorFormOptionsAction(): Promise<
  ActionResult<CreatorFormOptions>
> {
  try {
    await requireUser();
    const shoots = await shootsService.list().catch(() => []);
    return {
      ok: true,
      data: {
        shoots: shoots.map((s) => ({
          id: s.id,
          title: s.title,
          shooting_date: s.shooting_date,
        })),
      },
    };
  } catch (e) {
    return fail(e);
  }
}
