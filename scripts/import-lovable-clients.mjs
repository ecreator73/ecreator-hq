// Import des Lovable-CRM nach eCreator OS - Stufe 2 (Kunden).
//
//   node scripts/import-lovable-clients.mjs <export.json> [--dry]
//
// Entscheide des Kunden (19.10.2026):
//  - Zusammenfuehren (Lovable-Stand gewinnt, Vertraege/Monatszahlen in OS bleiben):
//    AMSwiss = Asset Management Switzerland AG, Adrian Spitex (Nevida GmbH) = Adrian
//    Nevida Care, Adem PK (Akademie) = Adem PK (247 Aacademy), Jason Spitex (oberland) =
//    Brittney Pflegeteam Zuercher Oberland, gleichnamig: Franco Naechstenpflege,
//    Michael Hanke, Arana Care AG.
//  - Nur in OS (Manuel Semeraro, Gajur Assura, Davide Macedo, Patrick Bandiera, Faruk,
//    Femosana GmbH, Monestra GmbH): Status «ended», Vertraege «cancelled». Nichts loeschen.
// Idempotent (legacy_id). Gibt nur Zahlen aus.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!file) {
  console.error("Aufruf: node scripts/import-lovable-clients.mjs <export.json> [--dry]");
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

const MERGE = {
  "Asset Management Switzerland AG": "AMSwiss",
  "Adrian Nevida Care": "Adrian Spitex (Nevida GmbH)",
  "Adem PK (247 Aacademy)": "Adem PK (Akademie)",
  "Brittney Pflegeteam Zürcher Oberland": "Jason Spitex (oberland)",
  "Franco Nächstenpflege": "Franco Nächstenpflege",
  "Michael Hanke": "Michael Hanke",
  "Arana Care AG": "Arana Care AG",
};
const OS_ONLY_PREFIX = ["Manuel Semeraro", "Gajur Assura", "Davide Macedo", "Patrick Bandiera", "Faruk (Ali", "Femosana GmbH", "Monestra GmbH"];
const CLIENT_STATUS = { active: "active", onboarding: "onboarding", paused: "paused", cancelled: "ended", gekuendigt: "ended", former: "ended", ended: "ended" };

/* Team ------------------------------------------------------------------------ */
const lovProfiles = new Map(X.profiles.map((p) => [p.user_id, (p.email ?? "").toLowerCase()]));
const osProfiles = must(await db.from("profiles").select("id, email"), "profiles");
const osByEmail = new Map(osProfiles.map((p) => [String(p.email ?? "").toLowerCase(), p.id]));
const userId = (lovId) => (lovId ? osByEmail.get(lovProfiles.get(lovId)) ?? null : null);

/* 1. Kunden -------------------------------------------------------------------- */
const osClients = must(await db.from("clients").select("id, name, legacy_id, notes, account_manager_id"), "clients");
const leadRows = must(await db.from("leads").select("id, legacy_id").not("legacy_id", "is", null), "leads");
const leadByLegacy = new Map(leadRows.map((l) => [l.legacy_id, l.id]));
const extLinks = new Map();
for (const l of X.client_external_links ?? []) extLinks.set(l.client_id, [...(extLinks.get(l.client_id) ?? []), l.external_client_id]);

