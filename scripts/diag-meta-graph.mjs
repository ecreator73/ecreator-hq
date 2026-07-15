import { readFileSync } from "node:fs";
import { createDecipheriv, scryptSync } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// --- .env.local laden ---
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// --- Decrypt (spiegelt src/lib/crypto.ts) ---
const SALT = "ecreator-os.integration.v1";
function decryptSecret(payload) {
  const key = scryptSync(env.CREDENTIALS_SECRET, SALT, 32);
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), data = raw.subarray(28);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

const V = env.META_GRAPH_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${V}`;
async function g(path, token, params = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

const L = "─".repeat(64);
console.log(L + "\nMETA GRAPH DIAGNOSE (direkt gegen Facebook)\n" + L);

const { data: row } = await db.from("ad_integrations").select("*").eq("provider", "meta").maybeSingle();
if (!row?.credentials_encrypted) { console.log("❌ Keine credentials_encrypted — nie verbunden."); process.exit(0); }

let creds;
try { creds = JSON.parse(decryptSecret(row.credentials_encrypted)); }
catch (e) { console.log("❌ Entschlüsselung fehlgeschlagen:", e.message, "\n   (CREDENTIALS_SECRET lokal ≠ Vercel?)"); process.exit(1); }

const userToken = creds.user_token;
console.log("user_token vorhanden :", Boolean(userToken));
console.log("page_tokens gespeich.:", Object.keys(creds.page_tokens ?? {}).length);

if (!userToken) { console.log("❌ Kein user_token gespeichert."); process.exit(0); }

// 1) Token gültig? Wer?
const me = await g("me", userToken, { fields: "id,name" });
console.log("\n[me]        ", me.ok ? `✅ ${me.json.name} (${me.json.id})` : `❌ ${me.status} ${me.json?.error?.message}`);
if (!me.ok) {
  console.log("   → Token ungültig/abgelaufen ODER App verlangt appsecret_proof (dann von hier nicht prüfbar).");
}

// 2) Erteilte Berechtigungen
const perms = await g("me/permissions", userToken);
console.log("\n[permissions]", perms.ok ? "" : `❌ ${perms.status} ${perms.json?.error?.message}`);
if (perms.ok) {
  for (const p of perms.json.data ?? []) {
    const mark = p.status === "granted" ? "✅" : "⛔";
    console.log(`   ${mark} ${p.permission} = ${p.status}`);
  }
}

// 3) Seiten via me/accounts
const acc = await g("me/accounts", userToken, { fields: "id,name,access_token,tasks", limit: "100" });
console.log("\n[me/accounts]", acc.ok ? `${(acc.json.data ?? []).length} Seite(n)` : `❌ ${acc.status} ${acc.json?.error?.message}`);
for (const p of acc.json?.data ?? []) console.log(`   • ${p.name} (${p.id}) tasks=${(p.tasks ?? []).join(",")}`);

// 4) Businesses + deren Seiten (New Pages Experience / Business Manager)
const biz = await g("me/businesses", userToken, { fields: "id,name", limit: "50" });
console.log("\n[me/businesses]", biz.ok ? `${(biz.json.data ?? []).length} Business(es)` : `❌ ${biz.status} ${biz.json?.error?.message}`);
for (const b of biz.json?.data ?? []) {
  console.log(`   ⌂ ${b.name} (${b.id})`);
  const owned = await g(`${b.id}/owned_pages`, userToken, { fields: "id,name", limit: "50" });
  const client = await g(`${b.id}/client_pages`, userToken, { fields: "id,name", limit: "50" });
  for (const p of owned.json?.data ?? []) console.log(`      owned:  ${p.name} (${p.id})`);
  for (const p of client.json?.data ?? []) console.log(`      client: ${p.name} (${p.id})`);
  if (!(owned.json?.data ?? []).length && !(client.json?.data ?? []).length) {
    console.log(`      (keine Seiten sichtbar — owned:${owned.status} client:${client.status})`);
  }
}
console.log("\n" + L);
