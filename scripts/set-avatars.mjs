/**
 * Hinterlegt Profilbilder (avatar_url) fuer einzelne Mitarbeitende anhand der
 * E-Mail. Nutzt service_role (umgeht RLS). Idempotent — einfach erneut laufbar.
 *
 *   node scripts/set-avatars.mjs
 */
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

const AVATARS = {
  "info@ecreator.ch": "https://www.ecreator.ch/wp-content/uploads/2026/02/2-3-fotor-20260219112218.png",
  "fabian@ecreator.ch": "https://www.ecreator.ch/wp-content/uploads/2026/02/fabian-12-fotor-20260219135754.png",
  "kaylou@ecreator.ch": "https://www.ecreator.ch/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-16.47.42-fotor-20260221165024.png",
};

for (const [email, url] of Object.entries(AVATARS)) {
  const { data, error } = await sb
    .from("profiles")
    .update({ avatar_url: url })
    .eq("email", email)
    .select("email, avatar_url");
  if (error) { console.error(`  ${email.padEnd(22)} FEHLER: ${error.message}`); continue; }
  if (!data || data.length === 0) { console.warn(`  ${email.padEnd(22)} kein Profil gefunden`); continue; }
  console.log(`  ${email.padEnd(22)} -> gesetzt`);
}

const { data: all } = await sb.from("profiles").select("email, avatar_url").order("email");
console.log("\n=== AKTUELLE AVATARE ===");
for (const p of all ?? []) console.log(`  ${(p.email ?? "—").padEnd(22)} ${p.avatar_url ? "✓ Bild" : "Initialen"}`);
