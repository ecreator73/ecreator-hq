"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/activity";
import { newToken } from "@/lib/public-forms";
import type { RoleKey } from "@/config/roles";

/**
 * Oeffentliche Links verwalten: Unterschrifts-Link (Offerte/Vertrag),
 * Shoot-Review-Link, persoenlicher Onboarding-Link. Ein gesperrter Link
 * funktioniert sofort nicht mehr; ein neuer Link ersetzt den alten.
 */

const TARGETS = {
  offer: { table: "offers", column: "sign_token", path: (t: string) => `/signieren/offer/${t}`, roles: ["super_admin", "ceo", "cso", "sales", "finance"] as RoleKey[] },
  contract: { table: "contracts", column: "sign_token", path: (t: string) => `/signieren/contract/${t}`, roles: ["super_admin", "ceo", "cso", "sales", "finance"] as RoleKey[] },
  shoot: { table: "shoots", column: "share_token", path: (t: string) => `/shoot-review/${t}`, roles: ["super_admin", "ceo", "cso", "project_manager", "creative"] as RoleKey[] },
  onboarding: { table: "clients", column: "onboarding_token", path: (t: string) => `/onboarding?k=${t}`, roles: ["super_admin", "ceo", "cso", "project_manager"] as RoleKey[] },
} as const;
export type ShareKind = keyof typeof TARGETS;

type Result = { ok: true; path: string | null; message?: string } | { ok: false; error: string };

export async function shareLinkAction(kind: ShareKind, id: string, mode: "create" | "renew" | "revoke"): Promise<Result> {
  try {
    const t = TARGETS[z.enum(["offer", "contract", "shoot", "onboarding"]).parse(kind)];
    z.string().uuid().parse(id);
    const user = await requireUser();
    if (!canAccess(user.roles, t.roles)) throw new Error("Keine Berechtigung");
    const db = createAdminClient();
    const { data: row, error } = await db.from(t.table).select(`id, ${t.column}`).eq("id", id).maybeSingle();
    if (error || !row) throw new Error("Datensatz nicht gefunden");
    const current = (row as unknown as Record<string, string | null>)[t.column];
    let token: string | null = current;
    if (mode === "revoke") token = null;
    else if (mode === "renew" || !current) token = newToken();
    if (token !== current) {
      const { error: e } = await db.from(t.table).update({ [t.column]: token }).eq("id", id);
      if (e) throw new Error(e.message);
      await recordAudit({ action: `share_link.${mode}`, entityType: kind, entityId: id });
    }
    revalidatePath("/", "layout");
    return { ok: true, path: token ? t.path(token) : null, message: mode === "revoke" ? "Link gesperrt" : mode === "renew" ? "Neuer Link erstellt, der alte gilt nicht mehr" : undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
  }
}
