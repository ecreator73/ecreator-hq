/**
 * Einmaliger Kunden-Import aus CSV (Excel -> CSV UTF-8) in eCreator OS.
 *
 * Liest .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) und
 * legt Kunden (status=active) + optional einen aktiven Vertrag (MRR) an.
 * Auto-Mapping der Spalten (Kunde/Umsatz/Netto Umsatz/Startdatum/Laufzeit/
 * Bemerkungen). Standardmaessig DRY-RUN (zeigt nur, was passieren wuerde) -
 * erst mit --commit wird geschrieben.
 *
 * Nutzung:
 *   node scripts/import-customers.mjs "<pfad/zur/datei.csv>" [optionen]
 * Optionen:
 *   --commit              tatsaechlich schreiben (sonst Vorschau)
 *   --mode=total|monthly  ist "Umsatz" Gesamtwert/Laufzeit (default) oder MRR?
 *   --basis=net|gross     Vertragswert aus Netto Umsatz (default) oder Umsatz
 *   --no-contract         keinen Vertrag anlegen (nur Kunde)
 *   --on-dup=skip|create  bei vorhandenem Kunden ueberspringen (default) / anlegen
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/* ---------- .env.local laden ---------- */
function loadEnvLocal() {
  try {
    const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const raw of file.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
        value = value.slice(1, -1);
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}
loadEnvLocal();

/* ---------- Argumente ---------- */
const args = process.argv.slice(2);
const path = args.find((a) => !a.startsWith("--"));
const flag = (name, def) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : def;
};
const COMMIT = args.includes("--commit");
const MODE = flag("mode", "total"); // total | monthly
const BASIS = flag("basis", "net"); // net | gross
const CREATE_CONTRACT = !args.includes("--no-contract");
const ON_DUP = flag("on-dup", "skip"); // skip | create

function fail(m) {
  console.error(`\n[import] FEHLER: ${m}\n`);
  process.exit(1);
}
if (!path) fail('Bitte CSV-Pfad angeben: node scripts/import-customers.mjs "datei.csv" [--commit]');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen in .env.local stehen.");

/* ---------- CSV-Parser (Quotes, ; / , / Tab, BOM, CRLF) ---------- */
function detectDelimiter(headerLine) {
  let best = ",", bestCount = -1;
  for (const d of [";", ",", "\t"]) {
    const c = headerLine.split(d).length;
    if (c > bestCount) { bestCount = c; best = d; }
  }
  return best;
}
function tokenize(text, delim) {
  const records = []; let field = "", row = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); records.push(row); row = []; field = ""; }
    else if (ch === "\r") { /* skip */ }
    else field += ch;
  }
  row.push(field); records.push(row);
  return records;
}
function parseCsv(input) {
  const text = input.replace(/^﻿/, "");
  if (!text.trim()) return { headers: [], rows: [] };
  const fb = text.search(/\r?\n/);
  const delim = detectDelimiter(fb === -1 ? text : text.slice(0, fb));
  const recs = tokenize(text, delim);
  const headers = recs[0].map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < recs.length; i++) {
    const o = {}; headers.forEach((h, idx) => (o[h] = (recs[idx + 0] ? recs[i][idx] ?? "" : "").trim()));
    if (Object.values(o).some((v) => v !== "")) rows.push(o);
  }
  return { headers, rows };
}

