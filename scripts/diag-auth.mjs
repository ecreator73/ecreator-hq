import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const L = "─".repeat(60);
console.log(L + "\nAUTH-DIAGNOSE\n" + L);

// 1) Alle Auth-Benutzer + Zustand
const { data, error } = await admin.auth.admin.listUsers({ perPage: 50 });
if (error) { console.log("listUsers FEHLER:", error.message); process.exit(1); }
console.log(`Benutzer gesamt: ${data.users.length}`);
for (const u of data.users) {
  console.log(`  • ${u.email}`);
  console.log(`      bestätigt: ${u.email_confirmed_at ? "ja" : "NEIN"} | letzter Login: ${u.last_sign_in_at ?? "nie"}`);
  console.log(`      gesperrt bis: ${u.banned_until ?? "-"} | erstellt: ${u.created_at?.slice(0, 10)}`);
}

// 2) Profile aktiv?
const { data: profs } = await admin.from("profiles").select("email, full_name, is_active");
console.log("\nProfile (is_active):");
for (const p of profs ?? []) console.log(`  • ${p.email} | aktiv=${p.is_active}`);

// 3) Login-Endpunkt-Test mit ABSICHTLICH falschem Passwort:
//    "Invalid login credentials"  => Auth-System OK, Passwort/Eingabe ist das Problem
//    andere Meldung               => Konfigurationsproblem (z.B. Logins deaktiviert)
const { error: e1 } = await anon.auth.signInWithPassword({ email: "info@ecreator.ch", password: "definitiv-falsch-123" });
console.log("\nLogin-Test (falsches PW, erwartet 'Invalid login credentials'):");
console.log("  =>", e1 ? `${e1.status} ${e1.message}` : "UNERWARTET: kein Fehler?!");
console.log(L);
