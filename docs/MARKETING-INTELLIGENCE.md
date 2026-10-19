# Marketing Intelligence Dashboard – Audit und Architekturvorschlag

Stand: 19.10.2026. Status: **umgesetzt und ausgerollt**; offen: Migration 0023 einspielen, danach Weiterleitung der Website aktivieren, Zugänge (siehe Abschnitt 7).

## 0. Entscheidungen des Kunden (19.10.2026)

1. **Ort:** Das Dashboard kommt als Bereich «Marketing» in eCreator OS (ecreator-hq).
2. **Lead-Hauptsystem:** **eCreator OS wird das Hauptsystem** für alle Leads. Das Lovable-CRM wird abgelöst und mit Claude Code in eCreator OS neu gebaut. Darum schreibt der Lead-Eingang direkt in das Lead-Modell von eCreator OS (bestehende `leads`-Tabelle erweitern statt einer getrennten Kopie). Übergang: Die Website schickt weiter an Lovable **und** an eCreator OS, bis eCreator OS den Vertrieb übernimmt; danach wird `LEAD_WEBHOOK_URL` (Lovable) abgeschaltet.
3. **Freigabe für alles:** Website-Änderung (serverseitig), Migrationen, Umgebungsvariablen in Vercel, Deployments.
4. **Zugänge** (GA4, Google Ads, Calendly, Search Console, ggf. Meta) richtet eCreator später ein. Bis dahin zeigen die Bereiche «Integration erforderlich».

Abweichung zu Abschnitt 3: `mi_website_leads`/`mi_contacts` entfallen zugunsten der bestehenden Tabellen `leads` und `contacts` (erweitert um Attribution, Formular, Idempotenz-Schlüssel).

## 1. Audit (Phase 1)

### Öffentliche Website `ecreator-editorial` (www.ecreator.ch)
- Next.js 16.3 (App Router), React 19, Tailwind 4; Vercel `ecreator-website` (fra1), Push auf `main` = Production.
- **Keine Datenbank, kein Login, keine Middleware, keine Admin-Routen.** Einzige Laufzeit-Abhängigkeiten: next, react, react-dom.
- **Lead-Wege** (alle serverseitig, gemeinsamer Versand `src/lib/leads/deliver.ts` an das Lovable-CRM, Edge-Funktion `receive-lead`):

| Formular | Route | Lead-Typ |
|---|---|---|
| Kontaktformular `/kontakt` | `POST /api/contact` | `kontakt` (kt_) |
| Rückruf «Was bremst dein Wachstum?» (Startseite) | `POST /api/callback` | `rueckruf` (rr_) |
| Growth Check (Startseite) | `POST /api/growth-check/lead` | `growth-check` (gc_) |
| Strategie-Call (Calendly inline) | `POST /api/booking` | `strategie-call` (sc_) |

- Validierung serverseitig, Honeypot (ausser Booking), Origin-Prüfung, 32 KB Limit. **Keine E-Mail-Benachrichtigungen** (das CRM übernimmt). **Keine Dublettensperre** bei Formularen (Doppelklick = zwei Leads); Booking nur pro Server-Instanz.
- **Attribution:** `AttributionCapture` speichert First-Touch pro Sitzung in `sessionStorage` (`ec-attribution`): utm_*, Einstiegsseite, externer Referrer, Zeit, Klick-IDs (gclid, gbraid, wbraid, fbclid, msclkid, ttclid, li_fat_id); zuletzt angesehene Leistung (`ec-service`). Kein Cookie, nur Tab-Sitzung. Geht mit jedem Lead an das CRM.
- **Calendly:** Inline-Widget mit UTM-Übergabe; nach `calendly.event_scheduled` holt `/api/booking` Termin und Teilnehmer per API (`CALENDLY_TOKEN`). **Kein Webhook:** Buchungen direkt auf calendly.com (Link «neuer Tab») und Absagen/Verschiebungen kommen nirgends an.
- **Tracking:** GTM `GTM-54ZXVVTX` (Container leer) und Google-Tag `AW-18508506378` im `<head>`, Consent Mode v2 (Standard «abgelehnt»), Laden nach LCP + 0.8 s. dataLayer-Ereignisse in `src/lib/track.ts` (u.a. `contact_form_submitted`, `callback_submitted`, `growth_check_submitted`, `booking_completed`). Noch **keine GA4-Property**, **keine Google-Ads-Conversion-Aktionen**, kein Meta Pixel (Kundenwunsch).

