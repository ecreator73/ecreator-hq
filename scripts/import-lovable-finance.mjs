// Import des Lovable-CRM nach eCreator OS - Stufe 4 (Finance).
//
//   node scripts/import-lovable-finance.mjs <export.json> [--dry]
//
// Rechnungen (inkl. Positionen, QR-Referenz, Periode, MWST) -> invoices/invoice_items,
// Kundennummer aus der Rechnungsnummer (KD-100017-83 -> 100017) -> clients.customer_number,
// Umsatz- und Kostenzeilen pro Monat -> monthly_financials (wie die bestehenden Monate).
// Betraege in Rappen. Testrechnungen (is_test) werden nicht uebernommen.
// Idempotent (legacy_id). Gibt nur Zahlen aus.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!file) {
  console.error("Aufruf: node scripts/import-lovable-finance.mjs <export.json> [--dry]");
  process.exit(1);
}
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const X = JSON.parse(readFileSync(file, "utf8")).tables;
const log = (...a) => console.log(...a);
const rappen = (v) => (v == null || v === "" ? null : Math.round(Number(v) * 100));
const clean = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());
const must = (r, what) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

async function upsert(table, rows) {
  const ids = new Map();
  if (!rows.length) return ids;
  const existing = must(await db.from(table).select("id, legacy_id").in("legacy_id", rows.map((r) => r.legacy_id)), `${table} lesen`);
  for (const e of existing) ids.set(e.legacy_id, e.id);
  if (DRY) return ids;
  for (const r of rows) {
    if (ids.has(r.legacy_id)) must(await db.from(table).update(r).eq("id", ids.get(r.legacy_id)), `${table} aktualisieren`);
    else ids.set(r.legacy_id, must(await db.from(table).insert(r).select("id").single(), `${table} einfuegen`).id);
  }
  return ids;
}

/* Team, Kunden, Vertraege --------------------------------------------------------- */
const lovProfiles = new Map(X.profiles.map((p) => [p.user_id, (p.email ?? "").toLowerCase()]));
const osProfiles = must(await db.from("profiles").select("id, email"), "profiles");
const osByEmail = new Map(osProfiles.map((p) => [String(p.email ?? "").toLowerCase(), p.id]));
const userId = (lovId) => (lovId ? osByEmail.get(lovProfiles.get(lovId)) ?? null : null);
const osClients = must(await db.from("clients").select("id, name, legacy_id"), "clients");
const clientByLegacy = new Map(osClients.filter((c) => c.legacy_id).map((c) => [c.legacy_id, c.id]));
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9äöü]/g, "");
const clientByName = new Map(osClients.map((c) => [norm(c.name), c.id]));
const contracts = must(await db.from("contracts").select("id, legacy_id").not("legacy_id", "is", null), "contracts");
const contractByLegacy = new Map(contracts.map((c) => [c.legacy_id, c.id]));

