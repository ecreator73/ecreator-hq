/**
 * Importiert die manuellen Monatszahlen aus "eCreator Ziele und Zahlen.xlsx"
 * in die Tabelle monthly_financials.
 *   - Umsaetze = Netto Umsatz/Monat (Spalte 4) je Kunde
 *   - Kosten   = Kostenpositionen (Betrag/Monat) inkl. Kategorie
 * DRY-RUN per Default. Mit --commit wird geschrieben. Idempotent: bereits
 * vorhandene (Monat, kind, label) werden uebersprungen.
 *
 *   node scripts/import-monthly.mjs               # Dry-Run
 *   node scripts/import-monthly.mjs --commit      # schreiben
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

for (const raw of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const l = raw.trim(); if (!l || l.startsWith("#")) continue;
  const i = l.indexOf("="); if (i === -1) continue;
  const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}

const FILE = process.argv[2] && !process.argv[2].startsWith("--")
  ? process.argv[2]
  : "C:/Users/Win11/Downloads/eCreator Ziele und Zahlen.xlsx";
const COMMIT = process.argv.includes("--commit");

const MONTHS = { jan: 1, feb: 2, "mär": 3, maer: 3, mar: 3, apr: 4, mai: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dez: 12 };
const CHF = (r) => new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(r / 100);

function monthFromSheet(name) {
  const m = name.trim().toLowerCase().match(/^([a-zä]+)\.?\s+(\d{4})$/);
  if (!m) return null;
  const mi = MONTHS[m[1]];
  if (!mi) return null;
  return `${m[2]}-${String(mi).padStart(2, "0")}-01`;
}
function toRappen(v) {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v).replace(/['\s]/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

const wb = XLSX.readFile(FILE, { cellDates: true });
const all = [];

for (const name of wb.SheetNames) {
  const month = monthFromSheet(name);
  if (!month) { console.warn(`! Blatt "${name}" ignoriert (kein Monat erkannt)`); continue; }
  const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: "" });

  let mode = null, order = 0;
  for (const r of data) {
    const c0 = String(r[0] ?? "").trim();
    if (/^Kunde$/i.test(c0)) { mode = "rev"; order = 0; continue; }
    if (/^Kostenposition$/i.test(c0)) { mode = "cost"; order = 0; continue; }
    if (/^GESAMT/i.test(c0) || /^MONATLICHE/i.test(c0) || /^KUNDEN/i.test(c0) || /ZUSAMMENFASSUNG/i.test(c0)) { mode = null; continue; }
    if (!c0) continue;
    if (mode === "rev") {
      all.push({ month, kind: "revenue", label: c0, amount: toRappen(r[3]) ?? 0, category: null, note: String(r[6] ?? "").trim() || null, sort_order: order++ });
    } else if (mode === "cost") {
      all.push({ month, kind: "cost", label: c0, amount: toRappen(r[1]) ?? 0, category: String(r[2] ?? "").trim() || null, note: null, sort_order: order++ });
    }
  }
}

// Pro-Monat-Zusammenfassung
const byMonth = new Map();
for (const e of all) {
  if (!byMonth.has(e.month)) byMonth.set(e.month, { rev: 0, cost: 0, nRev: 0, nCost: 0 });
  const b = byMonth.get(e.month);
  if (e.kind === "revenue") { b.rev += e.amount; b.nRev++; } else { b.cost += e.amount; b.nCost++; }
}
console.log(`\nDatei: ${FILE}`);
console.log(`Geparst: ${all.length} Posten ueber ${byMonth.size} Monate\n`);
console.log("Monat        Umsaetze            Kosten              Gewinn");
console.log("-----------------------------------------------------------------");
for (const [month, b] of [...byMonth.entries()].sort()) {
  console.log(
    `${month}  ${`${CHF(b.rev)} (${b.nRev})`.padEnd(20)}${`${CHF(b.cost)} (${b.nCost})`.padEnd(20)}${CHF(b.rev - b.cost)}`,
  );
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const months = [...byMonth.keys()];
const { data: existing } = await sb
  .from("monthly_financials")
  .select("month, kind, label")
  .in("month", months)
  .is("deleted_at", null);
const seen = new Set((existing ?? []).map((e) => `${String(e.month).slice(0, 10)}|${e.kind}|${e.label.trim().toLowerCase()}`));
const toInsert = all.filter((e) => !seen.has(`${e.month}|${e.kind}|${e.label.trim().toLowerCase()}`));

console.log(`\nBereits vorhanden: ${all.length - toInsert.length} | Neu einzufuegen: ${toInsert.length}`);

if (!COMMIT) {
  console.log("\nDRY-RUN — nichts geschrieben. Mit --commit ausfuehren.\n");
  process.exit(0);
}

if (toInsert.length === 0) {
  console.log("\nNichts zu tun.\n");
  process.exit(0);
}
const { error } = await sb.from("monthly_financials").insert(toInsert);
if (error) { console.error("FEHLER:", error.message); process.exit(1); }
console.log(`\n✓ ${toInsert.length} Posten geschrieben.`);

// Verifikation gegen DB
const { data: after } = await sb.from("monthly_financials").select("month, kind, amount").in("month", months).is("deleted_at", null);
const verify = new Map();
for (const e of after ?? []) {
  const key = String(e.month).slice(0, 10);
  if (!verify.has(key)) verify.set(key, { rev: 0, cost: 0 });
  const b = verify.get(key);
  if (e.kind === "revenue") b.rev += e.amount ?? 0; else b.cost += e.amount ?? 0;
}
console.log("\nDB nach Import:");
for (const [month, b] of [...verify.entries()].sort()) {
  console.log(`  ${month}  Umsatz ${CHF(b.rev)} | Kosten ${CHF(b.cost)} | Gewinn ${CHF(b.rev - b.cost)}`);
}
console.log("");
