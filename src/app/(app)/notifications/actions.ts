"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { notificationsService } from "@/server/services";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await notificationsService.markRead(id);
    revalidatePath("/notifications");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fehler" };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await notificationsService.markAllRead(user.id);
    revalidatePath("/notifications");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fehler" };
  }
}
