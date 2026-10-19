// Tests der reinen Marketing-Logik (ohne Datenbank).
// Ausfuehren: node --experimental-strip-types scripts/test-marketing.mts
import assert from "node:assert/strict";
import { classifyAttribution, classifyGa4, channelGroup } from "../src/lib/marketing/channels.ts";
import { resolveRange, utcBounds, zurichDay, zurichStartIso, addDaysStr } from "../src/lib/marketing/range.ts";
import { sign, verifySignature } from "../src/server/marketing/signature.ts";

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log("ok -", name); };

// Kanaele
t("gclid = Google Ads", () => assert.equal(classifyAttribution({ gclid: "x", landingPage: "/" }).channel, "google_ads"));
t("gclid schlaegt utm organic", () => assert.equal(classifyAttribution({ gclid: "x", utmSource: "google", utmMedium: "organic" }).channel, "google_ads"));
t("google/cpc = Google Ads", () => assert.equal(classifyAttribution({ utmSource: "google", utmMedium: "cpc" }).channel, "google_ads"));
t("facebook/paid_social = Meta Ads", () => assert.equal(classifyAttribution({ utmSource: "facebook", utmMedium: "paid_social" }).channel, "meta_ads"));
t("ig/cpc = Meta Ads", () => assert.equal(classifyAttribution({ utmSource: "ig", utmMedium: "cpc" }).channel, "meta_ads"));
t("fbclid ohne UTM = unklar", () => assert.equal(classifyAttribution({ fbclid: "x", landingPage: "/" }).channel, "meta_unclear"));
t("facebook/social = organisch", () => assert.equal(classifyAttribution({ utmSource: "facebook", utmMedium: "social" }).channel, "meta_organic"));
t("newsletter = E-Mail", () => assert.equal(classifyAttribution({ utmSource: "mailchimp", utmMedium: "newsletter" }).channel, "email"));
t("Referrer google.ch = Google Organic", () => assert.equal(classifyAttribution({ referrer: "https://www.google.ch/", landingPage: "/" }).channel, "google_organic"));
t("Referrer bing = andere Suche", () => assert.equal(classifyAttribution({ referrer: "https://www.bing.com/search?q=x" }).channel, "other_search"));
t("Referrer l.facebook = Meta organisch", () => assert.equal(classifyAttribution({ referrer: "https://l.facebook.com/" }).channel, "meta_organic"));
t("Referrer fremde Seite = Referral", () => assert.equal(classifyAttribution({ referrer: "https://example.org/a" }).channel, "referral"));
t("nur Landingpage = Direct", () => assert.equal(classifyAttribution({ landingPage: "/kontakt" }).channel, "direct"));
t("nichts = Unknown", () => assert.equal(classifyAttribution({}).channel, "unknown"));
t("paid nie organic/direct", () => {
  for (const m of ["cpc", "ppc", "paid", "display", "paid_social"]) for (const s of ["google", "facebook", "bing", "foo", "linkedin"]) {
    const g = channelGroup(classifyAttribution({ utmSource: s, utmMedium: m }).channel);
    assert.ok(g !== "organic" && g !== "direct", `${s}/${m} -> ${g}`);
  }
});
t("GA4 (direct)/(none)", () => assert.equal(classifyGa4("(direct)", "(none)"), "direct"));
t("GA4 google/organic", () => assert.equal(classifyGa4("google", "organic"), "google_organic"));
t("GA4 google/cpc", () => assert.equal(classifyGa4("google", "cpc"), "google_ads"));
t("GA4 bing/organic", () => assert.equal(classifyGa4("bing", "organic"), "other_search"));

// Zeitzone Europe/Zurich
t("Mitternacht Sommerzeit", () => assert.equal(zurichStartIso("2026-07-01"), "2026-06-30T22:00:00.000Z"));
t("Mitternacht Winterzeit", () => assert.equal(zurichStartIso("2026-12-01"), "2026-11-30T23:00:00.000Z"));
t("Umstellungstag 25.10.2026 (25 h)", () => {
  const b = utcBounds({ from: "2026-10-25", to: "2026-10-25" });
  assert.equal((Date.parse(b.end) - Date.parse(b.start)) / 3_600_000, 25);
});
t("23:30 UTC im Sommer = naechster Tag in Zuerich", () => assert.equal(zurichDay("2026-07-01T23:30:00Z"), "2026-07-02"));
t("30 Tage inkl. heute", () => { const r = resolveRange({ range: "30d" }, new Date("2026-10-19T10:00:00Z")); assert.equal(r.from, "2026-09-20"); assert.equal(r.to, "2026-10-19"); assert.equal(r.days, 30); });
t("Vorperiode direkt davor", () => { const r = resolveRange({ range: "7d" }, new Date("2026-10-19T10:00:00Z")); assert.deepEqual(r.compare, { from: "2026-10-06", to: "2026-10-12" }); });
t("Letzter Monat", () => { const r = resolveRange({ range: "last_month" }, new Date("2026-03-15T10:00:00Z")); assert.equal(r.from, "2026-02-01"); assert.equal(r.to, "2026-02-28"); });
t("Vorjahr 29.02.", () => { const r = resolveRange({ range: "custom", from: "2028-02-29", to: "2028-02-29", compare: "yoy" }, new Date("2028-03-10T10:00:00Z")); assert.equal(r.compare?.from, "2027-02-28"); });
t("Ungueltiger eigener Zeitraum -> 30 Tage", () => { const r = resolveRange({ range: "custom", from: "x", to: "y" }, new Date("2026-10-19T10:00:00Z")); assert.equal(r.days, 30); });
t("addDays Monatswechsel", () => assert.equal(addDaysStr("2026-01-31", 1), "2026-02-01"));

// HMAC
const secret = "s".repeat(40);
t("Signatur gueltig", () => assert.deepEqual(verifySignature(sign(secret, '{"a":1}'), '{"a":1}', secret), { ok: true }));
t("Signatur falscher Body", () => assert.equal(verifySignature(sign(secret, '{"a":1}'), '{"a":2}', secret).ok, false));
t("Signatur falscher Schluessel", () => assert.equal(verifySignature(sign("x".repeat(40), "b"), "b", secret).ok, false));
t("Signatur abgelaufen", () => { const old = Math.floor(Date.now() / 1000) - 600; const r = verifySignature(sign(secret, "b", old), "b", secret); assert.equal(r.ok ? "" : r.reason, "expired"); });
t("Signatur fehlt", () => { const r = verifySignature(null, "b", secret); assert.equal(r.ok ? "" : r.reason, "missing"); });
t("Calendly-Format mehrere v1", () => { const s = sign(secret, "b"); const [ts, v1] = s.split(","); assert.equal(verifySignature(`${ts},v1=deadbeef,${v1}`, "b", secret).ok, true); });

console.log(`\n${n} Tests bestanden`);
