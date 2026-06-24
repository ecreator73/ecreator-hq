/**
 * Erstellt den ersten Super-Admin sauber ueber Supabase Auth.
 *
 * Nutzung:
 *   1. .env.local mit NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY fuellen
 *   2. ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME in .env.local setzen
 *   3. Migration 0001_phase1_foundation.sql muss bereits ausgefuehrt sein
 *   4. `npm run create-admin`
 *   5. ADMIN_PASSWORD danach wieder aus .env.local entfernen
 *
 * Kein Passwort wird hartcodiert - alles kommt aus der Umgebung.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// --- minimaler .env.local-Loader (keine zusaetzliche Abhaengigkeit) ----------
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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local optional - Werte koennen auch direkt in der Umgebung stehen.
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME || email;

function fail(message) {
  console.error(`\n[create-admin] FEHLER: ${message}\n`);
  process.exit(1);
}

if (!url || !serviceKey) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen gesetzt sein.",
  );
}
if (!email || !password) {
  fail("ADMIN_EMAIL und ADMIN_PASSWORD muessen gesetzt sein.");
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  // Durchsucht die ersten Seiten der Nutzerliste nach der E-Mail.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === targetEmail.toLowerCase(),
    );
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  console.log(`[create-admin] Lege Super-Admin an: ${email}`);

  let userId;
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createError) {
    // Bereits vorhanden? -> bestehenden Nutzer verwenden.
    const existing = await findUserByEmail(email);
    if (!existing) fail(`Nutzer konnte nicht erstellt werden: ${createError.message}`);
    userId = existing.id;
    console.log("[create-admin] Nutzer existiert bereits - weise Rolle zu.");
  } else {
    userId = created.user.id;
    console.log("[create-admin] Auth-Nutzer erstellt.");
  }

  // super_admin-Rolle ermitteln
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("key", "super_admin")
    .single();
  if (roleError || !role) {
    fail(
      "Rolle 'super_admin' nicht gefunden. Wurde die Migration 0001 ausgefuehrt?",
    );
  }

  // Profil sollte per Trigger existieren - sicherheitshalber upserten.
  await supabase
    .from("profiles")
    .upsert(
      { id: userId, email, full_name: fullName, is_active: true },
      { onConflict: "id" },
    );

  // Rolle zuweisen
  const { error: assignError } = await supabase
    .from("user_roles")
    .upsert(
      { user_id: userId, role_id: role.id },
      { onConflict: "user_id,role_id" },
    );
  if (assignError) fail(`Rollen-Zuweisung fehlgeschlagen: ${assignError.message}`);

  console.log(
    `\n[create-admin] OK - ${email} ist jetzt Super Admin.\n` +
      "Bitte ADMIN_PASSWORD aus .env.local entfernen.\n",
  );
}

main().catch((err) => fail(err.message ?? String(err)));
