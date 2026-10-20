// Bestehende oeffentliche Links aus dem Lovable-CRM in eCreator OS weiter gueltig machen:
// Unterschrifts-Token der Vertraege (/signieren/contract/<token>) und Review-Token der
// Shootings (/shoot-review/<token>). Setzt nur leere Felder, ueberschreibt nichts.
//
//   node scripts/import-lovable-tokens.mjs <export.json> [--dry]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!file) {
  console.error("Aufruf: node scripts/import-lovable-tokens.mjs <export.json> [--dry]");
  process.exit(1);
}
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const X = JSON.parse(readFileSync(file, "utf8")).tables;
const valid = (t) => typeof t === "string" && /^[\w-]{20,100}$/.test(t);

let contracts = 0;
let shoots = 0;
let skipped = 0;
for (const [table, rows, column] of [["contracts", X.contracts ?? [], "sign_token"], ["shoots", X.shoots ?? [], "share_token"]]) {
  for (const r of rows) {
    const token = r[column];
    if (!valid(token)) {
      if (token) skipped++;
      continue;
    }
    if (DRY) continue;
    const { data, error } = await db.from(table).update({ [column]: token }).eq("legacy_id", r.id).is(column, null).select("id");
    if (error) throw new Error(`${table}: ${error.message}`);
    if (data?.length) table === "contracts" ? contracts++ : shoots++;
  }
}
console.log(`Uebernommene Links: ${contracts} Vertraege, ${shoots} Shootings${skipped ? `, ${skipped} Tokens im falschen Format uebersprungen` : ""}`);
