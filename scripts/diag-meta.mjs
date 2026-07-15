import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// .env.local laden
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("FEHLT: URL/SERVICE_ROLE"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const line = "─".repeat(60);
console.log(line + "\nMETA-INTEGRATION DIAGNOSE\n" + line);

// 1) ad_integrations
const { data: ai, error: aiErr } = await db.from("ad_integrations").select("*").eq("provider", "meta").maybeSingle();
if (aiErr) console.log("ad_integrations FEHLER:", aiErr.message);
if (!ai) {
  console.log("\n❌ KEINE ad_integrations-Zeile (provider=meta). => nie verbunden.");
} else {
  const cfg = ai.config ?? {};
  console.log("\n✅ Verbindung vorhanden:");
  console.log("   status            :", ai.status);
  console.log("   account_name      :", ai.account_name);
  console.log("   has_credentials   :", Boolean(ai.credentials_encrypted));
  console.log("   pages (config)    :", (cfg.pages ?? []).length, JSON.stringify((cfg.pages ?? []).map(p => p.name)));
  console.log("   forms (gewählt)   :", (cfg.forms ?? []).length, JSON.stringify((cfg.forms ?? []).map(f => f.name)));
  console.log("   webhook_verified  :", ai.webhook_verified);
  console.log("   webhook_last_event:", ai.webhook_last_event_at);
  console.log("   last_sync_at      :", ai.last_sync_at);
  console.log("   last_error        :", ai.last_error);
  // Page-Tokens (nur Anzahl, ohne Entschlüsselung nicht lesbar) — indirekt via has_credentials
}

// 2) ad_lead_events
const { data: evs, error: evErr } = await db
  .from("ad_lead_events")
  .select("id, received_at, signature_valid, external_id, status, error")
  .eq("provider", "meta")
  .order("received_at", { ascending: false })
  .limit(15);
console.log("\n" + line + "\nWEBHOOK-EVENTS (ad_lead_events)\n" + line);
if (evErr) console.log("FEHLER:", evErr.message);
else if (!evs?.length) console.log("❌ 0 Events — es ist NIE ein Webhook-Event von Meta angekommen.");
else {
  console.log(`Anzahl (letzte 15): ${evs.length}`);
  const byStatus = {};
  for (const e of evs) byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
  console.log("Status-Verteilung  :", JSON.stringify(byStatus));
  for (const e of evs.slice(0, 8)) {
    console.log(`  ${e.received_at} | sig=${e.signature_valid} | ${e.status} | ext=${e.external_id} | ${e.error ?? ""}`);
  }
}

// 3) Leads aus Meta
const { count: metaCount } = await db.from("leads").select("id", { count: "exact", head: true }).eq("source", "meta_ads").is("deleted_at", null);
const { count: totalCount } = await db.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null);
console.log("\n" + line + "\nLEADS\n" + line);
console.log("   Leads source=meta_ads :", metaCount ?? 0);
console.log("   Leads gesamt          :", totalCount ?? 0);

// Neueste meta-Leads
const { data: recent } = await db.from("leads")
  .select("contact_name, email, campaign_name, form_name, created_at")
  .eq("source", "meta_ads").is("deleted_at", null)
  .order("created_at", { ascending: false }).limit(5);
if (recent?.length) {
  console.log("   Neueste Meta-Leads:");
  for (const r of recent) console.log(`     ${r.created_at?.slice(0,16)} | ${r.contact_name} | ${r.campaign_name ?? "-"}`);
}
console.log(line);
