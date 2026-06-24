/**
 * Tailored Import der eCreator-Kundenuebersicht (xlsx, Monats-Snapshots) in
 * eCreator OS. Liest ein Monatsblatt (Default aktueller Monat), nimmt die
 * Kundenzeilen bis "GESAMT KUNDEN", legt je Kunde einen aktiven Kunden + aktiven
 * Retainer-Vertrag an (MRR = Netto Umsatz/Monat). Default DRY-RUN.
 *
 *   node scripts/import-ecreator-customers.mjs "<datei.xlsx>" [optionen]
 *   --sheet="Jun 2026"   Monatsblatt (Default: letztes mit Daten / aktueller Monat)
 *   --basis=net|gross    MRR aus Netto (default) oder Brutto Umsatz/Monat
 *   --commit             tatsaechlich schreiben (sonst nur Vorschau)
 *   --on-dup=skip|create bei vorhandenem Kunden ueberspringen (default)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

function loadEnvLocal() {
  try {
    const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const raw of file.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {}
}
loadEnvLocal();

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const COMMIT = args.includes("--commit");
const BASIS = flag("basis", "net");
const ON_DUP = flag("on-dup", "skip");
const fail = (m) => { console.error(`\n[import] FEHLER: ${m}\n`); process.exit(1); };
if (!file) fail("xlsx-Pfad fehlt.");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY muessen in .env.local stehen.");

/* ---- Parser ---- */
function toRappen(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 100) : null;
  let s = String(v).trim().replace(/chf|fr\.?|sfr\.?/gi, "").trim().replace(/['\s ]/g, "");
  const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
  if (lc > -1 && ld > -1) s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (lc > -1) s = s.length - lc - 1 === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  s = s.replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) && s !== "" ? Math.round(n * 100) : null;
}
const pad = (n) => String(n).padStart(2, "0");
function toIso(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (m) { let y = +m[3]; if (y < 100) y += y < 50 ? 2000 : 1900; return `${y}-${pad(+m[2])}-${pad(+m[1])}`; }
  return null;
}
function addMonths(iso, months) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null;
  const base = +m[2] - 1 + months, ny = +m[1] + Math.floor(base / 12), nmo = ((base % 12) + 12) % 12;
  const dim = new Date(Date.UTC(ny, nmo + 1, 0)).getUTCDate();
  return `${ny}-${pad(nmo + 1)}-${pad(Math.min(+m[3], dim))}`;
}
/** Laufzeit-Freitext -> { endDate, ongoing, termMonths }. */
function parseLaufzeit(rawV, start) {
  const s = String(rawV ?? "").trim();
  if (!s) return { endDate: null, ongoing: false, term: null };
  let m = s.match(/laufend\s+bis\s+(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/i);
  if (m) return { endDate: toIso(m[1]), ongoing: true, term: null };
  if (/laufend|monatlich/i.test(s)) return { endDate: null, ongoing: true, term: null };
  m = s.match(/(\d+)\s*monat/i);
  if (m) { const t = +m[1]; return { endDate: start ? addMonths(start, t) : null, ongoing: false, term: t }; }
  return { endDate: null, ongoing: false, term: null };
}
const fmtChf = (r) => (r == null ? "—" : (r / 100).toLocaleString("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }));

/* ---- Blatt waehlen + Kundenzeilen extrahieren ---- */
const wb = XLSX.readFile(resolve(process.cwd(), file), { cellDates: true });
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const now = new Date();
const currentName = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
const sheetName = flag("sheet", wb.SheetNames.includes(currentName) ? currentName : wb.SheetNames[wb.SheetNames.length - 1]);
if (!wb.SheetNames.includes(sheetName)) fail(`Blatt "${sheetName}" nicht gefunden. Vorhanden: ${wb.SheetNames.join(", ")}`);
const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false, defval: "" });

const headerIdx = grid.findIndex((r) => String(r[0] ?? "").trim().toLowerCase() === "kunde");
if (headerIdx === -1) fail("Kopfzeile mit 'Kunde' nicht gefunden.");

const customers = [];
for (let i = headerIdx + 1; i < grid.length; i++) {
  const r = grid[i];
  const name = String(r[0] ?? "").trim();
  if (/^(gesamt|total|ziel|kosten|gewinn|summe)/i.test(name)) break; // Ende des Kundenblocks
  if (!name) continue;
  const brutto = toRappen(r[1]);
  const netto = toRappen(r[3]);
  const start = toIso(r[4]);
  const lz = parseLaufzeit(r[5], start);
  const mrr = BASIS === "net" ? (netto ?? brutto) : (brutto ?? netto);
  customers.push({ name, brutto, netto, mrr, start, laufzeitRaw: String(r[5] ?? "").trim(), end: lz.endDate, ongoing: lz.ongoing, term: lz.term, notes: String(r[6] ?? "").trim() || null });
}

/* ---- Lauf ---- */
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  console.log(`\n[import] Datei: ${file}`);
  console.log(`[import] Blatt: "${sheetName}"  |  Basis: ${BASIS === "net" ? "Netto Umsatz/Monat" : "Brutto Umsatz/Monat"}  |  ${COMMIT ? "COMMIT" : "DRY-RUN"}`);
  console.log(`[import] ${customers.length} Kundenzeilen erkannt.\n`);

  const { data: existing } = await supabase.from("clients").select("id,name").is("deleted_at", null);
  const nameMap = new Map((existing ?? []).map((c) => [String(c.name).trim().toLowerCase(), c.id]));

  console.log(`  #  | Kunde                              | MRR (netto) | Start      | Ende/Laufzeit            | Status`);
  console.log(`  ---+------------------------------------+-------------+------------+--------------------------+--------`);
  let totalMrr = 0, willCreate = 0, willSkip = 0;
  customers.forEach((c, i) => {
    const exists = nameMap.has(c.name.toLowerCase());
    const action = exists ? (ON_DUP === "skip" ? "skip" : "dup+") : "neu";
    if (action === "skip") willSkip++; else { willCreate++; if (c.mrr) totalMrr += c.mrr; }
    const endTxt = c.end ? c.end + (c.ongoing ? " (laufend)" : "") : c.ongoing ? "laufend" : c.laufzeitRaw || "—";
    console.log(`  ${String(i + 1).padStart(2)} | ${c.name.slice(0, 34).padEnd(34)} | ${fmtChf(c.mrr).padStart(11)} | ${(c.start ?? "—").padEnd(10)} | ${endTxt.slice(0, 24).padEnd(24)} | ${action}`);
  });
  console.log(`\n[import] ${COMMIT ? "Schreibe" : "Wuerde anlegen"}: ${willCreate} Kunden+Vertraege, ${willSkip} uebersprungen.  Neue MRR gesamt: ${fmtChf(totalMrr)}`);

  if (!COMMIT) { console.log(`\n[import] DRY-RUN — nichts geschrieben. Mit --commit ausfuehren.\n`); return; }

  let clientsCreated = 0, contractsCreated = 0; const errors = [];
  for (const c of customers) {
    const key = c.name.toLowerCase();
    try {
      let clientId = nameMap.get(key);
      if (clientId && ON_DUP === "skip") continue;
      if (!clientId) {
        const { data, error } = await supabase.from("clients").insert({ name: c.name, status: "active", start_date: c.start, notes: c.notes }).select("id").single();
        if (error) throw error;
        clientId = data.id; nameMap.set(key, clientId); clientsCreated++;
      }
      const { error: cErr } = await supabase.from("contracts").insert({
        client_id: clientId, title: "Retainer", contract_type: "retainer", status: "active",
        start_date: c.start, end_date: c.end, renewal_type: c.ongoing ? "auto" : c.term ? "manual" : null,
        value_monthly: c.mrr, value_total: c.mrr && c.term ? c.mrr * c.term : null,
      });
      if (cErr) throw cErr;
      contractsCreated++;
    } catch (e) {
      errors.push({ name: c.name, error: e.message ?? String(e) });
    }
  }
  console.log(`\n[import] GESCHRIEBEN: ${clientsCreated} Kunden, ${contractsCreated} Vertraege.`);
  if (errors.length) { console.log(`[import] ${errors.length} Fehler:`); errors.forEach((e) => console.log(`   ${e.name}: ${e.error}`)); }
  console.log("");
}
main().catch((e) => fail(e.message ?? String(e)));
