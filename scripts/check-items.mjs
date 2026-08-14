import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const L = "─".repeat(56);
console.log(L + "\nMIGRATION 0022 - POSITIONEN\n" + L);

const { error, count } = await db
  .from("document_items")
  .select("*", { count: "exact", head: true });
if (error) {
  console.log("❌ document_items:", error.message);
  process.exit(1);
}
console.log(`✅ Tabelle document_items vorhanden (${count ?? 0} Positionen)`);

// Smoke-Test: Position an einem echten Angebot anlegen und wieder entfernen
const { data: offer } = await db.from("offers").select("id, title").is("deleted_at", null).limit(1).maybeSingle();
if (!offer) {
  console.log("ℹ️  Kein Angebot vorhanden - Schreibtest uebersprungen.");
} else {
  const { data: ins, error: insErr } = await db
    .from("document_items")
    .insert({ offer_id: offer.id, description: "___SMOKE___", quantity: 2, unit_price: 150000, recurring: true })
    .select("id, quantity, unit_price, recurring")
    .single();
  if (insErr) console.log("❌ Insert:", insErr.message);
  else {
    console.log(`✅ Schreibtest ok (Menge ${ins.quantity} x ${ins.unit_price / 100} CHF, monatlich=${ins.recurring})`);
    // Check-Constraint: keine Position ohne Beleg
    const { error: badErr } = await db.from("document_items").insert({ description: "kein Beleg" });
    console.log(badErr ? "✅ Constraint aktiv (Position ohne Beleg abgelehnt)" : "⚠️ Constraint griff NICHT");
    await db.from("document_items").delete().eq("id", ins.id);
    console.log("✅ Testposition entfernt");
  }
}
console.log(L);
