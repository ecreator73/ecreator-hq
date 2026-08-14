/**
 * Bereinigt Lead-Notizen: entfernt die beim Import zusaetzlich in die Notiz
 * geschriebene Dienstleistung ("Dienstleistung/Angebot: X" bzw. "Dienstleistung: X").
 * Die Dienstleistung lebt in der eigenen Spalte - in der Notiz gehoert nur der
 * echte Freitext.
 *
 * DRY-RUN per Default. Schreiben mit:  node scripts/clean-lead-notes.mjs --commit
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

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PREFIX = /dienstleistung\s*(?:\/\s*angebot)?\s*:/i;

const { data, error } = await db
  .from("leads")
  .select("id, contact_name, dienstleistung, notes")
  .is("deleted_at", null);
if (error) {
  console.error("Laden fehlgeschlagen:", error.message);
  process.exit(1);
}

const changes = [];
for (const l of data ?? []) {
  const notes = l.notes ?? "";
  if (!notes.trim() || !PREFIX.test(notes)) continue;

  let dienst = (l.dienstleistung ?? "").trim();
  let rest = notes;

  if (dienst) {
    // "Dienstleistung/Angebot: <wert>" gezielt entfernen (Wert kann abweichende Gross-/Kleinschreibung haben)
    rest = rest.replace(new RegExp(`${PREFIX.source}\\s*${esc(dienst)}`, "i"), "");
  } else {
    // Spalte leer: Wert aus der Notiz uebernehmen (bis Zeilenende) und entfernen
    const m = notes.match(new RegExp(`${PREFIX.source}\\s*([^\\n]*)`, "i"));
    if (m) {
      dienst = (m[1] ?? "").trim();
      rest = rest.replace(m[0], "");
    }
  }

  rest = rest.replace(/^[\s\n\r-]+|[\s\n\r]+$/g, "").replace(/\n{3,}/g, "\n\n");

  const newNotes = rest.trim() === "" ? null : rest.trim();
  const newDienst = dienst || null;
  if (newNotes === (l.notes ?? null) && newDienst === (l.dienstleistung ?? null)) continue;

  changes.push({ id: l.id, name: l.contact_name, oldNotes: l.notes, newNotes, oldDienst: l.dienstleistung, newDienst });
}

console.log("─".repeat(64));
console.log(`${COMMIT ? "SCHREIBEN" : "DRY-RUN"} - ${changes.length} Lead(s) betroffen (von ${data?.length ?? 0})`);
console.log("─".repeat(64));
for (const c of changes.slice(0, 15)) {
  console.log(`\n${c.name}`);
  console.log(`  Notiz alt: ${JSON.stringify(c.oldNotes)}`);
  console.log(`  Notiz neu: ${JSON.stringify(c.newNotes)}`);
  if (c.oldDienst !== c.newDienst) console.log(`  Dienstleistung: ${JSON.stringify(c.oldDienst)} -> ${JSON.stringify(c.newDienst)}`);
}
if (changes.length > 15) console.log(`\n… und ${changes.length - 15} weitere`);

if (!COMMIT) {
  console.log("\nDRY-RUN beendet. Zum Schreiben:  node scripts/clean-lead-notes.mjs --commit");
  process.exit(0);
}

let ok = 0;
const errors = [];
for (const c of changes) {
  const { error: e } = await db
    .from("leads")
    .update({ notes: c.newNotes, dienstleistung: c.newDienst })
    .eq("id", c.id);
  if (e) errors.push(`${c.name}: ${e.message}`);
  else ok++;
}
console.log(`\nAktualisiert: ${ok}/${changes.length}`);
for (const e of errors) console.log("FEHLER:", e);
