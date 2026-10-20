// Import des Lovable-CRM nach eCreator OS - Stufe 3 (Production).
//
//   node scripts/import-lovable-production.mjs <export.json> [--dry]
//
// Creator (aus angenommenen Bewerbungen) -> creators (Status «Creator Pool»),
// Bewerbungen -> creator_applications, Shootings + Skripte + Terminvorschlaege,
// Model-Zuteilung -> shoot_assignments, Redaktionsplaene, Content -> content_projects,
// wiederkehrende Beitraege, CRM-Builds -> crm_projects.
// Datensparsam: vom Geburtsdatum wird nur der Jahrgang uebernommen (Original im Archiv).
// Fotos/Videos bleiben vorerst Pfade im alten CRM-Speicher (photo_path/video_path).
// Idempotent (legacy_id). Gibt nur Zahlen aus.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!file) {
  console.error("Aufruf: node scripts/import-lovable-production.mjs <export.json> [--dry]");
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
const must = (r, what) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};
const clean = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());
const year = (d) => (d && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : null);

/** Upsert ueber legacy_id (auch bei partiellem Unique-Index). Liefert legacy_id -> id. */
async function upsert(table, rows) {
  const ids = new Map();
  if (!rows.length) return ids;
  const existing = must(await db.from(table).select("id, legacy_id").in("legacy_id", rows.map((r) => r.legacy_id)), `${table} lesen`);
  for (const e of existing) ids.set(e.legacy_id, e.id);
  if (DRY) return ids;
  for (const r of rows) {
    if (ids.has(r.legacy_id)) {
      must(await db.from(table).update(r).eq("id", ids.get(r.legacy_id)), `${table} aktualisieren`);
    } else {
      const ins = must(await db.from(table).insert(r).select("id").single(), `${table} einfuegen`);
      ids.set(r.legacy_id, ins.id);
    }
  }
  return ids;
}

/* Team und Kunden ------------------------------------------------------------- */
const lovProfiles = new Map(X.profiles.map((p) => [p.user_id, (p.email ?? "").toLowerCase()]));
const osProfiles = must(await db.from("profiles").select("id, email"), "profiles");
const osByEmail = new Map(osProfiles.map((p) => [String(p.email ?? "").toLowerCase(), p.id]));
const userId = (lovId) => (lovId ? osByEmail.get(lovProfiles.get(lovId)) ?? null : null);
const osClients = must(await db.from("clients").select("id, legacy_id").not("legacy_id", "is", null), "clients");
const clientByLegacy = new Map(osClients.map((c) => [c.legacy_id, c.id]));
const clientId = (lovId) => (lovId ? clientByLegacy.get(lovId) ?? null : null);

