# 9 Automationen

## 9.1 Zweck und Einordnung

Automationen sind das operative Nervensystem von eCreator OS. Sie setzen das Leitprinzip **"Eine Plattform. Eine Datenbank. Ein Login. Alles verbunden."** in konkrete, wiederkehrende Handlungen um: Statt dass Mitarbeitende manuell daran denken müssen, einem Lead nach drei Tagen erneut zu schreiben oder einen Vertrag 60 Tage vor Ablauf zu prüfen, erzeugt das System diese Schritte selbst.

Jede Automation folgt strikt dem Muster **Trigger → Bedingung(en) → Aktion(en)**. Sie liest und schreibt ausschliesslich in den kanonischen Kern- und Hilfstabellen (siehe Kanonische Referenz, Abschnitt 4) und respektiert das vollständige Sicherheits- und Rechtemodell (Row Level Security, rollenbasierte Rechte, Audit Logs).

Wichtige Abgrenzung:

- **Automationen** (dieser Abschnitt) sind **interne** Regeln, die das System selbst ausführt. Sie sind in der Tabelle `automations` konfiguriert und im Modul **Operations → Automationen** (`/operations/automations`) sichtbar.
- **AI-Engines** (Kanonische Referenz, Abschnitt 5) sind die zwölf intelligenten Erzeuger von Aufgaben, Chancen und Entwürfen. Engines *liefern Input* (z. B. neue `opportunities`), Automationen *reagieren auf Ereignisse* und *erzeugen Folgeaktionen*. Beide arbeiten zusammen, sind aber konzeptionell und in der Tabellenstruktur getrennt.
- **Integrationen** (Abschnitt 10) sind die Anbindungen an Drittsysteme. Automationen können Integrationen als Aktion nutzen (z. B. "E-Mail über Resend senden"), funktionieren in der Grundausbaustufe aber auch rein In-App (In-App-Benachrichtigung, Aufgabe, Statuswechsel).

Das Leitprinzip **"Was muss heute gemacht werden?"** bedeutet hier: Eine Automation soll im Zweifel eine **konkrete Aufgabe oder Benachrichtigung** für eine verantwortliche Person erzeugen, statt eine Aktion still im Hintergrund auszuführen. So bleibt der Mensch in Kontrolle, und der nächste Schritt ist immer sichtbar.

---

## 9.2 Die Automation-Engine (technisches Modell)

Die Automation-Engine besteht aus zwei komplementären Auslösemechanismen. Jede Automation gehört genau einem der beiden Typen an; der Typ wird in `automations.trigger_type` hinterlegt.

### 9.2.1 Event-basierte Auslösung (Echtzeit)

Event-basierte Automationen reagieren sofort auf eine schreibende Aktion in der Plattform. Da im kanonischen Modell **jede schreibende Aktion** einen Eintrag in `audits` und **jede sichtbare Statusänderung** einen Eintrag in `activity_logs` erzeugt, existiert bereits ein vollständiger, zentraler Ereignisstrom. Die Engine hängt sich an genau diesen Strom.

- **Quelle der Ereignisse:** Server Actions und API Routes feuern beim erfolgreichen Schreiben ein internes Domänen-Ereignis (z. B. `lead.created`, `offer.status_changed`, `meeting.completed`). Technisch wird dieses Ereignis aus dem ohnehin geschriebenen `activity_logs`-/`audits`-Eintrag abgeleitet bzw. parallel ausgelöst.
- **Verarbeitung:** Die Engine prüft, welche aktiven Automationen (`automations.status = active`) auf dieses Ereignis registriert sind, wertet deren Bedingungen aus und führt bei Treffer die Aktionen aus.
- **Zustellung:** Event-Automationen sind latenzarm (Sekundenbereich). Sie eignen sich für alles, was unmittelbar passieren soll: Onboarding starten, sobald ein Lead gewonnen wurde; Aufgaben erzeugen, sobald ein Meeting als abgeschlossen markiert wird.

### 9.2.2 Cron-Tick-Auslösung (zeitgesteuert)

Zeitbasierte Automationen können nicht auf ein Ereignis warten, weil ihr Auslöser das **Verstreichen von Zeit** oder das **Erreichen eines Datums** ist (z. B. "Vertrag läuft in 60 Tagen ab", "kein Kontakt seit 5 Tagen"). Hierfür läuft ein zentraler **Cron-Tick** über Supabase/Next.js Cron Jobs.

- **Taktung:** Ein Haupt-Tick läuft mehrmals täglich (empfohlen: stündlich für Fälligkeits- und Eskalationslogik, plus ein dedizierter Tageslauf früh morgens für "Mein Tag"-Vorbereitung). Die genaue Frequenz ist pro Automation in `automations.config` (Cron-Ausdruck/Intervall) hinterlegt.
- **Arbeitsweise:** Bei jedem Tick selektiert die Engine alle aktiven zeitbasierten Automationen, wertet ihre Bedingungen gegen die aktuellen Daten aus (z. B. "alle `contracts` mit `end_date` zwischen heute+60 und heute+61 Tagen") und führt die Aktionen für jeden Treffer aus.
- **Idempotenz:** Damit nicht bei jedem Tick dieselbe Erinnerung erneut erzeugt wird, hält die Engine pro Automation und Zielobjekt fest, wann zuletzt ausgelöst wurde (`last_run_at` auf Automationsebene sowie ein De-Duplizierungs-Schlüssel je Objekt, gespeichert im Lauf-Protokoll). So gilt: "höchstens einmal pro Objekt pro Schwelle".