/* ---------- Wert-Parser ---------- */
function parseChfToRappen(raw) {
  if (raw == null) return null;
  let s = String(raw).trim(); if (!s) return null;
  s = s.replace(/chf|fr\.?|sfr\.?/gi, "").trim().replace(/['\s ]/g, "");
  const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
  if (lc > -1 && ld > -1) { if (lc > ld) s = s.replace(/\./g, "").replace(",", "."); else s = s.replace(/,/g, ""); }
  else if (lc > -1) { const dec = s.length - lc - 1; s = dec === 3 ? s.replace(/,/g, "") : s.replace(",", "."); }
  s = s.replace(/[^0-9.\-]/g, "");
  if (!s || s === "-" || s === ".") return null;
  const n = Number(s); return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function parseDateToIso(raw) {
  if (raw == null) return null;
  const s = String(raw).trim(); if (!s) return null;
  const pad = (n) => String(n).padStart(2, "0");
  const ok = (y, mo, d) => (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(mo)}-${pad(d)}` : null);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return ok(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (m) { let y = +m[3]; if (y < 100) y += y < 50 ? 2000 : 1900; return ok(y, +m[2], +m[1]); }
  return null;
}
function parseIntSafe(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[^0-9\-]/g, ""); if (!s || s === "-") return null;
  const n = parseInt(s, 10); return Number.isFinite(n) ? n : null;
}
function addMonthsIso(iso, months) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null;
  const base = +m[2] - 1 + months, ny = +m[1] + Math.floor(base / 12), nmo = ((base % 12) + 12) % 12;
  const dim = new Date(Date.UTC(ny, nmo + 1, 0)).getUTCDate(), nd = Math.min(+m[3], dim);
  const pad = (n) => String(n).padStart(2, "0");
  return `${ny}-${pad(nmo + 1)}-${pad(nd)}`;
}

/* ---------- Auto-Mapping ---------- */
const ALIASES = {
  name: ["kunde", "kundenname", "firma", "name", "company", "client"],
  revenue_gross: ["umsatz", "umsatz brutto", "bruttoumsatz", "revenue", "total"],
  revenue_net: ["netto umsatz", "nettoumsatz", "umsatz netto", "net", "netto"],
  start_date: ["startdatum", "start", "beginn", "vertragsbeginn", "datum", "seit"],
  term_months: ["laufzeit", "laufzeit (monate)", "monate", "term", "dauer"],
  notes: ["bemerkungen", "bemerkung", "notiz", "notizen", "kommentar", "anmerkung", "info"],
};
function autoMap(headers) {
  const map = {}; const used = new Set();
  for (const [field, al] of Object.entries(ALIASES)) {
    const h = headers.find((x) => !used.has(x) && (x.toLowerCase() === field || al.includes(x.toLowerCase())));
    if (h) { map[field] = h; used.add(h); }
  }
  return map;
}

/* ---------- Hauptlauf ---------- */
const fmtChf = (r) => (r == null ? "-" : (r / 100).toLocaleString("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }));
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const text = readFileSync(resolve(process.cwd(), path), "utf8");
  const { headers, rows } = parseCsv(text);
  if (rows.length === 0) fail("Keine Datenzeilen gefunden.");
  const map = autoMap(headers);

  console.log(`\n[import] Datei: ${path}`);
  console.log(`[import] ${rows.length} Zeilen, ${headers.length} Spalten.`);
  console.log(`[import] Spalten erkannt:`, headers.join(" | "));
  console.log(`[import] Zuordnung:`, Object.entries(map).map(([k, v]) => `${k} <- "${v}"`).join(", ") || "(keine!)");
  console.log(`[import] Modus: Umsatz=${MODE}, Basis=${BASIS}, Vertrag=${CREATE_CONTRACT ? "ja" : "nein"}, Dublette=${ON_DUP}`);
  if (!map.name) fail('Spalte "Kunde" konnte nicht zugeordnet werden. Header pruefen.');

  const { data: existing } = await supabase.from("clients").select("id,name").is("deleted_at", null);
  const nameMap = new Map((existing ?? []).map((c) => [String(c.name).trim().toLowerCase(), c.id]));

  let clientsCreated = 0, contractsCreated = 0, skipped = 0, totalMrr = 0;
  const errors = [];
  console.log(`\n  #  | Kunde                          | Start      | Monatswert  | Gesamtwert  | Aktion`);
  console.log(`  ---+--------------------------------+------------+-------------+-------------+--------`);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = (map.name ? r[map.name] : "").trim();
    if (!name) { errors.push({ row: i + 1, error: "Kunde fehlt" }); continue; }
    const key = name.toLowerCase();
    const start = map.start_date ? parseDateToIso(r[map.start_date]) : null;
    const term = map.term_months ? parseIntSafe(r[map.term_months]) : null;
    const net = map.revenue_net ? parseChfToRappen(r[map.revenue_net]) : null;
    const gross = map.revenue_gross ? parseChfToRappen(r[map.revenue_gross]) : null;
    const revenue = BASIS === "net" ? (net ?? gross) : (gross ?? net);
    let vm = null, vt = null;
    if (revenue != null) {
      if (MODE === "monthly") { vm = revenue; vt = term ? revenue * term : null; }
      else { vt = revenue; vm = term && term > 0 ? Math.round(revenue / term) : null; }
    }
    const end = start && term ? addMonthsIso(start, term) : null;
    const notes = map.notes ? r[map.notes] || null : null;

    const exists = nameMap.has(key);
    let action = exists ? (ON_DUP === "skip" ? "skip" : "create+") : "create";
    if (action === "skip") skipped++;
    else if (CREATE_CONTRACT && vm) totalMrr += vm;

    console.log(
      `  ${String(i + 1).padStart(2)} | ${name.slice(0, 30).padEnd(30)} | ${(start ?? "-").padEnd(10)} | ${fmtChf(vm).padStart(11)} | ${fmtChf(vt).padStart(11)} | ${action}`,
    );

    if (!COMMIT) continue;
    try {
      let clientId = nameMap.get(key);
      if (!clientId) {
        const { data, error } = await supabase.from("clients").insert({ name, status: "active", start_date: start, notes }).select("id").single();
        if (error) throw error;
        clientId = data.id; nameMap.set(key, clientId); clientsCreated++;
      } else if (ON_DUP === "skip") continue;
      if (CREATE_CONTRACT && clientId) {
        const { error } = await supabase.from("contracts").insert({ client_id: clientId, title: "Vertrag", status: "active", start_date: start, end_date: end, value_monthly: vm, value_total: vt });
        if (error) throw error;
        contractsCreated++;
      }
    } catch (e) {
      errors.push({ row: i + 1, error: e.message ?? String(e) });
    }
  }

  console.log(`\n[import] ${COMMIT ? "GESCHRIEBEN" : "VORSCHAU (dry-run)"} - Kunden: ${clientsCreated}, Vertraege: ${contractsCreated}, uebersprungen: ${skipped}, MRR neu: ${fmtChf(totalMrr)}`);
  if (errors.length) {
    console.log(`[import] ${errors.length} Fehler:`);
    for (const e of errors.slice(0, 50)) console.log(`   Zeile ${e.row}: ${e.error}`);
  }
  if (!COMMIT) console.log(`\n[import] Nichts geschrieben. Mit --commit ausfuehren, um zu importieren.\n`);
}

main().catch((e) => fail(e.message ?? String(e)));
