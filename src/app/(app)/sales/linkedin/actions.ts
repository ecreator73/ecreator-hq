"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  linkedinCampaignsService,
  linkedinProspectsService,
  linkedinActivitiesService,
  linkedinTemplatesService,
  linkedinMessagesService,
} from "@/server/services";
import { teamService } from "@/server/services/team.service";
import type {
  LinkedInCampaignCreateInput,
  LinkedInCampaignUpdateInput,
  LinkedInProspectCreateInput,
  LinkedInProspectUpdateInput,
  LinkedInActivityCreateInput,
  LinkedInTemplateCreateInput,
  LinkedInTemplateUpdateInput,
  LinkedInMessageCreateInput,
  LinkedInMessageUpdateInput,
  LinkedInImportRow,
} from "@/lib/validation/linkedin";
import type { LinkedInProspectStatus } from "@/config/catalog";

const ROLES = ["super_admin", "ceo", "cso", "sales"] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function rv() {
  revalidatePath("/sales/linkedin", "layout");
}

/* ---- Prospects ---- */
export async function createProspectAction(
  input: LinkedInProspectCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...ROLES]);
    const p = await linkedinProspectsService.create(input);
    rv();
    return { ok: true, data: { id: p.id } };
  } catch (e) { return fail(e); }
}
export async function updateProspectAction(
  id: string,
  input: LinkedInProspectUpdateInput,
): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinProspectsService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function moveProspectAction(
  id: string,
  status: LinkedInProspectStatus,
): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinProspectsService.move(id, status); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteProspectAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinProspectsService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function convertProspectAction(
  id: string,
): Promise<ActionResult<{ leadId: string }>> {
  try {
    await requireRole([...ROLES]);
    const res = await linkedinProspectsService.convertToLead(id);
    rv();
    revalidatePath("/sales/leads");
    return { ok: true, data: res };
  } catch (e) { return fail(e); }
}
export async function importProspectsAction(
  rows: LinkedInImportRow[],
  campaignId?: string | null,
): Promise<ActionResult<{ created: number; skipped: number; errors: string[] }>> {
  try {
    await requireRole([...ROLES]);
    const res = await linkedinProspectsService.bulkImport(rows, { campaign_id: campaignId ?? null });
    rv();
    return { ok: true, data: res };
  } catch (e) { return fail(e); }
}

/* ---- Aktivitaeten ---- */
export async function createProspectActivityAction(
  input: LinkedInActivityCreateInput,
): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinActivitiesService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Kampagnen ---- */
export async function createLinkedinCampaignAction(
  input: LinkedInCampaignCreateInput,
): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinCampaignsService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function updateLinkedinCampaignAction(
  id: string,
  input: LinkedInCampaignUpdateInput,
): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinCampaignsService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function archiveLinkedinCampaignAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinCampaignsService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Vorlagen ---- */
export async function createLinkedinTemplateAction(
  input: LinkedInTemplateCreateInput,
): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinTemplatesService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function updateLinkedinTemplateAction(
  id: string,
  input: LinkedInTemplateUpdateInput,
): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinTemplatesService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteLinkedinTemplateAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinTemplatesService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Nachrichten ---- */
export async function personalizeMessageAction(
  prospectId: string,
  templateId: string,
): Promise<ActionResult<{ draftId: string; body: string; missing: string[] }>> {
  try {
    await requireRole([...ROLES]);
    const res = await linkedinMessagesService.personalize(prospectId, templateId);
    rv();
    return { ok: true, data: res };
  } catch (e) { return fail(e); }
}
export async function createLinkedinMessageAction(
  input: LinkedInMessageCreateInput,
): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinMessagesService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function updateLinkedinMessageAction(
  id: string,
  input: LinkedInMessageUpdateInput,
): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinMessagesService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteLinkedinMessageAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await linkedinMessagesService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Formular-Optionen (Verantwortliche + Kampagnen) ---- */
export async function linkedinFormOptionsAction(): Promise<
  ActionResult<{
    users: Array<{ id: string; full_name: string }>;
    campaigns: Array<{ id: string; name: string }>;
  }>
> {
  try {
    await requireRole([...ROLES]);
    const [users, campaigns] = await Promise.all([
      teamService.listMembers().catch(() => []),
      linkedinCampaignsService.list().catch(() => []),
    ]);
    return {
      ok: true,
      data: {
        users: users.map((u) => ({ id: u.id, full_name: u.full_name ?? "Unbenannt" })),
        campaigns: campaigns
          .filter((c) => c.status !== "archived")
          .map((c) => ({ id: c.id, name: c.name })),
      },
    };
  } catch (e) { return fail(e); }
}
