"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  outreachCampaignsService,
  emailTemplatesService,
  outreachMessagesService,
  bookedMeetingsService,
  followUpSequencesService,
  unsubscribesService,
  leadsService,
} from "@/server/services";
import type {
  CampaignCreateInput,
  EmailTemplateCreateInput,
  EmailTemplateUpdateInput,
  OutreachMessageUpdateInput,
  BookedMeetingCreateInput,
  FollowUpSequenceCreateInput,
  UnsubscribeCreateInput,
} from "@/lib/validation/outreach";

const ROLES = ["super_admin", "ceo", "cso", "sales"] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function rv() {
  revalidatePath("/sales/outreach", "layout");
  revalidatePath("/");
}

/* ---- Kampagnen ---- */
export async function createCampaignAction(input: CampaignCreateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await outreachCampaignsService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await outreachCampaignsService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Templates ---- */
export async function createTemplateAction(input: EmailTemplateCreateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await emailTemplatesService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function updateTemplateAction(id: string, input: EmailTemplateUpdateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await emailTemplatesService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await emailTemplatesService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Nachrichten ---- */
export async function generateDraftAction(
  leadId: string,
  templateId?: string,
  campaignId?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole([...ROLES]);
    const m = await outreachMessagesService.generateDraft({ leadId, templateId: templateId || null, campaignId: campaignId || null });
    rv();
    return { ok: true, data: { id: m.id } };
  } catch (e) { return fail(e); }
}
export async function updateMessageAction(id: string, input: OutreachMessageUpdateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await outreachMessagesService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function sendMessageAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await outreachMessagesService.send(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function setMessageStatusAction(id: string, status: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await outreachMessagesService.setStatus(id, status); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteMessageAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await outreachMessagesService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Termine ---- */
export async function createMeetingAction(input: BookedMeetingCreateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await bookedMeetingsService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function setMeetingStatusAction(id: string, status: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await bookedMeetingsService.setStatus(id, status); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteMeetingAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await bookedMeetingsService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Sequenzen ---- */
export async function createSequenceAction(input: FollowUpSequenceCreateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await followUpSequencesService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteSequenceAction(id: string): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await followUpSequencesService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Opt-out ---- */
export async function addUnsubscribeAction(input: UnsubscribeCreateInput): Promise<ActionResult> {
  try { await requireRole([...ROLES]); await unsubscribesService.add(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Optionen ---- */
export interface OutreachFormOptions {
  leads: { id: string; company_name: string }[];
  campaigns: { id: string; name: string }[];
  templates: { id: string; name: string }[];
}
export async function outreachFormOptionsAction(): Promise<ActionResult<OutreachFormOptions>> {
  try {
    await requireRole([...ROLES]);
    const [leadsRes, campaigns, templates] = await Promise.all([
      leadsService.list({}, { pageSize: 500 }).catch(() => ({ rows: [] as { id: string; company_name: string }[] })),
      outreachCampaignsService.list().catch(() => []),
      emailTemplatesService.list(true).catch(() => []),
    ]);
    return {
      ok: true,
      data: {
        leads: (leadsRes.rows ?? []).map((l) => ({ id: l.id, company_name: l.company_name })),
        campaigns: campaigns.map((c) => ({ id: c.id, name: c.name })),
        templates: templates.map((t) => ({ id: t.id, name: t.name })),
      },
    };
  } catch (e) { return fail(e); }
}
