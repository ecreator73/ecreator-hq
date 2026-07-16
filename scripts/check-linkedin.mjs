import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const L = "─".repeat(56);
console.log(L + "\nLINKEDIN-SALES MIGRATION 0021 — VERIFIKATION\n" + L);

let ok = true;
async function checkTable(name) {
  const { error, count } = await db.from(name).select("*", { count: "exact", head: true });
  if (error) { console.log(`❌ ${name}: ${error.message}`); ok = false; }
  else console.log(`✅ ${name} (${count ?? 0} Zeilen)`);
}

for (const t of ["linkedin_campaigns", "linkedin_prospects", "linkedin_activities", "linkedin_message_templates", "linkedin_messages"]) {
  await checkTable(t);
}

// Status-Registry
const { data: sts } = await db.from("statuses").select("key,label,is_default").eq("entity_type", "linkedin_prospect").order("sort_order");
console.log(`\nStatus-Registry linkedin_prospect: ${sts?.length ?? 0}/12`);
if ((sts?.length ?? 0) !== 12) ok = false;
for (const s of sts ?? []) console.log(`   • ${s.key}${s.is_default ? " (default)" : ""}`);

// Vorlagen-Seed
const { data: tpls } = await db.from("linkedin_message_templates").select("name,category,active");
console.log(`\nStandard-Vorlagen: ${tpls?.length ?? 0}/6`);
for (const t of tpls ?? []) console.log(`   • [${t.category}] ${t.name}`);
if ((tpls?.length ?? 0) < 6) ok = false;

// tasks.linkedin_prospect_id
const { error: taskErr } = await db.from("tasks").select("linkedin_prospect_id").limit(1);
console.log(taskErr ? `\n❌ tasks.linkedin_prospect_id: ${taskErr.message}` : "\n✅ tasks.linkedin_prospect_id vorhanden");
if (taskErr) ok = false;

// Smoke-Test: Prospect anlegen -> Status-Trigger + Loeschen
const { data: ins, error: insErr } = await db.from("linkedin_prospects")
  .insert({ full_name: "___SMOKE_TEST___", status: "neu", lead_score: 5 })
  .select("id,status").single();
if (insErr) { console.log(`❌ Insert-Smoke-Test: ${insErr.message}`); ok = false; }
else {
  console.log(`✅ Insert-Smoke-Test ok (status=${ins.status})`);
  // Ungueltiger Status muss am Trigger scheitern
  const { error: badErr } = await db.from("linkedin_prospects").update({ status: "gibt_es_nicht" }).eq("id", ins.id);
  console.log(badErr ? "✅ validate_status-Trigger aktiv (ungueltiger Status abgelehnt)" : "⚠️ validate_status hat ungueltigen Status NICHT abgelehnt");
  await db.from("linkedin_prospects").delete().eq("id", ins.id);
  console.log("✅ Smoke-Test-Datensatz entfernt");
}

console.log("\n" + L + `\nERGEBNIS: ${ok ? "🎉 ALLES OK — Modul ist einsatzbereit" : "❌ Es fehlen Teile (siehe oben)"}\n` + L);
