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

// 1) Tabelle + Spalten existieren?
const sel = await sb.from("monthly_financials").select("id, month, kind, label, amount, category, note, sort_order, created_at").limit(1);
console.log("1) SELECT:", sel.error ? `FEHLER ${sel.error.code} — ${sel.error.message}` : `OK (vorhandene Zeilen: ${sel.data.length})`);
if (sel.error) process.exit(1);

// 2) Insert (Schreiben + Default amount + Trigger)
const ins = await sb.from("monthly_financials")
  .insert({ month: "2099-01-01", kind: "revenue", label: "__verify__", amount: 12345 })
  .select("id, amount, created_at, updated_at").single();
console.log("2) INSERT:", ins.error ? `FEHLER ${ins.error.message}` : `OK (id ${ins.data.id}, amount ${ins.data.amount})`);

// 3) Check-Constraint (ungueltiges kind muss scheitern)
const bad = await sb.from("monthly_financials").insert({ month: "2099-01-01", kind: "xxx", label: "__bad__", amount: 0 });
console.log("3) CHECK-Constraint:", bad.error ? `OK (ungueltiges kind abgelehnt: ${bad.error.code})` : "WARNUNG: ungueltiges kind wurde akzeptiert!");

// 4) Aufraeumen (hard delete der Testzeilen)
const del = await sb.from("monthly_financials").delete().eq("month", "2099-01-01");
console.log("4) CLEANUP:", del.error ? `FEHLER ${del.error.message}` : "OK (Testzeilen geloescht)");

const after = await sb.from("monthly_financials").select("id").eq("month", "2099-01-01");
console.log("   uebrig:", (after.data ?? []).length);