const clientIdByLegacy = new Map();
let merged = 0, created = 0;
for (const c of X.clients) {
  const osMatch = osClients.find((o) => o.legacy_id === c.id) ?? osClients.find((o) => !o.legacy_id && MERGE[c.company_name] && o.name === MERGE[c.company_name]);
  const ext = [...new Set([c.external_client_id, ...(extLinks.get(c.id) ?? [])].filter(Boolean))];
  const row = {
    legacy_id: c.id,
    name: c.company_name,
    contact_name: c.contact_name,
    email: c.email || null,
    phone: c.phone,
    website: c.website,
    industry: c.industry,
    status: CLIENT_STATUS[String(c.status ?? "").toLowerCase()] ?? "active",
    package: c.package,
    address: c.address,
    zip_code: c.zip_code,
    city: c.city,
    country: c.country,
    start_date: c.contract_start_date,
    account_manager_id: userId(c.account_owner_id) ?? osMatch?.account_manager_id ?? null,
    notes: c.notes ?? osMatch?.notes ?? null,
    monthly_gross: rappen(c.monthly_gross_revenue),
    monthly_commission: rappen(c.monthly_commission),
    setup_fee: rappen(c.setup_fee),
    contract_start_date: c.contract_start_date,
    contract_end_date: c.contract_end_date,
    contract_duration: c.contract_duration,
    minimum_term_months: c.minimum_term_months,
    cancellation_notice: c.cancellation_notice,
    financial_notes: c.financial_notes,
    contact_birthday: c.contact_birthday,
    uid: c.uid,
    logo_url: c.logo_url,
    instagram_url: c.instagram_url,
    facebook_url: c.facebook_url,
    drive_url: c.drive_url,
    billing_name: c.billing_name,
    billing_contact: c.billing_contact,
    billing_address: c.billing_address,
    billing_zip: c.billing_zip,
    billing_city: c.billing_city,
    billing_email: c.billing_email,
    billing_email_cc: c.billing_email_cc,
    reporting_status_map: c.reporting_status_map ?? {},
    external_client_ids: ext,
    lead_id: c.lead_id ? leadByLegacy.get(c.lead_id) ?? null : null,
  };
  if (osMatch) {
    if (!DRY) must(await db.from("clients").update(row).eq("id", osMatch.id), `Kunde ${c.company_name}`);
    clientIdByLegacy.set(c.id, osMatch.id);
    merged++;
  } else {
    if (!DRY) {
      const ins = must(await db.from("clients").insert({ ...row, created_at: c.created_at }).select("id").single(), `Kunde ${c.company_name}`);
      clientIdByLegacy.set(c.id, ins.id);
    }
    created++;
  }
}
log(`Kunden: ${merged} zusammengefuehrt/aktualisiert, ${created} neu`);

// Nur in OS -> ehemalig
const osOnly = osClients.filter((o) => !o.legacy_id && OS_ONLY_PREFIX.some((p) => o.name.startsWith(p)));
if (!DRY) {
  for (const o of osOnly) {
    must(await db.from("clients").update({ status: "ended" }).eq("id", o.id), `ehemalig ${o.name}`);
    must(await db.from("contracts").update({ status: "cancelled" }).eq("client_id", o.id).eq("status", "active"), `Vertrag ${o.name}`);
  }
}
log(`Ehemalige Kunden (nur in OS): ${osOnly.length} auf «Beendet», aktive Vertraege auf «Gekuendigt»`);

