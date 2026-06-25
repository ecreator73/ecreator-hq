/**
 * Importiert die alten CRM-Leads aus leads_export.csv in public.leads.
 * - Status normalisiert (legacy_status zusaetzlich gespeichert)
 * - metadata komplett als JSONB erhalten + Felder extrahiert
 * - Dubletten ueber legacy_id / email / phone (kein Doppelimport -> Update)
 * - Follow-up-Tasks fuer relevante Status, sales_activities je Lead
 * VORAUSSETZUNG: Migration 0019 ausgefuehrt (neue Spalten). DRY-RUN default.
 *
 *   node scripts/import-leads.mjs                 # Dry-Run + Report
 *   node scripts/import-leads.mjs --commit        # schreiben
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const FILE = "C:/Users/Win11/Downloads/leads_export.csv";
const COMMIT = process.argv.includes("--commit");

for (const raw of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const l = raw.trim(); if (!l || l.startsWith("#")) continue;
  const i = l.indexOf("="); if (i === -1) continue;
  const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function parseCSV(s) {
  const rows = []; let row = []; let field = ""; let inQ = false;
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (inQ) { if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else { if (c === '"') inQ = true; else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); field = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
      else if (c === "\r") {} else field += c; } }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const STATUS_MAP = {
  "Neu": "neu", "new": "neu",
  "Nicht erreicht": "nicht_erreicht",
  "Mehrfach nicht erreicht": "mehrfach_nicht_erreicht",
  "Kontaktiert / Follow Up": "followup",
  "Mail": "mail_gesendet",
  "Termin": "termin_gebucht",
  "Vertrag / Mail gemacht": "vertrag_mail",
  "Abgeschlossen": "abgeschlossen",
  "Absage": "absage",
  "Fehleintrag": "fehleintrag",
  "Andere (Job etc )": "andere",
};
const FOLLOWUP_STATUSES = new Set(["nicht_erreicht", "mehrfach_nicht_erreicht", "followup", "mail_gesendet"]);
const clean = (v) => { const t = (v ?? "").trim(); return t === "" ? null : t; };
const tomorrowISO = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

async function main() {
  const rows = parseCSV(readFileSync(FILE, "utf8"));
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const data = rows.slice(1).filter((r) => r[idx.id]);

  // Statuskeys + Profile laden
  const { data: stRows } = await sb.from("statuses").select("id, key").eq("entity_type", "lead");
  const statusId = new Map((stRows ?? []).map((s) => [s.key, s.id]));
  const { data: profs } = await sb.from("profiles").select("id, email");
  const profByEmail = new Map((profs ?? []).map((p) => [(p.email ?? "").toLowerCase(), p.id]));

  // Bestehende Leads fuer Dublettencheck (tolerant, falls Migration 0019 noch fehlt)
  let existing = [];
  const ex = await sb.from("leads").select("id, legacy_id, email, phone");
  if (ex.error) {
    if (COMMIT) { console.error("FEHLER: Spalte legacy_id fehlt - bitte Migration 0019 ausfuehren."); process.exit(1); }
    console.warn("! Spalte legacy_id fehlt noch (Dry-Run ohne legacy-Dublettencheck). Migration 0019 vor --commit ausfuehren.");
    const ex2 = await sb.from("leads").select("id, email, phone");
    existing = ex2.data ?? [];
  } else existing = ex.data ?? [];
  const byLegacy = new Map(), byEmail = new Map(), byPhone = new Map();
  for (const e of existing) {
    if (e.legacy_id) byLegacy.set(e.legacy_id, e.id);
    if (e.email) byEmail.set(e.email.toLowerCase(), e.id);
    if (e.phone) byPhone.set(e.phone, e.id);
  }

  const report = {
    processed: 0, inserted: 0, updated: 0, skippedDup: 0,
    followupTasks: 0, activities: 0,
    byStatus: {}, bySource: {}, unmappedStatus: {}, ownerMatched: 0, errors: [],
  };

  for (const r of data) {
    report.processed++;
    const legacy_id = clean(r[idx.id]);
    const name = clean(r[idx.name]) ?? "Unbekannt";
    const email = clean(r[idx.email]);
    const phone = clean(r[idx.phone]);
    const source = clean(r[idx.source]);
    const rawStatus = clean(r[idx.status]) ?? "";
    let notes = clean(r[idx.notes]);
    const created_at = clean(r[idx.created_at]);
    const assigned_to_name = clean(r[idx.assigned_to_name]);
    const assigned_to_email = clean(r[idx.assigned_to_email]);

    let meta = {};
    try { meta = JSON.parse(r[idx.metadata] || "{}"); } catch { report.errors.push(`${legacy_id}: metadata JSON ungueltig`); }

    let statusKey = STATUS_MAP[rawStatus];
    if (!statusKey) { statusKey = "andere"; report.unmappedStatus[rawStatus] = (report.unmappedStatus[rawStatus] ?? 0) + 1; }
    const sid = statusId.get(statusKey);
    if (!sid) { report.errors.push(`${legacy_id}: Status-ID fehlt (${statusKey}) - Migration 0019/Status-Setup?`); continue; }

    const company_name = clean(meta.company) ?? name;
    const campaign_name = clean(meta.campaign_name);
    const dienstleistung = clean(meta.dienstleistung);
    const city = clean(meta.city) ?? clean(meta.kanton);
    if (dienstleistung && (!notes || !notes.toLowerCase().includes(dienstleistung.toLowerCase()))) {
      notes = (notes ? notes + "\n" : "") + `Dienstleistung: ${dienstleistung}`;
    }
    const owner_id = assigned_to_email ? (profByEmail.get(assigned_to_email.toLowerCase()) ?? null) : null;
    if (owner_id) report.ownerMatched++;
    const next_action_date = FOLLOWUP_STATUSES.has(statusKey) ? tomorrowISO() : null;

    const lead = {
      company_name, contact_name: name, email, phone, source, city,
      status_id: sid, owner_id, notes,
      legacy_id, legacy_status: rawStatus || null,
      assigned_to_name, assigned_to_email,
      campaign_name, dienstleistung,
      metadata_json: meta, next_action_date,
      ...(created_at ? { created_at } : {}),
    };

    report.byStatus[statusKey] = (report.byStatus[statusKey] ?? 0) + 1;
    report.bySource[source ?? "(leer)"] = (report.bySource[source ?? "(leer)"] ?? 0) + 1;

    const dupId = byLegacy.get(legacy_id)
      ?? (email ? byEmail.get(email.toLowerCase()) : undefined)
      ?? (phone ? byPhone.get(phone) : undefined);

    if (!COMMIT) {
      if (dupId) report.skippedDup++; else report.inserted++;
      if (!dupId && FOLLOWUP_STATUSES.has(statusKey)) report.followupTasks++;
      continue;
    }

    if (dupId) {
      const { error } = await sb.from("leads").update(lead).eq("id", dupId);
      if (error) { report.errors.push(`${legacy_id}: Update-Fehler ${error.message}`); continue; }
      report.updated++;
      await sb.from("activity_logs").insert({
        action: "lead.import_updated", entity_type: "lead", entity_id: dupId,
        summary: `Lead-Import (Dublette aktualisiert) · Status: ${rawStatus} · Quelle: ${source ?? "-"}`,
      });
    } else {
      const { data: ins, error } = await sb.from("leads").insert(lead).select("id").single();
      if (error) { report.errors.push(`${legacy_id}: Insert-Fehler ${error.message}`); continue; }
      const newId = ins.id;
      report.inserted++;
      byLegacy.set(legacy_id, newId);
      if (email) byEmail.set(email.toLowerCase(), newId);
      if (phone) byPhone.set(phone, newId);

      // Aktivitaet
      await sb.from("sales_activities").insert({
        lead_id: newId, type: "note",
        subject: "Lead aus altem CRM importiert",
        body: `Originalstatus: ${rawStatus} · Quelle: ${source ?? "-"} · Import: ${new Date().toISOString().slice(0, 10)}`,
      });
      report.activities++;

      // Follow-up-Task
      if (FOLLOWUP_STATUSES.has(statusKey)) {
        const { error: tErr } = await sb.from("tasks").insert({
          title: `Follow-up: ${name}`, due_date: tomorrowISO(),
          lead_id: newId, assigned_to: owner_id,
        });
        if (tErr) report.errors.push(`${legacy_id}: Task-Fehler ${tErr.message}`);
        else report.followupTasks++;
      }
    }
  }

  // Report ausgeben
  console.log(`\n=== LEAD-IMPORT ${COMMIT ? "(COMMIT)" : "(DRY-RUN)"} ===`);
  console.log(`Verarbeitet: ${report.processed} | Neu: ${report.inserted} | Aktualisiert: ${report.updated} | Dubletten uebersprungen(Dry): ${report.skippedDup}`);
  console.log(`Follow-up-Tasks: ${report.followupTasks} | Aktivitaeten: ${report.activities} | Owner zugeordnet: ${report.ownerMatched}`);
  console.log("\nStatus-Verteilung:");
  for (const [k, n] of Object.entries(report.byStatus).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
  console.log("\nQuellen-Verteilung:");
  for (const [k, n] of Object.entries(report.bySource).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
  if (Object.keys(report.unmappedStatus).length) { console.log("\nNicht gemappte Originalstatus (-> 'andere'):"); for (const [k, n] of Object.entries(report.unmappedStatus)) console.log(`  ${n}x  "${k}"`); }
  console.log(`\nFehler: ${report.errors.length}`);
  for (const e of report.errors.slice(0, 20)) console.log(`  - ${e}`);

  mkdirSync(resolve(process.cwd(), "backups"), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  writeFileSync(resolve(process.cwd(), "backups", `leads-import-report-${stamp}.json`), JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport: backups/leads-import-report-${stamp}.json\n`);
}
main().catch((e) => { console.error("FEHLER:", e.message ?? String(e)); process.exit(1); });