### eCreator OS `ecreator-hq` (internes Betriebssystem)
- Next.js 15, Supabase (Postgres + Auth + RLS, Projekt `zepqoxcvqgkkkbuhcwnc`), Vercel `ecreator-hq` (fra1), Cron (täglich).
- Login mit E-Mail/Passwort, 9 Rollen, serverseitige Prüfung (`requireUser`/`requireRole`), RLS auf allen Tabellen. **Kein MFA.**
- 22 Migrationen, u.a. `leads`, `lead_sources`, `ad_integrations`, `ad_lead_events`, `integrations`, `webhooks`; verschlüsselte Zugangsdaten (`CREDENTIALS_SECRET`, AES-256-GCM).
- Integrationen: Meta Lead Ads (OAuth + Webhook), Zapier-Lead-Eingang. Google Ads, GA4, Search Console, Calendly nur «geplant».

### eCreator Command `ecreator-analytics` (Kunden-Reporting, marketing.ecreator.ch)
- Vite/React + Express-API auf Hetzner, Daten in JSON-Dateien (keine DB).
- **Echte API-Anbindungen** in `server/providers/`: GA4 Data API, Google Ads API (GAQL), Search Console, Meta Marketing API, TikTok, Clarity. OAuth-Ablauf mit einem Google-Client. Kein Calendly.

### Leistungs-Baseline der Website (vor jeder Änderung, 19.10.2026)

Lighthouse 13.4 im Labor (lokaler Produktions-Build = Stand live 2a4e072, Google-Abrufe blockiert), je 1 Lauf. INP ist nicht gemessen: Dafür braucht es Felddaten, und Google hat für ecreator.ch noch keine (CrUX «Keine Daten»).

| Gerät | Seite | Perf | A11y | BP | SEO | FCP s | LCP s | CLS | TBT ms | TTFB ms | JS KB | gesamt KB | Anfragen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mobil | Startseite | 92 | 100 | 100 | 100 | 1.21 | 3.32 | 0.000 | 16 | 6 | 184 | 434 | 36 |
| mobil | Leistungsseite (/leistungen/seo) | 95 | 100 | 100 | 100 | 1.21 | 2.79 | 0.000 | 14 | 209 | 199 | 429 | 40 |
| mobil | Kontakt | 94 | 100 | 100 | 100 | 1.06 | 3.09 | 0.000 | 18 | 4 | 196 | 416 | 38 |
| mobil | Landingpage (/google-ads-agentur) | 94 | 100 | 100 | 100 | 1.21 | 3.01 | 0.000 | 13 | 4 | 209 | 462 | 42 |
| desktop | Startseite | 100 | 100 | 100 | 100 | 0.33 | 0.70 | 0.000 | 0 | 7 | 218 | 544 | 65 |
| desktop | Leistungsseite | 100 | 100 | 100 | 100 | 0.29 | 0.59 | 0.000 | 0 | 5 | 225 | 498 | 53 |
| desktop | Kontakt | 100 | 100 | 100 | 100 | 0.29 | 0.63 | 0.000 | 0 | 3 | 218 | 466 | 54 |
| desktop | Landingpage | 100 | 100 | 100 | 100 | 0.33 | 0.65 | 0.000 | 0 | 3 | 234 | 530 | 55 |

Die simulierten LCP-Werte mobil (2.8–3.3 s) sind lokale Laborwerte; PageSpeed live lag zuletzt bei 2.1–2.9 s. Mit dem empfohlenen Aufbau ändert sich am Website-Bundle nichts; nachher wird dieselbe Messung wiederholt.

## 2. Empfehlung: Dashboard als Bereich «Marketing» in eCreator OS

**Warum dort und nicht auf der Website:**
- Die öffentliche Website bleibt unverändert schnell: kein Dashboard-Code, keine Chart-Bibliothek, keine Login-Logik im Website-Bundle.
- eCreator OS hat bereits alles, was ein internes Dashboard braucht: Login, Rollen, RLS, verschlüsselte Zugangsdaten, Cron, Supabase in der EU, Lead-Tabellen.
- Die Anbindungen an GA4, Google Ads, Search Console und Meta existieren in eCreator Command und werden nach eCreator OS übertragen (gleiche APIs, neu in TypeScript, Daten in Postgres statt JSON).

**Datenfluss:**

```
Website-Formular ──► /api/* (Website) ──► Lovable-CRM (bleibt Hauptsystem für den Vertrieb)
                                   └──► eCreator OS /api/ingest/website-lead (signiert, nach der Antwort, idempotent)
Calendly ──Webhook──► eCreator OS /api/webhooks/calendly (Signatur, Absagen, Verschiebungen)
GA4 / Google Ads / Meta Ads / Search Console ──täglicher Abgleich (Cron)──► Postgres (Kennzahlen pro Tag)
                                                                              │
                                                     Dashboard /marketing/* ◄─┘ (nur Server-Abfragen)
```