/* 2. Vertraege + Positionen ---------------------------------------------------- */
const osContracts = DRY ? [] : must(await db.from("contracts").select("id, client_id, legacy_id, title"), "contracts");
let cUpd = 0, cNew = 0, items = 0;
for (const k of X.contracts) {
  const clientId = clientIdByLegacy.get(k.client_id);
  if (!clientId) continue;
  const row = {
    legacy_id: k.id,
    client_id: clientId,
    title: k.title,
    contract_type: "retainer",
    start_date: k.start_date,
    end_date: k.end_date,
    renewal_type: k.auto_renew ? "auto" : "manual",
    cancellation_notice_days: k.notice_days,
    value_monthly: rappen(k.value),
    value_total: k.duration_months && k.value ? rappen(k.value * k.duration_months) : null,
    currency: k.currency || "CHF",
    status: k.cancelled_at ? "cancelled" : k.status === "active" ? "active" : k.status === "draft" ? "draft" : k.status ?? "active",
    document_url: k.file_url,
    contract_number: k.contract_number,
    duration_months: k.duration_months,
    renewal_months: k.renewal_months,
    auto_renew: Boolean(k.auto_renew),
    billing_day: k.billing_day,
    payment_days: k.payment_days,
    payment_terms: k.payment_terms,
    cancelled_at: k.cancelled_at,
    signed_at: k.signed_at,
    signed_name: k.signed_name,
    sent_at: k.sent_at,
    notes: k.notes,
  };
  let id = osContracts.find((o) => o.legacy_id === k.id)?.id;
  if (!id) id = osContracts.find((o) => !o.legacy_id && o.client_id === clientId)?.id; // bestehenden Alt-Vertrag uebernehmen
  if (DRY) {
    id ? cUpd++ : cNew++;
    continue;
  }
  if (id) {
    must(await db.from("contracts").update(row).eq("id", id), `Vertrag ${k.title}`);
    const o = osContracts.find((x) => x.id === id);
    if (o) o.legacy_id = k.id;
    cUpd++;
  } else {
    id = must(await db.from("contracts").insert({ ...row, created_at: k.created_at }).select("id").single(), `Vertrag ${k.title}`).id;
    osContracts.push({ id, client_id: clientId, legacy_id: k.id });
    cNew++;
  }
  const { count } = await db.from("document_items").select("id", { count: "exact", head: true }).eq("contract_id", id);
  if (!count) {
    const its = (X.contract_items ?? [])
      .filter((i) => i.contract_id === k.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((i) => ({ contract_id: id, description: i.title || "Position", detail: i.description, quantity: Number(i.quantity) > 0 ? Number(i.quantity) : 1, unit_price: Math.max(0, rappen(i.unit_price) ?? 0), recurring: true }));
    if (its.length) must(await db.from("document_items").insert(its), `Positionen ${k.title}`);
    items += its.length;
  }
}
log(`Vertraege: ${cUpd} aktualisiert, ${cNew} neu, ${items} Positionen`);

/* 3. Reporting-Calls ------------------------------------------------------------ */
let rep = 0;
for (const r of X.reporting_calls ?? []) {
  const clientId = clientIdByLegacy.get(r.client_id);
  if (!clientId) continue;
  const row = {
    legacy_id: r.id,
    client_id: clientId,
    owner_id: userId(r.responsible_id),
    scheduled_date: r.scheduled_at,
    status: r.done_at ? "completed" : r.scheduled_at ? "scheduled" : "open",
    title: r.title,
    period_from: r.period_from,
    period_to: r.period_to,
    done_at: r.done_at,
    notes: r.notes,
    metrics: r.metrics,
    auto_metrics: r.auto_metrics,
    ai_texts: r.ai_texts,
  };
  if (!DRY) {
    const ex = must(await db.from("reporting_calls").select("id").eq("legacy_id", r.id).maybeSingle(), "reporting");
    if (ex) must(await db.from("reporting_calls").update(row).eq("id", ex.id), "reporting");
    else must(await db.from("reporting_calls").insert({ ...row, created_at: r.created_at }), "reporting");
  }
  rep++;
}
log(`Reporting-Calls: ${rep}`);

/* 4. Onboarding-Einsendungen ------------------------------------------------------ */
const subs = (X.client_onboarding_submissions ?? []).map((s) => ({
  legacy_id: s.id,
  client_id: s.client_id ? clientIdByLegacy.get(s.client_id) ?? null : null,
  status: s.status === "closed" || s.status === "geschlossen" ? "closed" : "open",
  company: s.firma,
  name: s.name,
  email: s.email,
  phone: s.telefon,
  address: s.adresse,
  zip_code: s.plz,
  city: s.ort,
  website: s.website,
  industry: s.branche,
  region: s.einzugsgebiet,
  monthly_ad_budget: s.monatliches_werbebudget,
  services: Array.isArray(s.dienstleistungen) ? s.dienstleistungen : [],
  answers: { ...(s.answers ?? {}), kampagne: s.kampagne ?? undefined, kampagne_custom: s.kampagne_custom ?? undefined, startdatum_optionen: s.startdatum_optionen ?? undefined, facebook_login: s.facebook_login ?? undefined },
  created_at: s.created_at,
}));
if (!DRY && subs.length) must(await db.from("client_onboarding_submissions").upsert(subs, { onConflict: "legacy_id" }), "onboarding");
log(`Onboarding-Einsendungen: ${subs.length}`);

/* 5. Produkte ------------------------------------------------------------------------ */
const prods = (X.products ?? []).map((p) => ({
  legacy_id: p.id,
  name: p.name,
  description: p.description,
  unit_price: rappen(p.price),
  unit: p.unit,
  price_on_request: Boolean(p.price_on_request),
  package: p.package,
  active: p.active !== false,
  recurring: /monat/i.test(p.unit ?? ""),
  sort_order: p.order_index ?? 0,
}));
if (!DRY) {
  for (const p of prods) {
    const ex = must(await db.from("pricing_items").select("id").eq("legacy_id", p.legacy_id).maybeSingle(), "produkt");
    if (ex) must(await db.from("pricing_items").update(p).eq("id", ex.id), "produkt");
    else must(await db.from("pricing_items").insert(p), "produkt");
  }
}
log(`Produkte: ${prods.length}`);

/* 6. Kundenverlauf ------------------------------------------------------------------ */
const inter = (X.activity_log ?? [])
  .filter((a) => a.client_id && clientIdByLegacy.get(a.client_id))
  .map((a) => ({
    legacy_id: `lovable:activity_log:${a.id}`,
    client_id: clientIdByLegacy.get(a.client_id),
    type: a.activity_type === "reporting" ? "reporting" : a.activity_type === "shoot" ? "meeting" : "note",
    subject: a.title ?? a.description ?? a.activity_type,
    body: a.title && a.description ? a.description : null,
    interaction_date: a.created_at,
  }));
let interNew = 0;
if (!DRY && inter.length) {
  const have = new Set(must(await db.from("client_interactions").select("legacy_id").in("legacy_id", inter.map((i) => i.legacy_id)), "verlauf").map((r) => r.legacy_id));
  const fresh = inter.filter((i) => !have.has(i.legacy_id));
  if (fresh.length) must(await db.from("client_interactions").insert(fresh), "verlauf");
  interNew = fresh.length;
}
log(`Kundenverlauf: ${interNew} neu (${inter.length} gesamt)`);

/* 7. Kunden-Leads (external_leads) ------------------------------------------------------ */
// Gruppen wie im Lovable-Reporting
const WRONG = ["fehleintrag", "wrong_number", "invalid", "ausversehen angemeldet", "hat sich verklickt", "nr. / kontakt ungültig", "ungültige/kein bedarf", "nie erreicht - festnetz nr.", "kein deutsch"];
const NO = ["absage", "andere (job etc )", "not_interested", "kein interesse", "lost", "abgelehnt", "abgesagt", "absage (termin)", "jobsuche", "sucht einen job", "nicht qualifiziert", "wollte sich informieren", "andere spitex", "nur hauswirtschaft", "nicht erfüllt", "aufgehängt"];
const HOT = ["termin", "appointment", "terminiert", "termin gesetzt", "onboarding office termin", "erreicht - termin ausstehend"];
const WON = ["won", "vertrag / mail gemacht", "aufgenommen", "neukunde gewonnen - mit abschluss", "neukunde gewonnen - ohne abschluss", "kunde gewonnen", "gewonnen"];
const UNREACH = ["mehrfach nicht erreicht", "3x nicht erreicht", "nie erreicht", "🚫 3x nicht erreicht"];
const norm = (s) => String(s ?? "").toLowerCase().replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
function category(raw, map) {
  const own = map?.[raw];
  if (own) return own === "closed" ? "won" : own === "warm" ? "neu" : own;
  const c = norm(raw);
  if (WON.includes(c) || c === "abgeschlossen") return "won";
  if (HOT.includes(c)) return "hot";
  if (WRONG.includes(c)) return "wrong";
  if (NO.includes(c)) return "no_interest";
  if (UNREACH.includes(c)) return "unreachable";
  if (c === "mail" || c.startsWith("mail")) return "mail";
  return "neu";
}
const extName = new Map((X.external_clients ?? []).map((e) => [e.id, e.company_name]));
const clientByExt = new Map();
for (const c of X.clients) {
  const id = clientIdByLegacy.get(c.id);
  for (const e of [c.external_client_id, ...(extLinks.get(c.id) ?? [])].filter(Boolean)) if (id) clientByExt.set(e, { id, map: c.reporting_status_map ?? {} });
}
// Ohne Lovable-Verknuepfung: exakt gleicher Firmenname in OS (z.B. Monestra GmbH)
if (!DRY) {
  const allClients = must(await db.from("clients").select("id, name"), "clients");
  for (const [extId, name] of extName) {
    if (clientByExt.has(extId) || !name) continue;
    const hit = allClients.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (hit) clientByExt.set(extId, { id: hit.id, map: {} });
  }
}
const cl = (X.external_leads ?? []).map((l) => {
  const owner = clientByExt.get(l.external_client_id);
  return {
    legacy_id: l.id,
    client_id: owner?.id ?? null,
    external_client_name: extName.get(l.external_client_id) ?? null,
    name: l.name,
    email: l.email,
    phone: l.phone,
    source: l.source,
    status: category(l.status, owner?.map),
    status_raw: l.status,
    campaign_name: l.campaign_name,
    zip_code: l.zip_code,
    notes: l.notes,
    created_at: l.created_at,
    updated_at: l.updated_at ?? l.created_at,
    synced_at: l.synced_at,
  };
});
if (!DRY) {
  for (let i = 0; i < cl.length; i += 500) must(await db.from("client_leads").upsert(cl.slice(i, i + 500), { onConflict: "legacy_id" }), "Kunden-Leads");
}
const byCat = cl.reduce((a, l) => ((a[l.status] = (a[l.status] ?? 0) + 1), a), {});
log(`Kunden-Leads: ${cl.length} (${cl.filter((l) => l.client_id).length} einem Kunden zugeordnet) · Gruppen ${JSON.stringify(byCat)}`);
log(DRY ? "Probelauf, nichts geschrieben." : "Import Stufe 2 abgeschlossen.");
