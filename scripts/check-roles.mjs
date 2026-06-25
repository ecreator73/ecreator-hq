import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
for (const raw of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const l = raw.trim(); if (!l || l.startsWith("#")) continue;
  const i = l.indexOf("="); if (i === -1) continue;
  const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: profiles } = await sb.from("profiles").select("id, email, full_name, is_active");
console.log("=== PROFILES ===");
for (const p of profiles ?? []) {
  const { data: ur } = await sb.from("user_roles").select("roles(key)").eq("user_id", p.id);
  const roles = (ur ?? []).map((r) => r.roles?.key).filter(Boolean);
  console.log(`${(p.email ?? "—").padEnd(30)} active=${p.is_active}  roles=[${roles.join(", ") || "KEINE"}]`);
}
const { data: roles } = await sb.from("roles").select("key, label").order("key");
console.log("\n=== VORHANDENE ROLLEN ===");
console.log((roles ?? []).map((r) => r.key).join(", "));