### 9.2.3 Gemeinsamer Verarbeitungskern

Unabhängig vom Auslösetyp durchläuft jede Auslösung dieselben Phasen:

1. **Match** – Passt das Ereignis/der Tick auf eine aktive Automation?
2. **Evaluate** – Sind alle Bedingungen erfüllt? (Feldvergleiche, Statusprüfungen, Zeitfenster, Rollen-/Zuständigkeitsprüfungen.)
3. **Guard** – Rechte- und Sicherheitsprüfung (siehe 9.4). Darf diese Aktion im Kontext der betroffenen Objekte ausgeführt werden?
4. **Act** – Aktionen ausführen (Aufgabe erstellen, Benachrichtigung senden, Status setzen, Integration aufrufen).
5. **Log** – Lauf protokollieren: Eintrag in `audits` (Systemaktion, wer/was/wann, alt/neu), fachlicher Eintrag in `activity_logs` am betroffenen Objekt, plus Aktualisierung von `automations.last_run_at` und der Lauf-Historie.

Jede automatisch ausgeführte schreibende Aktion wird im `audits`-Trail als Akteur "System / Automation #<id>" gekennzeichnet, sodass jederzeit nachvollziehbar bleibt, dass nicht ein Mensch, sondern eine Regel gehandelt hat.

---

## 9.3 Bezug zur Tabelle `automations`