**Änderung an der Website (einzige):** In den vier Lead-Routen geht jeder Lead nach dem erfolgreichen CRM-Versand zusätzlich serverseitig an eCreator OS (`after()` von Next.js, also nach der Antwort an den Besucher; HMAC-Signatur; bei Fehlern Log ohne Personendaten). Kein neues Script im Browser, keine neuen Cookies, keine sichtbare Änderung. Dazu eine Dublettensperre für Doppelklicks (Idempotenz-Schlüssel pro Formular-Absendung).

## 3. Datenmodell (Migration 0023 in eCreator OS)

| Tabelle | Inhalt | Eindeutig |
|---|---|---|
| `mi_website_leads` | Lead der Website inkl. First-Touch-Attribution, Formular, Seiten, Klick-IDs, Status, Zuständig | `external_lead_id` |
| `mi_contacts` | Person (E-Mail/Telefon normalisiert), mehrere Leads pro Kontakt | `email_norm` |
| `mi_bookings` | Calendly-Termine inkl. Status (aktiv, abgesagt, verschoben), UTM aus `tracking` | `calendly_invitee_uri` |
| `mi_lead_activities` | Statuswechsel, Notizen, Zuordnungen (Audit) | – |
| `mi_daily_channel_metrics` | Tag × Plattform × Kampagne: Impressionen, Klicks, Kosten (CHF), Plattform-Conversions | (Datum, Plattform, Konto, Kampagne) |
| `mi_daily_ga4_metrics` | Tag × Kanal/Quelle/Medium/Landingpage: Nutzer, Sitzungen, Engagement, Key Events | (Datum, Dimensionen) |
| `mi_gsc_daily` | Tag × Seite/Suchanfrage: Klicks, Impressionen, CTR, Position | (Datum, Seite, Query) |
| `mi_sync_runs` | Abgleich-Läufe: Start, Ende, Zeilen, Fehler, Frische | – |

Drei Zählweisen bleiben getrennt und werden im Dashboard so beschriftet: **Plattform-Conversions** (Google/Meta), **Website-Leads** (erste Partei), **CRM-Ergebnis** (Status im Vertrieb). Fehlt etwas: «Integration erforderlich», «Keine Daten verfügbar» oder «Daten werden synchronisiert», nie erfundene Werte.

## 4. Was von euch gebraucht wird (Zugänge)

| Anbindung | Benötigt | Stand |
|---|---|---|
| Website-Leads | Gemeinsamer Signatur-Schlüssel in Vercel (Website + eCreator OS) | kann ich vorbereiten, Setzen braucht Freigabe |
| Calendly | Personal Access Token (Webhooks ab Calendly «Standard») | Token-Feld in der Website existiert schon |
| GA4 | GA4-Property für www.ecreator.ch (gibt es noch nicht), Lesezugriff | offen |
| Google Ads | Developer-Token (über ein Verwaltungskonto, Antrag bei Google), OAuth-Client, Konto 204-916-5141 | offen |
| Search Console | Property www.ecreator.ch bestätigt, Lesezugriff | prüfen |
| Meta Ads | Werbekonto + Token mit `ads_read` (nur Kosten/Leistung, kein Pixel auf der Website) | offen, nur falls ihr Meta Ads schaltet |

## 5. Phasen

1. Datenbank (Migration 0023, RLS: nur `super_admin`, `ceo`, `cso`; neue Rolle «marketing» optional).
2. Website-Lead-Eingang + Dublettensperre (einzige Website-Änderung, serverseitig).
3. Dashboard-Grundgerüst `/marketing` mit Leads, Lead-Detail, Live-Aktivität (nur echte Ereignisse).
4. Calendly-Webhook (Buchung, Absage, Verschiebung) und Verknüpfung mit Website-Leads.
5. Google Ads, GA4, Search Console, Meta: Anbindung, täglicher Abgleich, Kampagnen- und Kanalberichte.
6. Attribution, Funnel, Landingpages, Vergleiche, CSV-Export, Tracking-Gesundheit.
7. Sicherheit (MFA empfohlen), Leistungsvergleich Website vorher/nachher, Test, Deploy-Plan.

## 6. Freigabe nötig

- Architektur: Dashboard in eCreator OS (empfohlen) statt eigener App.
- Lead-Hauptsystem: Lovable-CRM bleibt für den Vertrieb; eCreator OS speichert eine Kopie für Auswertungen. (Alternative: eCreator OS wird Lead-Hauptsystem.)
- Website-Änderung: zusätzlicher serverseitiger Versand an eCreator OS + Dublettensperre.
- Neue Umgebungsvariablen in Vercel (Website und eCreator OS) und Migration 0023 in der Supabase-Datenbank von eCreator OS.
- Jedes Deployment (Website und eCreator OS).

## 7. Umsetzung (19.10.2026)

