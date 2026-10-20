import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RoleKey } from "@/config/roles";

/**
 * Helfer fuer die oeffentlichen Seiten (Bewerbung, Onboarding, Unterschrift,
 * Shoot-Review). Laufen nur serverseitig mit der Service-Rolle; der Zugriff auf
 * Daten erfolgt ausschliesslich ueber geheime Tokens.
 */

/** Zufaelliges, URL-sicheres Token (32 Byte). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function clientMeta(): Promise<{ ip: string; userAgent: string; ipHash: string }> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || "unbekannt";
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300);
  const salt = process.env.PUBLIC_FORM_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "ecreator";
  const ipHash = createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
  return { ip, userAgent, ipHash };
}

/**
 * Einfache Begrenzung pro IP und Formular (gleitendes Fenster). Wirft bei
 * Ueberschreitung einen verstaendlichen Fehler.
 */
export async function rateLimit(form: string, max: number, windowMinutes: number): Promise<void> {
  const { ipHash } = await clientMeta();
  const db = createAdminClient();
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count } = await db.from("public_form_hits").select("id", { count: "exact", head: true }).eq("form", form).eq("ip_hash", ipHash).gte("created_at", since);
  if ((count ?? 0) >= max) throw new Error("Zu viele Anfragen. Bitte versuche es in einigen Minuten erneut.");
  await db.from("public_form_hits").insert({ form, ip_hash: ipHash });
}

/** Team benachrichtigen (In-App, keine E-Mail). */
export async function notifyRoles(
  roles: RoleKey[],
  n: { type: string; title: string; body?: string | null; entityType?: string; entityId?: string | null },
): Promise<void> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("user_roles").select("user_id, role:roles(key)");
    const ids = [
      ...new Set(
        ((data ?? []) as unknown as Array<{ user_id: string; role: { key: string } | null }>).filter((r) => r.role && roles.includes(r.role.key as RoleKey)).map((r) => r.user_id),
      ),
    ];
    if (!ids.length) return;
    await db.from("notifications").insert(ids.map((user_id) => ({ user_id, type: n.type, title: n.title, body: n.body ?? null, entity_type: n.entityType ?? null, entity_id: n.entityId ?? null })));
  } catch {
    // Benachrichtigung ist Zusatz, darf das Absenden nie verhindern
  }
}

/** Dateiname fuer Speicherpfade: nur sichere Zeichen. */
export function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFKD").replace(/[^\w-]+/g, "_").replace(/_+/g, "_").slice(0, 60) || "datei";
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) : "";
  return ext ? `${base}.${ext}` : base;
}

export type PublicResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };
