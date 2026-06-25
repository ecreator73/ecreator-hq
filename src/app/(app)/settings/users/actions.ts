"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Benutzerverwaltung. ALLE Aktionen nur fuer super_admin. Nutzt den
 * Service-Role-Admin-Client (Auth-User anlegen umgeht RLS). Selbst-Aussperren
 * wird verhindert.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
}

export async function createUserAction(input: {
  email: string;
  full_name: string;
  password: string;
  role: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["super_admin"]);
    const email = input.email.trim().toLowerCase();
    const fullName = input.full_name.trim();
    if (!email) throw new Error("E-Mail ist erforderlich.");
    if (!input.password || input.password.length < 8)
      throw new Error("Passwort mit mindestens 8 Zeichen erforderlich.");

    const admin = createAdminClient();
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email },
    });
    if (cErr || !created?.user) {
      throw new Error(cErr?.message ?? "Nutzer konnte nicht erstellt werden.");
    }
    const userId = created.user.id;

    // Profil (Trigger legt evtl. schon an) + Rolle.
    await admin
      .from("profiles")
      .upsert({ id: userId, email, full_name: fullName || email, is_active: true }, { onConflict: "id" });

    if (input.role) {
      const { data: role } = await admin.from("roles").select("id").eq("key", input.role).single();
      if (role) {
        await admin
          .from("user_roles")
          .upsert({ user_id: userId, role_id: role.id }, { onConflict: "user_id,role_id" });
      }
    }

    revalidatePath("/settings/users");
    return { ok: true, data: { id: userId } };
  } catch (e) {
    return fail(e);
  }
}

export async function setUserRolesAction(
  userId: string,
  roleKeys: string[],
): Promise<ActionResult> {
  try {
    const user = await requireRole(["super_admin"]);
    if (userId === user.id && !roleKeys.includes("super_admin")) {
      throw new Error("Du kannst dir nicht selbst die Super-Admin-Rolle entziehen.");
    }
    const admin = createAdminClient();
    const { data: roles } = await admin.from("roles").select("id, key");
    const idByKey = new Map((roles ?? []).map((r) => [r.key as string, r.id as string]));
    await admin.from("user_roles").delete().eq("user_id", userId);
    const rows = roleKeys
      .map((k) => idByKey.get(k))
      .filter((id): id is string => Boolean(id))
      .map((role_id) => ({ user_id: userId, role_id }));
    if (rows.length > 0) {
      const { error } = await admin.from("user_roles").insert(rows);
      if (error) throw error;
    }
    revalidatePath("/settings/users");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setUserActiveAction(
  userId: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const user = await requireRole(["super_admin"]);
    if (userId === user.id && !active) {
      throw new Error("Du kannst dich nicht selbst deaktivieren.");
    }
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update({ is_active: active }).eq("id", userId);
    if (error) throw error;
    revalidatePath("/settings/users");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
