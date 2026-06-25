"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { metaService } from "@/server/integrations/meta/service";

const ROLES = ["super_admin", "ceo", "cso"] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}
const revalidate = () => revalidatePath("/settings/integrations/meta");

export async function loadFormsAction(): Promise<
  ActionResult<Array<{ id: string; name: string; page_id: string; page_name: string }>>
> {
  try {
    await requireRole([...ROLES]);
    return { ok: true, data: await metaService.listForms() };
  } catch (e) {
    return fail(e);
  }
}

export async function saveFormsAction(
  forms: Array<{ id: string; name: string; page_id: string }>,
): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await metaService.saveConfig({ forms });
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function subscribeWebhooksAction(): Promise<
  ActionResult<{ ok: number; failed: number; errors: string[] }>
> {
  try {
    await requireRole([...ROLES]);
    const res = await metaService.subscribeWebhooks();
    revalidate();
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}

export async function syncHistoricalAction(): Promise<
  ActionResult<{ created: number; updated: number; errors: string[] }>
> {
  try {
    await requireRole([...ROLES]);
    const res = await metaService.syncHistorical();
    revalidate();
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}

export async function disconnectMetaAction(): Promise<ActionResult> {
  try {
    await requireRole([...ROLES]);
    await metaService.disconnect();
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
