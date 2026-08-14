import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await db.from("ad_lead_events")
  .select("id, provider, received_at, external_id, status, error")
  .order("received_at", { ascending: false }).limit(15);
console.log("─".repeat(56));
if (error) console.log("FEHLER:", error.message);
else if (!data.length) console.log("❌ 0 Webhook-Events insgesamt (weder meta noch zapier)");
else for (const e of data) console.log(`${e.received_at} | ${e.provider} | ${e.status} | ${e.external_id ?? "-"} | ${e.error ?? ""}`);
const { count } = await db.from("leads").select("id",{count:"exact",head:true}).is("deleted_at",null);
console.log("─".repeat(56), "\nLeads gesamt:", count);