### Gebaut
| Teil | Ort |
|---|---|
| Migration (leads/contacts erweitert, mi_*-Tabellen, RLS nur Leitung) | `supabase/migrations/0023_marketing_intelligence.sql` |
| Website-Lead-Eingang (HMAC, Idempotenz, Doppelklick) | `src/app/api/webhooks/website-lead/route.ts`, `src/server/marketing/website-lead.ts` |
| Calendly-Webhook, Buchungen, Backfill | `src/app/api/webhooks/calendly/route.ts`, `src/server/marketing/bookings.ts`, `providers/calendly.ts` |
| Provider GA4, Google Ads, Search Console, Meta | `src/server/marketing/providers/*.ts` |
| Abgleich (Cron täglich 04:30 UTC, manuell) | `src/server/marketing/sync.ts`, `src/app/api/cron/marketing-sync/route.ts` |
| Kanalklassifizierung, Zeiträume Europe/Zurich | `src/lib/marketing/channels.ts`, `src/lib/marketing/range.ts` |
| Dashboard (22 Seiten, 7 Gruppen) | `src/app/(app)/marketing/**` |
| CSV-Export (serverseitig, Audit-Log) | `src/app/api/marketing/export/route.ts` |
| Tests (35) | `node --experimental-strip-types scripts/test-marketing.mts` |
| Website: Weiterleitung + Dublettensperre | ecreator-editorial `src/lib/leads/ecreator-os.ts`, `src/lib/leads/deliver.ts` (Commit 4db05c8) |
| Leistung vorher/nachher | `docs/baseline/website-2026-10-19-nachher.md` (keine Regression) |

### Umgebungsvariablen
| Projekt | Variable | Stand |
|---|---|---|
| ecreator-hq | `WEBSITE_LEAD_SECRET`, `CRON_SECRET` | gesetzt (19.10.2026) |
| ecreator-hq | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN` (optional `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, `GOOGLE_ADS_API_VERSION`) | offen (Kunde) |
| ecreator-website | `WEBSITE_LEAD_SECRET` | gesetzt (19.10.2026) |
| ecreator-website | `ECREATOR_OS_LEAD_URL` = `https://ecreator-hq.vercel.app/api/webhooks/website-lead` | **erst nach Migration 0023 setzen**, dann Website neu deployen |
Calendly-Token und Meta-Token werden im Dashboard unter Marketing → Integrationen hinterlegt (verschlüsselt, `CREDENTIALS_SECRET`).

### Aktivierung (Reihenfolge)
1. `0023_marketing_intelligence.sql` im Supabase-SQL-Editor ausführen (idempotent, löscht nichts).
2. Marketing → Tracking-Gesundheit öffnen: Datenbank bereit.
3. In Vercel «ecreator-website» `ECREATOR_OS_LEAD_URL` setzen und neu deployen. Ab dann landet jeder Website-Lead zusätzlich in eCreator OS.
4. Calendly verbinden (Token, Webhook wird automatisch registriert), Buchungen 90 Tage nachladen.
5. Google-OAuth-Client anlegen, Variablen setzen, «Mit Google verbinden», GA4-Property (neu anlegen), Ads-Konto 204-916-5141, Search-Console-Site wählen, «Backfill 90 Tage».
6. Optional Meta Ads (System-User-Token mit ads_read).
7. Umstellung: Wenn eCreator OS den Vertrieb übernimmt, `LEAD_WEBHOOK_URL` in «ecreator-website» entfernen → eCreator OS ist einziges Ziel.

### Abweichungen und Grenzen
- Status-Set: Die bestehenden CRM-Status (neu, nicht erreicht, Follow-up, Mail gesendet, Termin gebucht, Vertrag/Mail, Abgeschlossen, Absage …) bleiben massgebend; «Qualifiziert» und «Offerte gesendet» aus dem Briefing gibt es nicht als eigenen Status (keine zweite Status-Welt).
- Rollen: ADMIN/MANAGEMENT = super_admin, ceo, cso (Zugriff Marketing). EMPLOYEE (sales) sieht Leads im CRM, nicht das Marketing-Dashboard.
- Visitor Journeys nur «Einstieg → Anfrage»; vollständige Seitenpfade bräuchten zusätzliches JavaScript auf der Website (Performance-/Design-Freeze).
- Spend je Landingpage nicht zurechenbar (kein Landingpage-Bericht der Plattformen); wird nicht geschätzt.
- Website-Leads je Google-Kampagne nur mit utm_campaign; Auto-Tagging (nur gclid) ordnet dem Kanal, nicht der Kampagne zu.
- Doppelklick-Sperre der Website wirkt pro Server-Instanz; eCreator OS erkennt zusätzlich instanzübergreifend (Fingerprint, 10 Min.). Lovable kann im Ausnahmefall einen doppelten Lead erhalten.
