/**
 * Berechnet lead_score fuer alle Leads neu (Spiegel von src/lib/lead-score.ts).
 * Notwendig, weil importierte Leads durchgaengig 0 haben - dadurch sind
 * Sortierung und "Heisse Leads" ohne Aussage.
 *
 * DRY-RUN per Default. Schreiben mit:  node scripts/recompute-lead-scores.mjs --commit
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const COMMIT = process.argv.includes("--commit");

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// --- Spiegel von src/lib/lead-score.ts ---
const STAGE_SCORE = {
  neu: 10, nicht_erreicht: 18, mehrfach_nicht_erreicht: 12, followup: 35,
  mail_gesendet: 45, termin_gebucht: 65, vertrag_mail: 85, abgeschlossen: 100,
  absage: 0, fehleintrag: 0, andere: 5,
};
const SIZE_BONUS = { solo: 0, small: 3, medium: 7, large: 12 };

function computeLeadScore({ status, estimated_value, company_size, next_action_date }) {
  const s = status ?? "neu";
  if (s === "abgeschlossen") return 100;
  if (s === "absage" || s === "fehleintrag") return 0;
  let score = STAGE_SCORE[s] ?? 10;
  const value = estimated_value ?? 0;
  if (value >= 50_000_00) score += 15;
  else if (value >= 20_000_00) score += 10;
  else if (value >= 5_000_00) score += 5;
  score += SIZE_BONUS[company_size ?? ""] ?? 0;
  if (next_action_date) score += 5;
  return Math.max(0, Math.min(100, score));
}

const { data, error } = await db
  .from("leads")
  .select("id, contact_name, lead_score, estimated_value, company_size, next_action_date, status:statuses!leads_status_id_fkey(key)")
  .is("deleted_at", null);
if (error) { console.error("Laden fehlgeschlagen:", error.message); process.exit(1); }

const changes = [];
for (const l of data ?? []) {
  const next = computeLeadScore({
    status: l.status?.key,
    estimated_value: l.estimated_value,
    company_size: l.company_size,
    next_action_date: l.next_action_date,
  });
  if (next !== (l.lead_score ?? 0)) changes.push({ id: l.id, name: l.contact_name, from: l.lead_score ?? 0, to: next, status: l.status?.key });
}

const buckets = {};
for (const c of changes) buckets[c.status] = buckets[c.status] ?? c.to;
console.log("─".repeat(60));
console.log(`${COMMIT ? "SCHREIBEN" : "DRY-RUN"} - ${changes.length} von ${data?.length ?? 0} Leads bekommen einen neuen Score`);
console.log("─".repeat(60));
console.log("Neuer Score je Status (Beispielwert):");
for (const [k, v] of Object.entries(buckets).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\nDavon >= 70 ("heiss"): ${changes.filter((c) => c.to >= 70).length}`);

if (!COMMIT) {
  console.log("\nDRY-RUN beendet. Zum Schreiben:  node scripts/recompute-lead-scores.mjs --commit");
  process.exit(0);
}

let ok = 0;
const errs = [];
for (const c of changes) {
  const { error: e } = await db.from("leads").update({ lead_score: c.to }).eq("id", c.id);
  if (e) errs.push(`${c.name}: ${e.message}`); else ok++;
}
console.log(`\nAktualisiert: ${ok}/${changes.length}`);
for (const e of errs) console.log("FEHLER:", e);