/* Sprachen: Freitext -> Codes ----------------------------------------------------- */
const LANG = {
  deutsch: "de", de: "de", german: "de", hochdeutsch: "de",
  schweizerdeutsch: "gsw", "schweizer deutsch": "gsw", schwiizerdütsch: "gsw", berndeutsch: "gsw", "(schweizer)deutsch": "gsw", mundart: "gsw",
  englisch: "en", english: "en", engl: "en", en: "en",
  französisch: "fr", franzoesisch: "fr", french: "fr", fr: "fr",
  italienisch: "it", italian: "it", it: "it",
  spanisch: "es", spanish: "es", es: "es",
  portugiesisch: "pt", portuguiesisch: "pt", portuguese: "pt",
  türkisch: "tr", turkish: "tr", serbisch: "sr", albanisch: "sq", arabisch: "ar", russisch: "ru", tamilisch: "ta", tamilish: "ta", lingala: "ln",
};
function languages(input) {
  const parts = (Array.isArray(input) ? input : [input]).flatMap((v) => String(v ?? "").split(/[,/;&+]|\s+und\s+/i));
  const out = new Set();
  for (const p of parts) {
    const whole = p.trim().toLowerCase();
    if (LANG[whole]) {
      out.add(LANG[whole]);
      continue;
    }
    for (const w of whole.split(/\s+/)) if (LANG[w]) out.add(LANG[w]);
    if (/schweizer/.test(whole) && /deutsch/.test(whole)) out.add("gsw");
  }
  return [...out];
}
const handle = (v) => {
  const s = clean(v);
  if (!s) return null;
  const m = s.match(/(?:instagram\.com|tiktok\.com)\/@?([^/?#]+)/i);
  return (m ? m[1] : s).replace(/^@/, "").trim() || null;
};
const EXPERIENCE = {
  "Keine Erfahrung": "beginner",
  "Erste Erfahrungen": "beginner",
  "Regelmässig vor der Kamera": "intermediate",
  "Professionelles Model / Creator": "professional",
};

/* 1. Creator -------------------------------------------------------------------- */
const apps = new Map((X.creator_applications ?? []).map((a) => [a.id, a]));
const creatorRows = (X.creators ?? []).map((c) => {
  const a = apps.get(c.application_id);
  const [first, ...rest] = String(c.name ?? "").trim().split(/\s+/);
  return {
    legacy_id: c.id,
    first_name: clean(a?.first_name) ?? first ?? "Creator",
    last_name: clean(a?.last_name) ?? (rest.join(" ") || null),
    email: clean(c.email)?.toLowerCase() ?? null,
    phone: clean(c.phone),
    city: clean(c.location),
    canton: clean(c.canton),
    birth_year: year(c.birthdate),
    languages: languages(c.languages),
    instagram_handle: handle(c.instagram),
    tiktok_handle: handle(c.tiktok),
    experience_level: EXPERIENCE[a?.experience] ?? null,
    hourly_rate: rappen(c.hourly_rate),
    half_day_rate: rappen(c.half_day_rate),
    full_day_rate: rappen(c.full_day_rate),
    travel_costs: rappen(c.travel_costs),
    // Lovable fuehrt alle als «new», es sind aber angenommene Bewerbungen -> Pool.
    status: "pool",
    consent_given: Boolean(a?.privacy_consent),
    consent_date: a?.privacy_consent_timestamp ?? null,
    consent_note: a?.privacy_consent ? "Datenschutz-Einwilligung im Bewerbungsformular" : null,
    notes: clean(c.notes),
    photo_path: clean(c.photo_url) ?? clean(a?.photo_url),
    video_path: clean(c.video_url) ?? clean(a?.video_url),
    portfolio_url: clean(a?.portfolio_url),
    rate_expectation: clean(a?.rate_expectation),
    created_at: c.created_at,
  };
});
const creatorIds = await upsert("creators", creatorRows);
const creatorByApp = new Map((X.creators ?? []).map((c) => [c.application_id, creatorIds.get(c.id)]));
log(`Creator: ${creatorRows.length}`);

/* 2. Bewerbungen ------------------------------------------------------------------ */
const appRows = [...apps.values()].map((a) => ({
  legacy_id: a.id,
  creator_id: creatorByApp.get(a.id) ?? null,
  status: ["new", "reviewing", "on_hold", "accepted", "rejected"].includes(a.status) ? a.status : "new",
  first_name: clean(a.first_name) ?? "Unbekannt",
  last_name: clean(a.last_name),
  email: clean(a.email)?.toLowerCase() ?? null,
  phone: clean(a.phone),
  birth_year: year(a.birthdate),
  city: clean(a.location),
  instagram_handle: handle(a.instagram),
  tiktok_handle: handle(a.tiktok),
  languages: languages(a.languages),
  experience: clean(a.experience),
  about: clean(a.about),
  photo_path: clean(a.photo_url),
  video_path: clean(a.video_url),
  portfolio_url: clean(a.portfolio_url),
  rate_expectation: clean(a.rate_expectation),
  source: clean(a.source),
  utm_source: clean(a.utm_source),
  utm_medium: clean(a.utm_medium),
  utm_campaign: clean(a.utm_campaign),
  referrer: clean(a.referrer),
  privacy_consent: Boolean(a.privacy_consent),
  privacy_consent_at: a.privacy_consent_timestamp ?? null,
  decided_at: ["accepted", "rejected", "on_hold"].includes(a.status) ? a.updated_at : null,
  rejection_email_sent_at: a.rejection_email_sent_at ?? null,
  on_hold_email_sent_at: a.on_hold_email_sent_at ?? null,
  created_at: a.created_at,
}));
await upsert("creator_applications", appRows);
const byStatus = appRows.reduce((m, a) => ((m[a.status] = (m[a.status] ?? 0) + 1), m), {});
log(`Bewerbungen: ${appRows.length}`, byStatus);

/* 3. Shootings ---------------------------------------------------------------------- */
const SHOOT_STATUS = { waiting_customer_dates: "date_search", date_search: "date_search", planned: "planned", confirmed: "confirmed", completed: "done", done: "done", editing: "editing", delivered: "delivered", cancelled: "cancelled", rescheduled: "rescheduled" };
const INVOICE = { offen: "open", open: "open", verrechnet: "invoiced", invoiced: "invoiced", bezahlt: "paid", paid: "paid", keine: "none", none: "none" };
const shootRows = (X.shoots ?? []).map((s) => ({
  legacy_id: s.id,
  client_id: clientId(s.client_id),
  title: clean(s.title) ?? "Shooting",
  shooting_date: s.shoot_date ?? null,
  end_date: s.end_date ?? null,
  location: clean(s.location),
  address: clean(s.address),
  status: SHOOT_STATUS[s.status] ?? "planned",
  notes: clean(s.notes),
  description: clean(s.description),
  content_goal: clean(s.content_goal),
  video_count: s.video_count ?? null,
  equipment: clean(s.equipment),
  shoot_type: clean(s.shoot_type),
  duration_hours: s.duration_hours ?? null,
  responsible_id: userId(s.responsible_id),
  editor_id: userId(s.editor_id),
  final_date_set: Boolean(s.final_date_set),
  delivery_deadline: s.delivery_deadline ?? null,
  confirmed_at: s.confirmed_at ?? null,
  completed_at: s.completed_at ?? null,
  delivered_at: s.delivered_at ?? null,
  script_url: clean(s.script_url),
  customer_drive_url: clean(s.customer_drive_url),
  shoot_folder_url: clean(s.shoot_folder_url),
  delivery_url: clean(s.delivery_url),
  model_fee: rappen(s.model_fee),
  model_paid: Boolean(s.model_paid),
  model_paid_at: s.model_paid_at ?? null,
  invoice_status: INVOICE[String(s.invoice_status ?? "").toLowerCase()] ?? "open",
  confirmation_notes: clean(s.confirmation_notes),
  review_notes: clean(s.review_notes),
  created_by: userId(s.created_by),
  created_at: s.created_at,
}));
const shootIds = await upsert("shoots", shootRows);
log(`Shootings: ${shootRows.length}`);

let assigned = 0;
if (!DRY) {
  for (const s of X.shoots ?? []) {
    const cid = creatorIds.get(s.creator_id);
    const sid = shootIds.get(s.id);
    if (!cid || !sid) continue;
    const row = { shoot_id: sid, creator_id: cid, status: s.status === "confirmed" ? "confirmed" : "requested", agreed_rate: rappen(s.model_fee) };
    must(await db.from("shoot_assignments").upsert(row, { onConflict: "shoot_id,creator_id" }), "Model-Zuteilung");
    assigned++;
  }
}
log(`Model-Zuteilungen: ${assigned}`);

const scriptRows = (X.shoot_scripts ?? []).filter((r) => shootIds.has(r.shoot_id)).map((r) => ({
  legacy_id: r.id,
  shoot_id: shootIds.get(r.shoot_id),
  video_number: r.video_number ?? null,
  title: clean(r.title),
  hook: clean(r.hook),
  script: clean(r.script),
  cta: clean(r.cta),
  notes: clean(r.notes),
  status: ["draft", "review", "approved"].includes(r.status) ? r.status : "draft",
  owner_id: userId(r.owner_id),
  created_at: r.created_at,
}));
await upsert("shoot_scripts", scriptRows);
const optionRows = (X.shoot_date_options ?? []).filter((r) => shootIds.has(r.shoot_id)).map((r) => ({
  legacy_id: r.id,
  shoot_id: shootIds.get(r.shoot_id),
  starts_at: r.starts_at,
  customer_available: r.customer_available ?? (r.status === "both" ? true : null),
  model_available: r.model_available ?? (r.status === "both" ? true : null),
  notes: clean(r.notes),
  created_at: r.created_at,
}));
await upsert("shoot_date_options", optionRows);
log(`Skripte: ${scriptRows.length}, Terminvorschlaege: ${optionRows.length}`);

/* 4. Content ----------------------------------------------------------------------------- */
const planRows = (X.content_plans ?? []).map((p) => ({
  legacy_id: p.id,
  client_id: clientId(p.client_id),
  year: p.year,
  month: p.month,
  responsible_id: userId(p.responsible_id),
  status: ["planning", "in_review", "approved", "done"].includes(p.status) ? p.status : "planning",
  notes: clean(p.notes),
  created_by: userId(p.created_by),
  created_at: p.created_at,
}));
const planIds = await upsert("content_plans", planRows);
const PLATFORM = { instagram: "instagram", ig: "instagram", tiktok: "tiktok", linkedin: "linkedin", youtube: "youtube", facebook: "facebook" };
const platform = (v) => (clean(v) ? PLATFORM[clean(v).toLowerCase()] ?? "other" : null);
const CONTENT_STATUS = { idea: "idea", planned: "planning", planning: "planning", script: "script", in_production: "filmed", editing: "editing", review: "review", approved: "approved", scheduled: "scheduled", published: "published" };
const contentRows = (X.content_items ?? []).map((i) => ({
  legacy_id: i.id,
  client_id: clientId(i.client_id),
  plan_id: planIds.get(i.plan_id) ?? null,
  shoot_id: shootIds.get(i.shoot_id) ?? null,
  workspace: i.workspace_key === "ecreator" || !i.client_id ? "ecreator" : "client",
  title: clean(i.title) ?? "Beitrag",
  content_type: clean(i.content_type)?.toLowerCase() ?? null,
  platform: platform(i.platform),
  format: clean(i.format),
  topic: clean(i.topic),
  hook: clean(i.hook),
  description: clean(i.description),
  caption: clean(i.caption),
  hashtags: clean(i.hashtags),
  script_url: clean(i.script_url),
  scheduled_for: i.scheduled_for ?? null,
  published_at: i.published_at ?? null,
  reminder_lead_days: i.reminder_lead_days ?? null,
  performance_notes: clean(i.performance_notes),
  status: CONTENT_STATUS[i.status] ?? "idea",
  owner_id: userId(i.assignee_id),
  created_at: i.created_at,
}));
await upsert("content_projects", contentRows);
const ruleRows = (X.content_recurring_rules ?? []).map((r) => ({
  legacy_id: r.id,
  client_id: clientId(r.client_id),
  workspace: r.workspace_key === "ecreator" || !r.client_id ? "ecreator" : "client",
  title: clean(r.title) ?? "Wiederkehrender Beitrag",
  topic: clean(r.topic),
  platform: platform(r.platform),
  format: clean(r.format),
  weekday: r.weekday ?? null,
  publish_time: r.publish_time ?? null,
  assignee_id: userId(r.assignee_id),
  active: r.active !== false,
  created_at: r.created_at,
}));
await upsert("content_recurring_rules", ruleRows);
log(`Redaktionsplaene: ${planRows.length}, Content: ${contentRows.length}, Regeln: ${ruleRows.length}`);

/* 5. CRM-Builds --------------------------------------------------------------------------- */
const crmRows = (X.production_items ?? []).filter((p) => p.type === "crm").map((p) => ({
  legacy_id: p.id,
  client_id: clientId(p.client_id),
  title: clean(p.title) ?? "CRM-Build",
  status: "analysis",
  owner_id: userId(p.owner_id),
  go_live_date: p.due_date ?? null,
  start_date: p.start_date ?? null,
  priority: clean(p.priority),
  progress: Math.max(0, Math.min(100, Number(p.progress) || 0)),
  notes: clean(p.notes),
  created_at: p.created_at,
}));
await upsert("crm_projects", crmRows);
log(`CRM-Builds: ${crmRows.length}`);
log(DRY ? "Trockenlauf: nichts geschrieben." : "Fertig.");
