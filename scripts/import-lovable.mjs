// Import des Lovable-CRM (crm.ecreator.ch) nach eCreator OS - Stufe 1 (Leads/Sales).
//
//   node scripts/import-lovable.mjs <export.json> [--dry]
//
// - Archiviert JEDEN Datensatz in legacy_lovable_records (Rohdaten, idempotent).
// - Leads: Abgleich ueber legacy_id (= Lovable-ID). Lovable ist der aktuelle
//   Stand; Felder, die nur in eCreator OS gepflegt werden, bleiben erhalten.
//   Status normalisiert, Originalwert in legacy_status.
// - Kommentare, Anrufe, Statusverlauf -> sales_activities; Sales-To-dos -> tasks;
//   Termine -> meetings. Jeweils mit legacy_id, mehrfach ausfuehrbar (Delta-Import).
// - Gibt nur Zahlen aus, keine Personendaten. Liest ../.env.local (Service-Role).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!file) {
  console.error("Aufruf: node scripts/import-lovable.mjs <export.json> [--dry]");
  process.exit(1);
}
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const X = JSON.parse(readFileSync(file, "utf8")).tables;
const started = new Date().toISOString();
const log = (...a) => console.log(...a);

async function upsertChunks(table, rows, onConflict, size = 500) {
  if (DRY || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + size), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

/** Nur Datensaetze einfuegen, deren legacy_id noch fehlt (Teil-Unique-Index, kein ON CONFLICT). */
async function insertNew(table, rows) {
  const have = new Set();
  const ids = rows.map((r) => r.legacy_id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from(table).select("legacy_id").in("legacy_id", ids.slice(i, i + 200));
    if (error) throw new Error(`${table}: ${error.message}`);
    for (const r of data ?? []) have.add(r.legacy_id);
  }
  const fresh = rows.filter((r) => !have.has(r.legacy_id));
  if (!DRY) for (let i = 0; i < fresh.length; i += 500) {
    const { error } = await db.from(table).insert(fresh.slice(i, i + 500));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  return { fresh: fresh.length, existing: have.size };
}

/* 1. Archiv ----------------------------------------------------------------- */
let archived = 0;
for (const [t, rows] of Object.entries(X)) {
  const recs = rows
    .map((r) => ({
      source_table: t,
      legacy_id: String(r.id ?? r.job_name ?? r.key ?? JSON.stringify(r).slice(0, 60)),
      data: r,
      legacy_created_at: r.created_at ?? null,
      legacy_updated_at: r.updated_at ?? null,
    }));
  await upsertChunks("legacy_lovable_records", recs, "source_table,legacy_id");
  archived += recs.length;
}
log(`Archiv: ${archived} Datensaetze aus ${Object.keys(X).length} Tabellen`);

/* 2. Team ------------------------------------------------------------------- */
const lovProfiles = new Map(X.profiles.map((p) => [p.user_id, { email: (p.email ?? "").toLowerCase(), name: p.full_name }]));
const { data: osProfiles } = await db.from("profiles").select("id, email");
const osByEmail = new Map((osProfiles ?? []).map((p) => [String(p.email ?? "").toLowerCase(), p.id]));
const userOf = (lovId) => {
  const p = lovProfiles.get(lovId);
  return { osId: p ? osByEmail.get(p.email) ?? null : null, name: p?.name ?? null, email: p?.email ?? null };
};
log(`Team: ${[...lovProfiles.values()].filter((p) => osByEmail.has(p.email)).length} von ${lovProfiles.size} Lovable-Benutzern haben ein eCreator-OS-Konto`);

/* 3. Status ----------------------------------------------------------------- */
const { data: statusRows } = await db.from("statuses").select("id, key, entity_type").in("entity_type", ["lead", "task"]);
const sid = (type, key) => statusRows.find((s) => s.entity_type === type && s.key === key)?.id ?? null;
const LEAD_STATUS = {
  neu: "neu", new: "neu",
  "nicht erreicht": "nicht_erreicht",
  "mehrfach nicht erreicht": "mehrfach_nicht_erreicht",
  "kontaktiert / follow up": "followup", "follow up": "followup", contacted: "followup", pendent: "followup",
  mail: "mail_gesendet",
  termin: "termin_gebucht", appointment: "termin_gebucht",
  "vertrag / mail gemacht": "vertrag_mail",
  abgeschlossen: "abgeschlossen",
  absage: "absage",
  fehleintrag: "fehleintrag",
  massenmail: "massenmail",
  "andere (job etc )": "andere",
};
const mapLeadStatus = (s) => LEAD_STATUS[String(s ?? "").trim().toLowerCase()] ?? "andere";
// Spiegel von src/lib/lead-score.ts (Stufe)
const STAGE = { neu: 10, nicht_erreicht: 18, mehrfach_nicht_erreicht: 12, followup: 35, mail_gesendet: 45, termin_gebucht: 65, vertrag_mail: 85, abgeschlossen: 100, absage: 0, fehleintrag: 0, andere: 5, massenmail: 8 };
const unmapped = {};

/* 4. Leads ------------------------------------------------------------------ */
const { data: osLeads } = await db.from("leads").select("id, legacy_id, owner_id, next_action_date, notes, estimated_value, company_size, website").not("legacy_id", "is", null);
const osByLegacy = new Map((osLeads ?? []).map((l) => [l.legacy_id, l]));
const leadRows = [];
for (const l of X.leads) {
  const md = l.metadata ?? {};
  const key = mapLeadStatus(l.status);
  if (!LEAD_STATUS[String(l.status ?? "").trim().toLowerCase()]) unmapped[l.status] = (unmapped[l.status] ?? 0) + 1;
  const prev = osByLegacy.get(l.id);
  const owner = l.assigned_to ? userOf(l.assigned_to) : null;
  leadRows.push({
    ...(prev ? { id: prev.id } : {}),
    legacy_id: l.id,
    company_name: (md.company && String(md.company).trim()) || l.name || "Unbekannt",
    contact_name: l.name,
    email: l.email,
    phone: l.phone,
    website: md.website ?? prev?.website ?? null,
    industry: l.industry,
    city: md.city ?? null,
    source: l.source,
    status_id: sid("lead", key),
    legacy_status: l.status,
    lead_score: STAGE[key] ?? 10,
    owner_id: owner?.osId ?? prev?.owner_id ?? null,
    assigned_to_name: owner?.name ?? null,
    assigned_to_email: owner?.email ?? null,
    notes: l.notes ?? prev?.notes ?? null,
    // 26.06.2026 = Sammeldatum des Alt-Imports (kein echtes Follow-up) -> Lovable-Stand
    next_action: l.next_action ?? null,
    next_action_date: l.next_action_date ?? (prev?.next_action_date === "2026-06-26" ? null : prev?.next_action_date ?? null),
    dienstleistung: l.dienstleistung ?? md.dienstleistung ?? null,
    campaign_name: md.campaign_name ?? null,
    form_name: md.form_name ?? null,
    ad_name: md.ad_name ?? null,
    metadata_json: md,
    ad_consent: l.ad_consent ?? null,
    created_at: l.created_at,
  });
}
const existing = leadRows.filter((r) => r.id);
const fresh = leadRows.filter((r) => !r.id);
await upsertChunks("leads", existing, "id", 200);
if (!DRY && fresh.length) {
  for (let i = 0; i < fresh.length; i += 200) {
    const { error } = await db.from("leads").insert(fresh.slice(i, i + 200));
    if (error) throw new Error(`leads insert: ${error.message}`);
  }
}
log(`Leads: ${existing.length} aktualisiert, ${fresh.length} neu`);
if (Object.keys(unmapped).length) log("  nicht zugeordnete Status (-> andere):", JSON.stringify(unmapped));

const { data: allLeads } = await db.from("leads").select("id, legacy_id").not("legacy_id", "is", null);
const leadId = new Map((allLeads ?? []).map((l) => [l.legacy_id, l.id]));

/* 5. Verlauf -> sales_activities ------------------------------------------- */
const acts = [];
for (const c of X.lead_comments ?? []) {
  const lid = leadId.get(c.lead_id);
  if (!lid) continue;
  const u = userOf(c.user_id);
  acts.push({ legacy_id: `lovable:lead_comments:${c.id}`, lead_id: lid, type: "note", subject: "Kommentar", body: c.comment, activity_date: c.created_at, author_name: u.name });
}
const OUTCOME = { no_answer: "Nicht erreicht", reached: "Erreicht", interested: "Interessiert", follow_up: "Follow-up", appointment: "Termin vereinbart", offer: "Offerte", not_interested: "Kein Interesse", wrong_number: "Falsche Nummer", lost: "Verloren", won: "Gewonnen" };
// Alte Lovable-Schluessel auf die heutigen abbilden
const OUTCOME_KEY = { keine_antwort: "no_answer", erreicht: "reached", termin_vereinbart: "appointment", kein_interesse: "not_interested", callback: "follow_up" };
for (const c of X.call_logs ?? []) {
  const lid = leadId.get(c.lead_id);
  if (!lid) continue;
  const u = userOf(c.user_id);
  const body = [c.notes, c.next_action ? `Naechster Schritt: ${c.next_action}${c.next_action_date ? ` (${c.next_action_date})` : ""}` : null].filter(Boolean).join("\n") || null;
  const outcome = OUTCOME_KEY[c.outcome] ?? c.outcome ?? null;
  acts.push({
    legacy_id: `lovable:call_logs:${c.id}`, lead_id: lid, type: "call", subject: `Anruf: ${OUTCOME[outcome] ?? outcome ?? "–"}`, body,
    activity_date: c.call_date ?? c.created_at, author_name: u.name, outcome,
    duration_seconds: c.duration_seconds ?? null, next_action: c.next_action ?? null, next_action_date: c.next_action_date ?? null,
  });
}
for (const a of X.activity_log ?? []) {
  if (!a.lead_id || !["status_change", "appointment", "offer"].includes(a.activity_type)) continue;
  const lid = leadId.get(a.lead_id);
  if (!lid) continue;
  const u = userOf(a.user_id);
  acts.push({
    legacy_id: `lovable:activity_log:${a.id}`,
    lead_id: lid,
    type: a.activity_type === "status_change" ? "status" : a.activity_type === "appointment" ? "meeting" : "offer",
    subject: a.description ?? a.title ?? a.activity_type,
    body: null,
    activity_date: a.created_at,
    author_name: u.name,
  });
}
const ra = await insertNew("sales_activities", acts);
// Bestehende Anrufe um strukturierte Felder ergaenzen (Migration 0025)
if (!DRY) for (const a of acts.filter((x) => x.type === "call")) {
  await db.from("sales_activities").update({ outcome: a.outcome, duration_seconds: a.duration_seconds, next_action: a.next_action, next_action_date: a.next_action_date, subject: a.subject }).eq("legacy_id", a.legacy_id);
}
log(`Verlauf: ${ra.fresh} neu, ${ra.existing} schon vorhanden (Kommentare, Anrufe, Statuswechsel, Termine, Offerten)`);

/* 6. Sales-To-dos -> tasks --------------------------------------------------- */
const { data: prio } = await db.from("priorities").select("id, key");
const pid = (k) => prio.find((p) => p.key === k)?.id ?? null;
const PRIO = { 1: "high", 2: "medium", 3: "low" };
const TODO = { offen: "open", open: "open", in_arbeit: "in_progress", in_progress: "in_progress", erledigt: "done", done: "done" };
const tasks = (X.sales_todos ?? []).map((t) => {
  const st = TODO[t.status] ?? "open";
  return {
    legacy_id: `lovable:sales_todos:${t.id}`,
    title: t.title,
    description: t.description,
    lead_id: t.lead_id ? leadId.get(t.lead_id) ?? null : null,
    assigned_to: userOf(t.user_id).osId,
    status_id: sid("task", st),
    priority_id: pid(PRIO[t.priority] ?? "medium"),
    due_date: t.due_date,
    completed_at: st === "done" ? t.updated_at : null,
    created_at: t.created_at,
  };
});
const rt = await insertNew("tasks", tasks);
log(`Aufgaben: ${rt.fresh} neu, ${rt.existing} schon vorhanden`);

/* 7. Termine -> meetings ----------------------------------------------------- */
const MEET = { geplant: "planned", bestaetigt: "planned", durchgefuehrt: "completed", abgeschlossen: "completed", abgesagt: "cancelled", verschoben: "rescheduled" };
const meetings = (X.appointments ?? [])
  .filter((a) => a.lead_id)
  .map((a) => ({
    legacy_id: `lovable:appointments:${a.id}`,
    lead_id: leadId.get(a.lead_id) ?? null,
    title: a.title ?? "Termin",
    meeting_date: a.appointment_date,
    duration_minutes: a.duration_minutes,
    status: MEET[a.status] ?? "planned",
    notes: [a.notes, a.location ? `Ort: ${a.location}` : null, a.meeting_url ? `Link: ${a.meeting_url}` : null, a.outcome ? `Ergebnis: ${a.outcome}` : null].filter(Boolean).join("\n") || null,
    created_at: a.created_at,
  }));
const rm = await insertNew("meetings", meetings);
log(`Termine: ${rm.fresh} neu, ${rm.existing} schon vorhanden`);

/* 8. Live-Aktivitaet: durch den Import ausgeloeste Statuswechsel entfernen ---- */
if (!DRY) {
  const { count } = await db.from("mi_activity_log").delete({ count: "exact" }).eq("type", "status_changed").gte("occurred_at", started);
  log(`Live-Aktivitaet: ${count ?? 0} Import-Statuswechsel entfernt (keine echten Ereignisse)`);
}
log(DRY ? "Probelauf, nichts geschrieben." : "Import abgeschlossen.");