Die Tabelle `automations` (Kern-Tabelle #23, Domäne E – Operations & Dateien) ist die **Konfigurations- und Protokollheimat** aller Regeln dieses Abschnitts. Sie wird hier als beschreibende Feld-Tabelle skizziert (kein SQL, gemäss Planungsvorgabe). Die Felder folgen den verbindlichen Namens- und Status-Konventionen (Abschnitt 8 der Referenz).

| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | UUID | Primärschlüssel der Automation. |
| `org_id` | UUID (FK `organizations`) | Mandant (Default eCreator); Basis aller RLS-Policies. |
| `name` | Text | Sprechender Name der Regel (z. B. "Lead-Follow-up Tag 3"). |
| `description` | Text | Klartext-Beschreibung von Trigger/Bedingung/Aktion für Operations. |
| `trigger_type` | Enum (`event`, `cron`) | Auslöseart gemäss 9.2 (Event-basiert oder Cron-Tick). |
| `trigger_event` | Text (nullable) | Bei `event`: Domänen-Ereignis, z. B. `lead.status_changed`. |
| `schedule` | Text (nullable) | Bei `cron`: Cron-Ausdruck/Intervall. |
| `conditions` | JSON | Strukturierte Bedingungen (Feld, Operator, Wert, Zeitfenster). |
| `actions` | JSON | Geordnete Liste von Aktionen (Typ + Parameter). |
| `target_table` | Text | Primär betroffene Kern-Tabelle (z. B. `leads`, `contracts`). |
| `status` | Enum `automation_status` (`active`, `paused`, `error`) | Betriebszustand der Regel. |
| `is_system` | Boolean (`is_`-Präfix) | Vom System ausgelieferte Standard-Regel vs. selbst angelegt. |
| `last_run_at` | timestamptz | Zeitpunkt der letzten Auslösung (Idempotenz/Monitoring). |
| `last_error` | Text (nullable) | Letzte Fehlermeldung bei `status = error`. |
| `run_count` | Integer | Gesamtzahl erfolgreicher Läufe (Statistik). |
| `owner_id` | UUID (FK `users`) | Fachlich verantwortliche Person für diese Regel. |
| `created_by` / `updated_by` | UUID (FK `users`) | Audit-Felder. |
| `created_at` / `updated_at` | timestamptz | Standard-Zeitstempel. |
| `deleted_at` | timestamptz (nullable) | Soft-Delete; `NULL` = aktiv. |

**Lauf-Historie:** Jeder einzelne Lauf (welches Objekt, Ergebnis, erzeugte Folgeobjekte) wird nicht in `automations` selbst, sondern als fachlicher Eintrag in `activity_logs` (am betroffenen Objekt) und als sicherheitsrelevanter Eintrag in `audits` festgehalten. So bleibt `automations` schlank (Konfiguration + Zustand), während die vollständige Nachvollziehbarkeit aus dem ohnehin vorhandenen Audit-/Aktivitäts-Modell stammt.

**Konfigurierbarkeit:** Die in 9.5 beschriebenen Regeln werden als `is_system = true`-Standard-Automationen ausgeliefert, sind aber über `status` (aktiv/pausiert) und über `conditions`/`actions` parametrierbar (z. B. Anpassung der Tage-Schwellen). Nur Rollen mit dem entsprechenden Recht dürfen sie ändern (siehe 9.4).

---

## 9.4 Sicherheits- und Rechtegrenzen

Automationen handeln im Namen des Systems, dürfen dabei aber **niemals** die Sicherheitsarchitektur unterlaufen. Es gelten folgende verbindliche Grenzen:

1. **RLS bleibt aktiv.** Automationen lesen und schreiben über dieselbe Datenzugriffsschicht wie Menschen. Sie operieren stets innerhalb eines `org_id`-Kontextes; eine Automation kann keine Daten ausserhalb ihrer Organisation berühren.
2. **Wirkungsbereich = Konfiguration, nicht Allmacht.** Eine Automation darf nur die in ihrer `target_table` und `actions` deklarierten Objekttypen anfassen. Es gibt keine generische "tu irgendetwas"-Automation.
3. **Verwaltung ist privilegiert.** Anlegen, Ändern, Aktivieren/Pausieren und Löschen von Automationen ist auf `super_admin` (technische Verwaltung) sowie steuernd auf `ceo` beschränkt. Fachrollen wie `sales`, `project_manager`, `creative`, `developer`, `finance` und `viewer` sehen Automationen lesend (sofern freigegeben), dürfen sie aber nicht verändern. `viewer` hat reinen Lesezugriff.
4. **Kein automatischer Aussenversand ohne Freigabe.** Im Einklang mit dem Schweizer Wettbewerbsrecht (UWG) und revDSG werden **Akquise-/Werbe-Mails niemals automatisch nach aussen versendet.** Outreach-Automationen erzeugen ausschliesslich **Entwürfe** (`outreach_emails.status = draft`) plus eine Aufgabe/Benachrichtigung; der tatsächliche 1:1-Versand bleibt eine bewusste menschliche Handlung. Transaktionale Bestandskunden-Kommunikation (z. B. Reporting-Call-Erinnerung an eine bestehende Ansprechperson) ist hiervon zu unterscheiden und kann – wo rechtlich zulässig und kundenseitig erwartet – automatisiert werden, ist aber konservativ als Entwurf/Aufgabe vorzubereiten.
5. **Vollständige Auditierung.** Jede automatisch ausgelöste schreibende Aktion erzeugt einen `audits`-Eintrag mit Akteur "System / Automation #<id>". So ist eine Automation nie eine Blackbox.
6. **Fehler isolieren.** Schlägt eine Aktion fehl, wird die Automation auf `status = error` gesetzt, `last_error` befüllt und eine Benachrichtigung an `super_admin`/`owner_id` erzeugt. Andere Automationen laufen unbeeinflusst weiter; ein Einzelfehler legt nie die Engine lahm.
7. **Sparsamkeit & Idempotenz.** Automationen sind so ausgelegt, dass sie pro Objekt und Schwelle höchstens einmal auslösen (siehe 9.2.2) und keine Benachrichtigungsfluten erzeugen.

---

## 9.5 Katalog der wichtigsten Automationen

Jede Automation wird einheitlich beschrieben mit **Typ** (Event/Cron), **Trigger**, **Bedingung(en)**, **Aktion(en)** und **beteiligten Tabellen**. Alle genannten Status-Werte entsprechen den kanonischen Enums.

### 9.5.1 Lead-Follow-up-Sequenzen

Mehrstufige Erinnerungssequenz, damit kein kontaktierter Lead "kalt" wird.

- **Typ:** Cron-Tick (Tagesschwellen).
- **Trigger:** Täglicher Tick prüft kontaktierte, aber unbeantwortete Leads.
- **Bedingungen:** `leads.status = contacted`; seit letztem Kontakt (`activity_logs`/`outreach_emails.sent_at`) sind 3 / 7 / 14 Tage vergangen; `leads.deleted_at IS NULL`; Lead nicht in `won`/`lost`.
- **Aktionen:** Pro erreichter Stufe eine **Aufgabe** für `leads.owner_id` erzeugen ("Follow-up Lead X – Stufe 2"); optional über die **Outreach Engine** einen Follow-up-**Entwurf** in `outreach_emails` (`status = draft`) ablegen; In-App-Benachrichtigung an Owner.
- **Beteiligte Tabellen:** `leads`, `tasks`, `outreach_emails`, `notifications`, `activity_logs`, `audits`.

### 9.5.2 Angebot-Follow-ups

Stellt sicher, dass versendete Angebote nachgefasst werden, bevor sie verfallen.

- **Typ:** Cron-Tick.
- **Trigger:** Täglicher Tick über offene Angebote.
- **Bedingungen:** `offers.status = sent`; `sent_at` älter als 3 bzw. 7 Tage; noch keine Reaktion (`status` weiterhin `sent`, nicht `accepted`/`rejected`/`expired`).
- **Aktionen:** Aufgabe "Angebot nachfassen" für `offers.owner_id`; Benachrichtigung; bei Erreichen des Gültigkeitsdatums automatischer Wechsel auf `offers.status = expired` (mit Audit/Activity-Eintrag).
- **Beteiligte Tabellen:** `offers`, `tasks`, `notifications`, `activity_logs`, `audits`.

### 9.5.3 Vertragsablauf-Erinnerungen

Frühwarnung vor auslaufenden Verträgen zur Sicherung von Verlängerungen (Retention/MRR).

- **Typ:** Cron-Tick.
- **Trigger:** Täglicher Tick über aktive Verträge.
- **Bedingungen:** `contracts.status = active`; `end_date` erreicht heute + 60 / + 30 / + 7 Tage (jede Schwelle einmalig); zugehöriger `clients.status = active`.
- **Aktionen:** Aufgabe "Vertragsverlängerung vorbereiten" für `contracts.owner_id` (bzw. zuständigen CSO/PM); Benachrichtigung an Owner und CEO bei der 30-Tage-Schwelle; optional Upsell-Prüfung anstossen (siehe 9.5.9).
- **Beteiligte Tabellen:** `contracts`, `clients`, `tasks`, `notifications`, `activity_logs`, `audits`.

### 9.5.4 Monatliche Reporting-Call-Tasks

Erzeugt automatisch die operative Vorbereitung wiederkehrender Kunden-Reporting-Calls.

- **Typ:** Cron-Tick (monatlich, plus Stundentick für die 3-Tage-Vorlauf-Aufgabe).
- **Trigger:** Monatslauf am Monatsanfang sowie Vorlauf-Prüfung je geplantem Call.
- **Bedingungen:** Existiert ein wiederkehrender `reporting_calls`-Eintrag für einen `clients.status = active`; nächster Termin im laufenden Monat; noch keine Vorbereitungsaufgabe erzeugt.
- **Aktionen:** Reporting-Call-Termin in `reporting_calls`/`meetings` anlegen oder bestätigen; 3 Tage vorher Vorbereitungs-Aufgabe für den zuständigen `owner_id` ("Reporting-Deck für Kunde X vorbereiten"); optional Meeting Assistant zur Vorbereitung anstossen; Benachrichtigung.
- **Beteiligte Tabellen:** `reporting_calls`, `meetings`, `clients`, `tasks`, `notifications`, `activity_logs`, `audits`.

### 9.5.5 Kunden-Onboarding

Standardisierter Onboarding-Prozess, sobald aus einem Lead ein Kunde wird.

- **Typ:** Event-basiert.
- **Trigger:** Ereignis `lead.status_changed` → `won`, bzw. Anlage eines neuen `clients`-Datensatzes.
- **Bedingungen:** `leads.status` wechselt auf `won` und ein `clients`-Datensatz wird erzeugt/verknüpft; `clients.status = active`.
- **Aktionen:** Onboarding-`project` mit `project_status = planned` anlegen; standardisierte `tasks`/`subtasks`-Checkliste erzeugen (Zugänge einholen, Kickoff-Termin, Vertrag aktivieren, Kanäle verbinden); Projektmitglieder über `project_members` zuordnen; Begrüssungs-/Onboarding-Kommunikation als **Entwurf** vorbereiten; Benachrichtigung an PM und CSO.
- **Beteiligte Tabellen:** `leads`, `clients`, `contracts`, `projects`, `project_members`, `tasks`, `subtasks`, `notifications`, `activity_logs`, `audits`.

### 9.5.6 Kunden-Offboarding

Geordneter Abschluss bei Kündigung/Churn, damit nichts liegen bleibt und Compliance gewahrt ist.

- **Typ:** Event-basiert.
- **Trigger:** Ereignis `client.status_changed` → `churned` (oder `contracts.status` → `cancelled`/`expired` ohne Verlängerung).
- **Bedingungen:** `clients.status = churned` bzw. zugehöriger Vertrag beendet; offene Projekte/Aufgaben vorhanden.
- **Aktionen:** Offboarding-Checkliste als `tasks` (Zugänge entziehen, Daten exportieren/übergeben, Schlussrechnung erstellen, Assets archivieren in `files`); laufende `projects` auf `on_hold`/`completed`/`cancelled` setzen; Schlussrechnung als `invoices`-Entwurf (`status = draft`) für Finance anlegen; offene `automations` für diesen Kunden pausieren; Benachrichtigung an PM, Finance und CEO.
- **Beteiligte Tabellen:** `clients`, `contracts`, `projects`, `tasks`, `invoices`, `files`, `notifications`, `activity_logs`, `audits`.

### 9.5.7 Review-Anfrage

Bittet zufriedene Kunden zum richtigen Zeitpunkt um eine Bewertung/Referenz.

- **Typ:** Event-basiert (mit Cron-Verzögerung).
- **Trigger:** Ereignis "Projekt erfolgreich abgeschlossen" (`projects.status` → `completed`) oder positiver Meilenstein; Cron prüft die Karenzzeit.
- **Bedingungen:** `projects.status = completed`; `clients.status = active`; in den letzten X Monaten noch keine Review-Anfrage an diesen Kunden; Karenzzeit (z. B. 7 Tage nach Abschluss) verstrichen.
- **Aktionen:** Aufgabe "Review-Anfrage senden an Kunde X" für den zuständigen `owner_id`; personalisierter Anfrage-**Entwurf** (1:1) vorbereitet; Benachrichtigung. Kein automatischer Aussenversand.
- **Beteiligte Tabellen:** `projects`, `clients`, `contacts`, `tasks`, `outreach_emails`/`comments`, `notifications`, `activity_logs`, `audits`.

### 9.5.8 Referral-Anfrage

Nutzt zufriedene Bestandskunden systematisch für Empfehlungen (gesteuert durch die Referral Engine).

- **Typ:** Event-/Cron-basiert.
- **Trigger:** Die **Referral Engine** erzeugt eine `opportunities` vom Typ Referral; alternativ Cron nach erfolgreichem Reporting-Call/Meilenstein.
- **Bedingungen:** `clients.status = active` mit positiven Signalen (abgeschlossene Projekte, gute Reporting-Calls); `opportunities.status = open`; keine offene Referral-Anfrage in jüngerer Zeit.
- **Aktionen:** Aufgabe "Empfehlung erfragen" für `owner_id`/CSO; Referral-Anfrage als **Entwurf**; `opportunities.status` von `open` → `in_review` bei Bearbeitung; Benachrichtigung.
- **Beteiligte Tabellen:** `clients`, `contacts`, `opportunities`, `tasks`, `notifications`, `activity_logs`, `audits`.

### 9.5.9 Upsell-Hinweise

Macht Wachstumschancen bei Bestandskunden sichtbar und handlungsfähig.

- **Typ:** Event-basiert (Engine-getrieben).
- **Trigger:** Die **Upsell Engine** schreibt eine neue `opportunities` (Upsell/Cross-Sell); Ereignis `opportunity.created`.
- **Bedingungen:** `opportunities.status = open` und Typ Upsell/Cross-Sell; `clients.status = active`; geschätzter Wert über definierter Schwelle.
- **Aktionen:** Eintrag im Bereich **Clients → Upsell & Empfehlungen** (`/clients/growth`); Aufgabe für CSO/zuständigen Account-Owner; bei hoher Priorität (`priority = high`/`urgent`) zusätzliche Benachrichtigung an CEO/CSO; optional Proposal Generator anstossen.
- **Beteiligte Tabellen:** `opportunities`, `clients`, `contracts`, `offers`, `tasks`, `notifications`, `activity_logs`, `audits`.

### 9.5.10 Creator-Matching

Schlägt für anstehende Drehs/Content passende Creator aus dem Pool vor.

- **Typ:** Event-basiert.
- **Trigger:** Anlage/Änderung eines `shoots`-Eintrags (`shoot_status = planned`) oder eines `content_items` mit Bedarf an Talent.
- **Bedingungen:** `shoots.status = planned` ohne zugeordnete Creator; passende `creators` vorhanden (Skills/Verfügbarkeit/Region), die **Recruiting Opportunity Engine** liefert Kandidaten; `creators.is_active = true`.
- **Aktionen:** Vorschlagsliste passender Creator am Shoot/Content hinterlegen; Aufgabe "Creator für Dreh X bestätigen" für `creative`/PM; Benachrichtigung; nach Bestätigung Zuordnung dokumentieren.
- **Beteiligte Tabellen:** `shoots`, `content_items`, `creators`, `projects`, `tasks`, `notifications`, `activity_logs`, `audits`.

### 9.5.11 Content-Deadlines

Hält Content-Produktion termintreu und warnt vor Verzug.

- **Typ:** Cron-Tick.
- **Trigger:** Stündlicher/täglicher Tick über Content-Items mit Fälligkeit.
- **Bedingungen:** `content_items.status` in (`idea`, `scripting`, `production`, `review`); `due_date` ist in 2 Tagen / heute / überfällig; zugehöriges `projects.status = active`.
- **Aktionen:** Erinnerungs-Aufgabe/Benachrichtigung an `assigned_to`; bei Überfälligkeit Eskalation an PM; optional Markierung des Items als gefährdet; bei `review`-Status fällige Freigabe-Aufgabe.
- **Beteiligte Tabellen:** `content_items`, `tasks`, `projects`, `notifications`, `activity_logs`, `audits`.

### 9.5.12 Meeting → Aufgaben-Generierung

Wandelt Besprechungsergebnisse automatisch in nachverfolgbare Arbeit um.

- **Typ:** Event-basiert.
- **Trigger:** Ereignis `meeting.completed` (`meetings` als abgeschlossen markiert), inkl. Output des **Meeting Assistant** (Zusammenfassung/Action-Items).
- **Bedingungen:** `meetings.status`/Abschluss erreicht; Meeting Assistant hat Folgepunkte erkannt oder Action-Items wurden erfasst.
- **Aktionen:** Pro Action-Item eine `tasks` mit `assigned_to`, `due_date`, `priority` erzeugen und mit dem Meeting sowie ggf. `client_id`/`project_id` verknüpfen; Zusammenfassung als `comments`/`activity_logs` am Objekt ablegen; Benachrichtigung an die zugewiesenen Personen.
- **Beteiligte Tabellen:** `meetings`, `tasks`, `clients`, `projects`, `comments`, `notifications`, `activity_logs`, `audits`.

---

## 9.6 Übersicht aller Automationen

| # | Automation | Typ | Auslöser (Kurz) | Wichtigste Zieltabellen |
| --- | --- | --- | --- | --- |
| 1 | Lead-Follow-up-Sequenzen | Cron | Lead kontaktiert, X Tage ohne Reaktion | `leads`, `tasks`, `outreach_emails` |
| 2 | Angebot-Follow-ups | Cron | Angebot versendet, X Tage ohne Reaktion | `offers`, `tasks` |
| 3 | Vertragsablauf-Erinnerungen | Cron | Vertrag läuft in 60/30/7 Tagen ab | `contracts`, `tasks` |
| 4 | Monatliche Reporting-Call-Tasks | Cron | Monatslauf / Vorlauf je Call | `reporting_calls`, `meetings`, `tasks` |
| 5 | Kunden-Onboarding | Event | Lead → `won` / neuer Kunde | `clients`, `projects`, `tasks` |
| 6 | Kunden-Offboarding | Event | Kunde → `churned` / Vertrag beendet | `clients`, `projects`, `invoices`, `tasks` |
| 7 | Review-Anfrage | Event+Cron | Projekt abgeschlossen + Karenzzeit | `projects`, `tasks`, `outreach_emails` |
| 8 | Referral-Anfrage | Event/Cron | Referral Engine / positiver Meilenstein | `opportunities`, `tasks` |
| 9 | Upsell-Hinweise | Event | Upsell Engine erzeugt Opportunity | `opportunities`, `tasks` |
| 10 | Creator-Matching | Event | Shoot/Content braucht Talent | `shoots`, `creators`, `tasks` |
| 11 | Content-Deadlines | Cron | Content fällig/überfällig | `content_items`, `tasks` |
| 12 | Meeting → Aufgaben | Event | Meeting abgeschlossen + Action-Items | `meetings`, `tasks` |

Alle zwölf Automationen erzeugen zusätzlich Einträge in `notifications`, `activity_logs` und `audits` und respektieren die Sicherheitsgrenzen aus 9.4.

---

# 10 Integrationen

## 10.1 Zweck und Philosophie

Integrationen verbinden eCreator OS mit den externen Systemen, in denen Daten entstehen oder Kommunikation stattfindet – Werbeplattformen, E-Mail, Kalender, KI-Dienste und Dateispeicher. Sie machen das Leitprinzip **"Alles verbunden"** über die Plattformgrenze hinaus wirksam, ohne dass jemand Daten doppelt pflegen muss.

**Grundsatz: vorbereitet, nicht zwingend sofort implementiert.** Das Datenmodell sieht die Integrationsschicht von Beginn an vollständig vor – über die Hilfstabellen `integrations` (verbundene Drittsysteme inkl. Zugangsdaten/Status) und `webhooks` (ein-/ausgehende Endpunkte) sowie das Modul **Settings → Integrationen** (`/settings/integrations`). Die tatsächliche technische Anbindung der einzelnen Dienste erfolgt jedoch **bewusst gestaffelt nach Priorität und in einer späteren Umsetzungsphase** (Phase 10 – Automationen, mit Vorbereitung in Phase 9 – AI Engines). In der Grundausbaustufe funktioniert eCreator OS vollständig **In-App**; jede Integration ist ein additiver Verstärker, kein Fundament. Diese Staffelung hält die ersten Phasen schlank, reduziert Abhängigkeiten von Drittsystem-Freigaben (OAuth-Reviews, API-Zugänge) und erlaubt einen kontrollierten, auditierbaren Roll-out.

**Sicherheits- und Compliance-Leitplanken für alle Integrationen:**

- Zugangsdaten/Token werden ausschliesslich serverseitig in `integrations` (bzw. Supabase-Secrets) gespeichert, nie im Client.
- Jede Verbindung, jeder Token-Refresh und jede Datenabholung erzeugt einen `audits`-Eintrag.
- Es gilt das Prinzip der **minimalen Scopes**: nur die wirklich benötigten Berechtigungen werden angefragt.
- DSG/revDSG- und UWG-Konformität bleiben gewahrt; insbesondere wird **keine Werbe-/Akquise-Mail automatisch versendet** (siehe Abschnitt 9.4) – E-Mail-Integrationen dienen primär transaktionaler Bestandskunden-Kommunikation und dem Vorbereiten von 1:1-Entwürfen.

---

## 10.2 Übersichtstabelle

Priorität: **hoch** = für den operativen Kernnutzen früh wertvoll; **mittel** = deutlicher Mehrwert, aber nach dem Kern; **niedrig** = optional/spezialisiert. Die Phasenangabe bezieht sich auf die kanonischen Umsetzungsphasen (Referenz Abschnitt 7).

| # | Integration | Zweck (Kurz) | Benötigte Daten / Scopes (Kurz) | Risiko | Priorität | Spätere Implementierungsphase |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Google Workspace | Identität/SSO & Org-Verzeichnis | OAuth (OpenID, Profil, E-Mail, ggf. Directory read) | Mittel | Hoch | Phase 1 (Auth) vorbereitet, Ausbau Phase 10 |
| 2 | Google Calendar | Termine/Reporting-Calls synchronisieren | Calendar read/write (Events) | Mittel | Hoch | Phase 5/10 |
| 3 | Gmail | Outreach-/Kunden-Mails senden & zuordnen | Gmail send + read (Metadaten/Thread) | Hoch | Mittel | Phase 10 |
| 4 | Meta Ads | Kampagnen-Performance je Kunde | Marketing-API (ads_read) | Mittel | Hoch | Phase 6/9 |
| 5 | Google Ads | Kampagnen-Performance je Kunde | Google Ads API (read) + Developer Token | Mittel | Hoch | Phase 6/9 |
| 6 | TikTok Ads | Kampagnen-Performance je Kunde | TikTok Marketing API (read) | Mittel | Mittel | Phase 6/9 |
| 7 | LinkedIn Ads | Kampagnen-Performance (B2B) | LinkedIn Marketing API (read) | Mittel | Niedrig | Phase 9/10 |
| 8 | Resend / SendGrid | Transaktionale System-Mails | API-Key, verifizierte Sender-Domain | Mittel | Hoch | Phase 4/10 |
| 9 | WhatsApp (optional) | Schnelle Kundenkommunikation | WhatsApp Business API, Vorlagen-Freigabe | Hoch | Niedrig | Phase 10+ |
| 10 | Calendly | Termin-Buchung durch Leads/Kunden | OAuth + eingehende Webhooks | Niedrig | Mittel | Phase 4/5 |
| 11 | OpenAI / Claude API | Antrieb der 12 AI-Engines | API-Key, serverseitig | Hoch | Hoch | Phase 9 |
| 12 | Supabase Storage | Datei-Ablage (`files`) | Teil des Stacks (Bucket-Policies, RLS) | Niedrig | Hoch | Phase 2 |

---

## 10.3 Erläuterungen je Integration

### 10.3.1 Google Workspace
- **Zweck:** Zentrale Identitäts- und Anmeldebasis für das Team (Single Sign-On über Supabase Auth), optional Abgleich von Benutzern/Organisation aus dem Workspace-Verzeichnis.
- **Benötigte Daten/Scopes:** OAuth mit OpenID/Profil/E-Mail; optional Directory-Read für Benutzerabgleich. Keine schreibenden Verzeichnisrechte.
- **Risiko:** Mittel – SSO ist sicherheitskritisch (Kontoübernahme bei Fehlkonfiguration), aber etablierter Standard; Scopes minimal halten.
- **Priorität:** Hoch – komfortable, sichere Anmeldung für ein Schweizer Team, das ohnehin Google Workspace nutzt.
- **Phase:** Auth-Grundlage in Phase 1 vorbereitet; Verzeichnis-Komfort in Phase 10.

### 10.3.2 Google Calendar
- **Zweck:** Zwei-Wege-Sicht auf `meetings` und `reporting_calls`; vermeidet Doppelpflege von Terminen.
- **Benötigte Daten/Scopes:** Kalender-Lese-/Schreibrecht auf Events der verbundenen Nutzer.
- **Risiko:** Mittel – Schreibzugriff auf persönliche Kalender; klare Trennung geschäftlicher vs. privater Kalender nötig.
- **Priorität:** Hoch – direkter operativer Nutzen ("Was steht heute an?") und Rückgrat der Reporting-Call-Automation (9.5.4).
- **Phase:** Phase 5 (Termine/Reporting-Calls), tiefe Sync in Phase 10.

### 10.3.3 Gmail
- **Zweck:** Versand und Zuordnung von Kunden-/Outreach-Mails im Kontext des jeweiligen Leads/Kunden, sodass Korrespondenz an `leads`/`clients`/`contacts` hängt.
- **Benötigte Daten/Scopes:** Gmail-Send sowie eingeschränktes Read (Thread-Metadaten zur Zuordnung). Möglichst feingranulare Scopes.
- **Risiko:** Hoch – Zugriff auf persönliche Postfächer ist hochsensibel (DSG); Google verlangt Security-Review für restriktive Scopes. **Kein automatischer Massen-/Werbeversand** (UWG) – nur 1:1.
- **Priorität:** Mittel – wertvoll, aber sensibel; Resend/SendGrid deckt transaktionale Mails risikoärmer ab.
- **Phase:** Phase 10.

### 10.3.4 Meta Ads
- **Zweck:** Import der Kampagnen-Performance in `ad_campaigns` je Kunde; Datenbasis für die Ads Opportunity Engine.
- **Benötigte Daten/Scopes:** Marketing-API lesend (`ads_read`), Zugriff auf das jeweilige Werbekonto des Kunden.
- **Risiko:** Mittel – Kundenwerbekonten-Zugriff; Token-Ablauf und App-Review der Meta-Plattform beachten.
- **Priorität:** Hoch – Ads sind Kern-Lieferleistung; verbindet Production und Reporting-Calls.
- **Phase:** Phase 6 (Production), Engine-Anbindung Phase 9.

### 10.3.5 Google Ads
- **Zweck:** Import der Such-/Display-Kampagnen-Performance in `ad_campaigns`; speist Ads Opportunity Engine und Kundenreports.
- **Benötigte Daten/Scopes:** Google Ads API lesend, Developer Token, OAuth zum Kunden-Account (idealerweise via Manager-Konto/MCC).
- **Risiko:** Mittel – Developer-Token-Freigabe und Kunden-Account-Verknüpfung sind administrativ aufwendig.
- **Priorität:** Hoch – zentrale Performance-Quelle neben Meta.
- **Phase:** Phase 6/9.

### 10.3.6 TikTok Ads
- **Zweck:** Import der TikTok-Kampagnen-Performance in `ad_campaigns`.
- **Benötigte Daten/Scopes:** TikTok Marketing API lesend, Zugriff auf das Werbekonto des Kunden.
- **Risiko:** Mittel – jüngeres API-Ökosystem; Verfügbarkeit/Stabilität je Markt variabel.
- **Priorität:** Mittel – relevant je nach Kundenportfolio.
- **Phase:** Phase 6/9.

### 10.3.7 LinkedIn Ads
- **Zweck:** Import der B2B-Kampagnen-Performance in `ad_campaigns`.
- **Benötigte Daten/Scopes:** LinkedIn Marketing API lesend, Werbekonto-Zugriff.
- **Risiko:** Mittel – restriktiver Partner-/API-Zugang, längerer Freigabeprozess.
- **Priorität:** Niedrig – nur bei vorhandenem B2B-Ads-Bedarf.
- **Phase:** Phase 9/10.

### 10.3.8 Resend / SendGrid
- **Zweck:** Zuverlässiger Versand transaktionaler System-Mails (Benachrichtigungen, Einladungen, Reporting-Erinnerungen an Bestandskunden) aus `notifications`/Automationen.
- **Benötigte Daten/Scopes:** API-Key sowie verifizierte Absender-Domain (SPF/DKIM/DMARC).
- **Risiko:** Mittel – Zustellbarkeit und Domain-Reputation; klare Trennung transaktional vs. werblich (UWG).
- **Priorität:** Hoch – ohne verlässlichen Mailversand verpuffen viele Benachrichtigungen.
- **Phase:** Versand-Grundlage Phase 4, vollständige Automationsanbindung Phase 10.

### 10.3.9 WhatsApp (optional)
- **Zweck:** Optionaler, schneller Kommunikationskanal zu Kunden für kurze Updates/Erinnerungen.
- **Benötigte Daten/Scopes:** WhatsApp Business API, vorab freigegebene Nachrichten-Vorlagen, Opt-in der Empfänger.
- **Risiko:** Hoch – strenge Template-/Opt-in-Regeln, Datenschutz, leicht als unerwünschte Werbung einzustufen (UWG); konsequentes Opt-in nötig.
- **Priorität:** Niedrig – ausdrücklich optional.
- **Phase:** Phase 10+.

### 10.3.10 Calendly
- **Zweck:** Selbstbuchung von Terminen durch Leads/Kunden; eingehende Buchungen erzeugen `meetings` und ggf. Aufgaben.
- **Benötigte Daten/Scopes:** OAuth zur Calendly-Organisation plus eingehende `webhooks` für neue/abgesagte Buchungen.
- **Risiko:** Niedrig – klar umrissene, eingehende Eventdaten; geringe Datensensibilität.
- **Priorität:** Mittel – reduziert Terminkoordinations-Reibung im Sales-Prozess.
- **Phase:** Phase 4 (Sales/Termine) bzw. 5.

### 10.3.11 OpenAI / Claude API
- **Zweck:** Technischer Antrieb der zwölf AI-Engines (Lead-, Outreach-, Proposal-, Content-, Meeting-Assistant-, Upsell-, Referral-Engine u. a.); erzeugt Aufgaben, Chancen und Entwürfe.
- **Benötigte Daten/Scopes:** Server-seitiger API-Key; an die Modelle übergebene Inhalte werden datensparsam und DSG-konform aufbereitet.
- **Risiko:** Hoch – Übermittlung potenziell personenbezogener Inhalte an einen Drittdienst; erfordert Datenminimierung, Zweckbindung und ggf. Auftragsverarbeitungsvereinbarung; Outputs sind Vorschläge, kein automatischer Aussenversand.
- **Priorität:** Hoch – Kern des Leitprinzips "AI als operativer Co-Pilot".
- **Phase:** Phase 9 (AI Engines).

### 10.3.12 Supabase Storage
- **Zweck:** Speicher für alle Dateien (`files`/`attachments`) – Briefings, Assets, Belege, Reporting-Decks.
- **Benötigte Daten/Scopes:** Teil des fixen Stacks; Bucket-Policies und RLS analog zum übrigen Datenmodell (`org_id`-/rollenbasiert).
- **Risiko:** Niedrig – innerhalb der eigenen Supabase-Umgebung, gleiche Sicherheitsdomäne wie die Datenbank; korrekte Bucket-Policies vorausgesetzt.
- **Priorität:** Hoch – Datei-Ablage ist Grundbestandteil des Modells.
- **Phase:** Phase 2 (Core Database Model).

---

## 10.4 Technische Verankerung und Roll-out-Logik

- **Konfigurationsheimat:** Alle Verbindungen werden in `integrations` (Status, Zugangsdaten-Referenz, verbundenes Konto) und – wo ereignisbasiert – in `webhooks` geführt; verwaltet ausschliesslich über **Settings → Integrationen** (`/settings/integrations`).
- **Rechte:** Anlegen/Verbinden/Trennen von Integrationen ist `super_admin` vorbehalten (steuernd `ceo`); Fachrollen nutzen die resultierenden Daten, verwalten aber keine Zugänge.
- **Auditierung:** Jede Verbindung, jeder Token-Refresh, jeder Datenabruf erzeugt `audits`-Einträge; fachliche Datenflüsse spiegeln sich in `activity_logs` am jeweiligen Objekt.
- **Gestaffelter Roll-out:** Implementiert wird entlang der Prioritätsspalte (zuerst Hoch: Storage, Auth/Workspace, Calendar, Ads-Lesequellen, Resend/SendGrid, OpenAI/Claude), dann Mittel (Gmail, TikTok, Calendly), zuletzt Niedrig/optional (LinkedIn, WhatsApp). So bleibt die Plattform jederzeit lauffähig, und jede Integration ist ein additiver, abschaltbarer Verstärker – nie eine Voraussetzung für den Kernbetrieb.
