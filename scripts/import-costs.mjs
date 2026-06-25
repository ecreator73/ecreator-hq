/**
 * Importiert die MONATLICHEN KOSTEN aus der eCreator-Excel in die expenses-
 * Tabelle (recurring monthly). Damit rechnet Finance Gewinn/Forecast echt.
 * Default DRY-RUN; erst --commit schreibt.
 *
 *   node scripts/import-costs.mjs "<datei.xlsx>" [--sheet="Jun 2026"] [--commit]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

for (const raw of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const l = raw.trim(); if (!l || l.startsWith("#")) continue;
  const i = l.indexOf("="); if (i === -1) continue;
  const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const COMMIT = args.includes("--commit");
const fail = (m) => { console.error(`\n[kosten] FEHLER: ${m}\n`); process.exit(1); };
if (!file) fail("xlsx-Pfad fehlt.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY muessen in .env.local stehen.");

function toRappen(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 100) : null;
  const s = String(v).replace(/[^0-9.,-]/g, "").replace(/'/g, "").replace(",", ".");
  const n = Number(s); return Number.isFinite(n) && s !== "" ? Math.round(n * 100) : null;
}
/** Excel-Kostenname/-kategorie -> EXPENSE_CATEGORIES-Key. */
function mapCategory(title, cat) {
  const s = `${title} ${cat}`.toLowerCase();
  if (/\bai\b|k\.?i\.?|tool/.test(s)) return "ai_tools";
  if (/video/.test(s)) return "videographer";
  if (/model/.test(s)) return "models";
  if (/buero|büro|office|infrastruktur|miete/.test(s)) return "office";
  if (/ads|marketing|werb/.test(s)) return "advertising";
  if (/host/.test(s)) return "hosting";
  if (/software/.test(s)) return "software";
  if (/reise|travel/.test(s)) return "travel";
  if (/freelanc|provision|lohn|personal/.test(s)) return "freelancer";
  return "other";
}
const fmtChf = (r) => (r == null ? "—" : (r / 100).toLocaleString("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }));

const wb = XLSX.readFile(resolve(process.cwd(), file), { cellDates: true });
const sheetName = flag("sheet", wb.SheetNames.includes("Jun 2026") ? "Jun 2026" : wb.SheetNames[wb.SheetNames.length - 1]);
if (!wb.SheetNames.includes(sheetName)) fail(`Blatt "${sheetName}" nicht gefunden.`);
const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false, defval: "" });

// Block "MONATLICHE KOSTEN" finden -> Header "Kostenposition" -> Zeilen bis "GESAMT KOSTEN".
const startIdx = grid.findIndex((r) => /monatliche kosten/i.test(String(r[0] ?? "")));
const headerIdx = grid.findIndex((r, i) => i > startIdx && /kostenposition/i.test(String(r[0] ?? "")));
if (startIdx === -1 || headerIdx === -1) fail("Block 'MONATLICHE KOSTEN' / 'Kostenposition' nicht gefunden.");

const costs = [];
for (let i = headerIdx + 1; i < grid.length; i++) {
  const title = String(grid[i][0] ?? "").trim();
  if (/^(gesamt|total|monatliche zusammen|summe)/i.test(title)) break;
  if (!title) continue;
  const amount = toRappen(grid[i][1]);
  if (amount == null || amount === 0) continue; // ohne Betrag (z.B. Lohn offen) ueberspringen
  costs.push({ title, amount, category: mapCategory(title, String(grid[i][2] ?? "")) });
}

const now = new Date();
const dateIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  console.log(`\n[kosten] Datei: ${file} | Blatt "${sheetName}" | ${COMMIT ? "COMMIT" : "DRY-RUN"}`);
  console.log(`[kosten] ${costs.length} Kostenpositionen mit Betrag erkannt:\n`);
  const { data: existing } = await supabase.from("expenses").select("title").is("deleted_at", null);
  const have = new Set((existing ?? []).map((e) => String(e.title).trim().toLowerCase()));

  let total = 0, willWrite = 0, skip = 0;
  for (const c of costs) {
    const dup = have.has(c.title.toLowerCase());
    if (!dup) { willWrite++; total += c.amount; }
    else skip++;
    console.log(`  ${c.title.padEnd(24)} | ${fmtChf(c.amount).padStart(11)} | ${c.category.padEnd(12)} | ${dup ? "vorhanden" : "neu"}`);
  }
  console.log(`\n[kosten] ${COMMIT ? "Schreibe" : "Wuerde schreiben"}: ${willWrite} (uebersprungen ${skip}). Summe neu: ${fmtChf(total)}/Monat`);

  if (!COMMIT) { console.log(`\n[kosten] DRY-RUN — nichts geschrieben. Mit --commit ausfuehren.\n`); return; }
  let written = 0; const errors = [];
  for (const c of costs) {
    if (have.has(c.title.toLowerCase())) continue;
    const { error } = await supabase.from("expenses").insert({
      title: c.title, category: c.category, amount: c.amount,
      recurring: true, recurring_frequency: "monthly", date: dateIso,
    });
    if (error) errors.push({ title: c.title, error: error.message }); else written++;
  }
  console.log(`\n[kosten] GESCHRIEBEN: ${written} Kostenpositionen.`);
  if (errors.length) errors.forEach((e) => console.log(`   ${e.title}: ${e.error}`));
  console.log("");
}
main().catch((e) => fail(e.message ?? String(e)));
