"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  websiteProjectsService,
  adProjectsService,
  crmProjectsService,
  contentProjectsService,
  shootsService,
  assetsService,
  approvalsService,
  projectMilestonesService,
  clientsService,
  projectsService,
  teamService,
} from "@/server/services";
import type {
  WebsiteProjectCreateInput,
  WebsiteProjectUpdateInput,
  AdProjectCreateInput,
  AdProjectUpdateInput,
  CrmProjectCreateInput,
  CrmProjectUpdateInput,
  ContentProjectCreateInput,
  ContentProjectUpdateInput,
  ShootCreateInput,
  ShootUpdateInput,
  AssetCreateInput,
  AssetUpdateInput,
  ApprovalCreateInput,
  ApprovalUpdateInput,
  MilestoneCreateInput,
} from "@/lib/validation/production";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}

function revalidateProduction(extra?: string) {
  revalidatePath("/production", "layout");
  revalidatePath("/");
  if (extra) revalidatePath(extra);
}

/* ---- Website-Projekte ---- */
export async function createWebsiteProjectAction(
  input: WebsiteProjectCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const row = await websiteProjectsService.create(input);
    revalidateProduction();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateWebsiteProjectAction(
  id: string,
  input: WebsiteProjectUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await websiteProjectsService.update(id, input);
    revalidateProduction(`/production/websites/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setWebsiteProjectStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await websiteProjectsService.setStatus(id, status);
    revalidateProduction(`/production/websites/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteWebsiteProjectAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await websiteProjectsService.remove(id);
    revalidateProduction();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Ads-Projekte ---- */
export async function createAdProjectAction(
  input: AdProjectCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const row = await adProjectsService.create(input);
    revalidateProduction();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateAdProjectAction(
  id: string,
  input: AdProjectUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await adProjectsService.update(id, input);
    revalidateProduction(`/production/ads/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setAdProjectStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await adProjectsService.setStatus(id, status);
    revalidateProduction(`/production/ads/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteAdProjectAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await adProjectsService.remove(id);
    revalidateProduction();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- CRM-Projekte ---- */
export async function createCrmProjectAction(
  input: CrmProjectCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const row = await crmProjectsService.create(input);
    revalidateProduction();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateCrmProjectAction(
  id: string,
  input: CrmProjectUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await crmProjectsService.update(id, input);
    revalidateProduction(`/production/crm/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setCrmProjectStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await crmProjectsService.setStatus(id, status);
    revalidateProduction(`/production/crm/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteCrmProjectAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await crmProjectsService.remove(id);
    revalidateProduction();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Content-Projekte ---- */
export async function createContentProjectAction(
  input: ContentProjectCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const row = await contentProjectsService.create(input);
    revalidateProduction();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateContentProjectAction(
  id: string,
  input: ContentProjectUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await contentProjectsService.update(id, input);
    revalidateProduction(`/production/content/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setContentProjectStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await contentProjectsService.setStatus(id, status);
    revalidateProduction(`/production/content/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteContentProjectAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await contentProjectsService.remove(id);
    revalidateProduction();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Shootings ---- */
export async function createShootAction(
  input: ShootCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const row = await shootsService.create(input);
    revalidateProduction("/production/shoots");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateShootAction(
  id: string,
  input: ShootUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await shootsService.update(id, input);
    revalidateProduction("/production/shoots");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function setShootStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await shootsService.setStatus(id, status);
    revalidateProduction("/production/shoots");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteShootAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await shootsService.remove(id);
    revalidateProduction("/production/shoots");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Assets ---- */
export async function createAssetAction(
  input: AssetCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const row = await assetsService.create(input);
    revalidateProduction("/production/assets");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function updateAssetAction(
  id: string,
  input: AssetUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await assetsService.update(id, input);
    revalidateProduction("/production/assets");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteAssetAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await assetsService.remove(id);
    revalidateProduction("/production/assets");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Freigaben ---- */
export async function createApprovalAction(
  input: ApprovalCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const row = await approvalsService.create(input);
    revalidateProduction("/production/assets");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e);
  }
}
export async function setApprovalStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await approvalsService.setStatus(id, status);
    revalidateProduction("/production/assets");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteApprovalAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await approvalsService.remove(id);
    revalidateProduction("/production/assets");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Meilensteine ---- */
export async function createMilestoneAction(
  input: MilestoneCreateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await projectMilestonesService.create(input);
    revalidateProduction();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function toggleMilestoneAction(
  id: string,
  completed: boolean,
): Promise<ActionResult> {
  try {
    await requireUser();
    await projectMilestonesService.toggle(id, completed);
    revalidateProduction();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteMilestoneAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await projectMilestonesService.remove(id);
    revalidateProduction();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Optionen fuer Formulare ---- */
export interface ProductionFormOptions {
  users: { id: string; full_name: string | null }[];
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  contentProjects: { id: string; title: string }[];
}

export async function productionFormOptionsAction(): Promise<
  ActionResult<ProductionFormOptions>
> {
  try {
    await requireUser();
    const [users, clientRows, projectRows, contentRows] = await Promise.all([
      teamService.listMembers().catch(() => []),
      clientsService.list().catch(() => []),
      projectsService.list().catch(() => []),
      contentProjectsService.list().catch(() => []),
    ]);
    return {
      ok: true,
      data: {
        users,
        clients: clientRows.map((c) => ({ id: c.id, name: c.name })),
        projects: projectRows.map((p) => ({ id: p.id, title: p.title })),
        contentProjects: contentRows.map((c) => ({
          id: c.id,
          title: c.title ?? "Content-Projekt",
        })),
      },
    };
  } catch (e) {
    return fail(e);
  }
}
