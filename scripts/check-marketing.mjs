// Verifikation Migration 0023 (Marketing Intelligence). Nur lesend.
// Ausfuehren: node scripts/check-marketing.mjs   (liest ../.env.local)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const L = "─".repeat(56);
console.log(L + "\nMIGRATION 0023 - MARKETING INTELLIGENCE\n" + L);
let fail = 0;
const tables = ["mi_bookings", "mi_conversion_events", "mi_activity_log", "mi_sync_runs", "mi_daily_channel_metrics", "mi_daily_ad_metrics",
  "mi_daily_keyword_metrics", "mi_ga4_daily_totals", "mi_ga4_daily_traffic", "mi_ga4_daily_pages", "mi_gsc_daily_totals", "mi_gsc_daily"];
for (const t of tables) {
  const { error, count } = await db.from(t).select("*", { count: "exact", head: true });
  if (error) { fail++; console.log(`❌ ${t}: ${error.message}`); } else console.log(`✅ ${t} (${count ?? 0} Zeilen)`);
}
const { error: le } = await db.from("leads").select("contact_id, idempotency_key, form_type, ft_channel, lt_channel, gclid, attribution_confidence, converted_at").limit(1);
console.log(le ? (fail++, `❌ leads-Spalten: ${le.message}`) : "✅ leads: neue Spalten vorhanden");
const { error: ce } = await db.from("contacts").select("email_norm, phone_norm, company_name, source").limit(1);
console.log(ce ? (fail++, `❌ contacts-Spalten: ${ce.message}`) : "✅ contacts: neue Spalten vorhanden");
// RLS: anonym darf nichts lesen
const { data: anonRows, error: ae } = await anon.from("mi_activity_log").select("id").limit(1);
console.log(!ae && (anonRows ?? []).length === 0 ? "✅ RLS: anonym keine Zeilen" : `⚠️ RLS anonym: ${ae?.message ?? "Zeilen sichtbar"}`);
console.log(L + (fail ? `\n${fail} Fehler` : "\nAlles vorhanden") + "\n" + L);
process.exit(fail ? 1 : 0);