/* 1. Rechnungen ---------------------------------------------------------------------- */
const invoices = (X.invoices ?? []).filter((i) => !i.is_test);
const status = (i) => (i.status === "cancelled" ? "cancelled" : i.is_draft ? "draft" : i.paid_at || i.status === "paid" ? "paid" : "open");
const periodTitle = (i) => {
  const d = i.period_from ?? (i.period ? `${i.period}-01` : null);
  return d ? `Monatsrechnung ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : "Rechnung";
};
const invRows = invoices.map((i) => ({
  legacy_id: i.id,
  client_id: clientByLegacy.get(i.client_id) ?? null,
  contract_id: contractByLegacy.get(i.contract_id) ?? null,
  invoice_number: i.invoice_number,
  invoice_seq: i.invoice_seq ?? null,
  title: periodTitle(i),
  amount: rappen(i.subtotal ?? i.amount),
  vat: rappen(i.vat_amount) ?? 0,
  vat_rate: i.vat_rate ?? 8.1,
  issue_date: i.issue_date ?? null,
  due_date: i.due_date ?? null,
  period_from: i.period_from ?? null,
  period_to: i.period_to ?? null,
  qr_reference: clean(i.qr_reference),
  status: status(i),
  paid_date: i.paid_at ? i.paid_at.slice(0, 10) : null,
  sent_at: i.sent_at ?? null,
  reminder_stage: i.reminder_stage ?? 0,
  last_reminder_at: i.last_reminder_at ?? null,
  notes: clean(i.notes),
  created_by: userId(i.created_by),
  created_at: i.created_at,
}));
const invIds = await upsert("invoices", invRows);
log(`Rechnungen: ${invRows.length}`, invRows.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {}), `ohne Kunde: ${invRows.filter((r) => !r.client_id).length}, ohne Vertrag: ${invRows.filter((r) => !r.contract_id).length}`);

const itemRows = (X.invoice_items ?? [])
  .filter((it) => invIds.has(it.invoice_id))
  .map((it) => ({
    legacy_id: it.id,
    invoice_id: invIds.get(it.invoice_id),
    position: it.position ?? 1,
    title: clean(it.title) ?? "Position",
    description: clean(it.description),
    quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1,
    unit: clean(it.unit) === "x" ? null : clean(it.unit),
    unit_price: rappen(it.unit_price) ?? 0,
    created_at: it.created_at,
  }));
await upsert("invoice_items", itemRows);
// Pruefung: Summe der Positionen = Nettobetrag
let diff = 0;
for (const r of invRows) {
  const sum = itemRows.filter((it) => it.invoice_id === invIds.get(r.legacy_id)).reduce((s, it) => s + Math.round(it.quantity * it.unit_price), 0);
  if (!DRY && sum !== r.amount) diff++;
}
log(`Positionen: ${itemRows.length}, Rechnungen mit abweichender Summe: ${diff}`);

/* 2. Kundennummern ------------------------------------------------------------------- */
let nums = 0;
for (const r of invRows) {
  const n = Number(String(r.invoice_number ?? "").split("-")[1]);
  if (!r.client_id || !Number.isInteger(n)) continue;
  if (!DRY) must(await db.from("clients").update({ customer_number: n }).eq("id", r.client_id).is("customer_number", null), "Kundennummer");
  nums++;
}
log(`Kundennummern gesetzt: ${nums}`);

/* 3. Umsatz und Kosten pro Monat ---------------------------------------------------- */
const month = (y, m) => `${y}-${String(m).padStart(2, "0")}-01`;
const revRows = (X.finance_revenues ?? []).map((r) => ({
  legacy_id: r.id,
  month: month(r.year, r.month),
  kind: "revenue",
  label: clean(r.client_name) ?? "Umsatz",
  client_id: clientByName.get(norm(r.client_name)) ?? null,
  amount: rappen(r.gross) ?? 0,
  commission: rappen(r.commission),
  contract_start: clean(r.start_date),
  contract_duration: clean(r.duration),
  note: clean(r.notes),
  sort_order: r.order_index ?? 0,
  created_at: r.created_at,
}));
const costRows = (X.finance_costs ?? []).map((c) => ({
  legacy_id: c.id,
  month: month(c.year, c.month),
  kind: "cost",
  label: clean(c.name) ?? "Kosten",
  amount: rappen(c.amount) ?? 0,
  category: clean(c.category),
  sort_order: c.order_index ?? 0,
  created_at: c.created_at,
}));
await upsert("monthly_financials", [...revRows, ...costRows]);
const sum = (rows) => rows.reduce((m, r) => ((m[r.month.slice(0, 7)] = (m[r.month.slice(0, 7)] ?? 0) + r.amount), m), {});
log(`Umsatzzeilen: ${revRows.length} (mit Kunde verknuepft: ${revRows.filter((r) => r.client_id).length})`, sum(revRows));
log(`Kostenzeilen: ${costRows.length}`, sum(costRows));
log(DRY ? "Trockenlauf: nichts geschrieben." : "Fertig.");
