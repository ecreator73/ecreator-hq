/** Read-only-Pruefung des Imports: aktive Kunden, aktive Vertraege, MRR. */
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
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const chf = (r) => (r / 100).toLocaleString("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 });

const { count: activeClients } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null);
const { data: contracts } = await supabase.from("contracts").select("value_monthly,status").eq("status", "active").is("deleted_at", null);
const mrr = (contracts ?? []).reduce((s, c) => s + (c.value_monthly ?? 0), 0);
console.log(`\nAktive Kunden:    ${activeClients}`);
console.log(`Aktive Vertraege: ${(contracts ?? []).length}`);
console.log(`MRR (Summe):      ${chf(mrr)}`);
console.log(`ARR (x12):        ${chf(mrr * 12)}\n`);
