"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  knowledgeArticlesService,
  sopsService,
  promptLibraryService,
  meetingAssistantService,
  clientsService,
  leadsService,
} from "@/server/services";
import type {
  ArticleCreateInput,
  ArticleUpdateInput,
  SopCreateInput,
  SopUpdateInput,
  PromptLibraryCreateInput,
  PromptLibraryUpdateInput,
} from "@/lib/validation/knowledge";
import type {
  MeetingCreateInput,
  MeetingUpdateInput,
} from "@/lib/validation/meetings";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
function rv() {
  revalidatePath("/operations", "layout");
  revalidatePath("/");
}

/* ---- Knowledge-Artikel ---- */
export async function createArticleAction(input: ArticleCreateInput): Promise<ActionResult<{ id: string }>> {
  try { await requireUser(); const a = await knowledgeArticlesService.create(input); rv(); return { ok: true, data: { id: a.id } }; } catch (e) { return fail(e); }
}
export async function updateArticleAction(id: string, input: ArticleUpdateInput): Promise<ActionResult> {
  try { await requireUser(); await knowledgeArticlesService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteArticleAction(id: string): Promise<ActionResult> {
  try { await requireUser(); await knowledgeArticlesService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- SOPs ---- */
export async function createSopAction(input: SopCreateInput): Promise<ActionResult<{ id: string }>> {
  try { await requireUser(); const s = await sopsService.create(input); rv(); return { ok: true, data: { id: s.id } }; } catch (e) { return fail(e); }
}
export async function updateSopAction(id: string, input: SopUpdateInput): Promise<ActionResult> {
  try { await requireUser(); await sopsService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteSopAction(id: string): Promise<ActionResult> {
  try { await requireUser(); await sopsService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Prompt Library ---- */
export async function createPromptLibraryAction(input: PromptLibraryCreateInput): Promise<ActionResult> {
  try { await requireUser(); await promptLibraryService.create(input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function updatePromptLibraryAction(id: string, input: PromptLibraryUpdateInput): Promise<ActionResult> {
  try { await requireUser(); await promptLibraryService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deletePromptLibraryAction(id: string): Promise<ActionResult> {
  try { await requireUser(); await promptLibraryService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- Meeting Assistant ---- */
export async function createMeetingAction(input: MeetingCreateInput): Promise<ActionResult<{ id: string }>> {
  try { await requireUser(); const m = await meetingAssistantService.create(input); rv(); return { ok: true, data: { id: m.id } }; } catch (e) { return fail(e); }
}
export async function updateMeetingAction(id: string, input: MeetingUpdateInput): Promise<ActionResult> {
  try { await requireUser(); await meetingAssistantService.update(id, input); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteMeetingAction(id: string): Promise<ActionResult> {
  try { await requireUser(); await meetingAssistantService.remove(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function generateMeetingSummaryAction(id: string): Promise<ActionResult> {
  try { await requireUser(); await meetingAssistantService.generateSummary(id); rv(); return { ok: true }; } catch (e) { return fail(e); }
}
export async function generateMeetingTasksAction(id: string): Promise<ActionResult<{ created: number }>> {
  try { await requireUser(); const created = await meetingAssistantService.generateTasks(id); rv(); return { ok: true, data: { created } }; } catch (e) { return fail(e); }
}

/* ---- Optionen ---- */
export interface MeetingFormOptions {
  clients: { id: string; name: string }[];
  leads: { id: string; company_name: string }[];
}
export async function meetingFormOptionsAction(): Promise<ActionResult<MeetingFormOptions>> {
  try {
    await requireUser();
    const [clientRows, leadsRes] = await Promise.all([
      clientsService.list().catch(() => []),
      leadsService.list({}, { pageSize: 500 }).catch(() => ({ rows: [] as { id: string; company_name: string }[] })),
    ]);
    return {
      ok: true,
      data: {
        clients: clientRows.map((c) => ({ id: c.id, name: c.name })),
        leads: (leadsRes.rows ?? []).map((l) => ({ id: l.id, company_name: l.company_name })),
      },
    };
  } catch (e) { return fail(e); }
}
