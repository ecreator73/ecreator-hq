# 10 QA- & Konsistenzpruefung des eCreator-OS-Blueprints

> Lektorat und QA-Architektur-Review aller Blueprint-Abschnitte gegen die 14 Anforderungen aus Prompt 0 (kanonische Referenz `00-kanonische-referenz.md`). Pruefdatum: 2026-06-23. Geprueft wurden die Dateien 00, 01, 03, 04, 05, 06, 07, 09. Die in der Pruefvorgabe genannten Dateien **02-rollen-rechte.md** und **08-technische-architektur.md** existieren im Repository nicht.

---

## 1 Gesamtverdikt

**NICHT VOLLSTAENDIG (bedingt freigabefaehig).**

Das Blueprint ist inhaltlich von hoher Qualitaet, durchgaengig auf Deutsch verfasst, frei von SQL-DDL/Code und in den vorhandenen Abschnitten sehr konsistent mit der kanonischen Referenz. **Zwei der 14 Anforderungen sind jedoch nicht abgedeckt**, weil die zugehoerigen Dokumente fehlen:

- **Rollen & Berechtigungsmatrix** (Anforderung 4) - es existiert keine eigenstaendige Rollen-/Rechte-Datei und **keine 9x Ressourcen-Berechtigungsmatrix**. Die Rollen sind nur verstreut (kanonische Liste in 00, Tabellen `roles`/`permissions` in 03, RLS-Hinweise pro Tabelle) beschrieben.
- **Technische Architektur** (Anforderung 12) - es gibt **kein** Dokument zu Ordnerstruktur, Naming der Code-Artefakte, Error-Handling, Logging, Security-Konzept und Backups. Die technische Architektur ist nur in Fragmenten (Stack-Erwaehnungen in 01, Konventionen in 00, Engineering-Regeln in 09) vorhanden.

Zusaetzlich bestehen **mehrere klar benannte Namens-/Konsistenz-Inkonsistenzen** (vor allem rund um das Feld `opportunity_category` vs. `opportunity_type` und eine ungueltige `lead_source`), die vor der Umsetzung korrigiert werden sollten. Keine dieser Inkonsistenzen ist konzeptionell tragend, alle sind durch Begriffsangleichung loesbar.

---

## 2 Checkliste der 14 Anforderungen aus Prompt 0

| # | Anforderung | Status | Fundort / Bemerkung |
| --- | --- | --- | --- |
| 1 | Vision in einem Satz + Leitprinzipien | ERFUELLT | 00 §1, 01 §1 - identische Vision, 5 Leitprinzipien konsistent. |
| 2 | 7 Navigationsbereiche + alle Unterseiten | ERFUELLT | 00 §2, 01 §2 - Home/Sales/Clients/Production/Operations/Finance/Settings inkl. aller Routen, deckungsgleich. |
| 3 | UX-Kernregel "Was muss heute gemacht werden?" | ERFUELLT | 00 Leitprinzip 2, 01 §3 (Command-Center-Widget, Auspraegung je Bereich). |
| 4 | 9 Rollen + Berechtigungsmatrix | **TEILWEISE / LUECKE** | 9 Rollen vorhanden (00 §3, 03 §5.2). **Keine** eigenstaendige Rollen-/Rechte-Datei, **keine** Rolle-x-Ressource-Aktion-Matrix. Datei `02-rollen-rechte.md` fehlt. |
| 5 | Datenmodell: 27 Kern-Tabellen (Zweck/Felder/Beziehungen/Status/Indizes/Sicherheit) | ERFUELLT | 03 (14 Tabellen) + 04 (13 Tabellen + 8 Hilfstabellen). Alle 27 vollstaendig mit allen 6 Pflichtaspekten. |
| 6 | Hilfstabellen klar markiert | ERFUELLT | 00 §4, 04 §5.5 - 8 Hilfstabellen (notifications, tags, taggables, comments, project_members, attachments, integrations, webhooks). |
| 7 | Namens- & Status-Konventionen | ERFUELLT | 00 §8 - vollstaendig (snake_case/Plural, UUID, FK, Rappen, `_at`/`_date`, Soft-Delete, org_id, Status-Enums). |
| 8 | 12 AI Engines (Input/Output/Tabellen/Automationslogik/Sicherheitsgrenzen) | ERFUELLT | 06 §8.1-8.12 - alle 12 Engines mit allen 5 Aspekten + gemeinsames Fundament §8.13. |
| 9 | Kernmodule (alle 7 mit Tabellen-Zuordnung, L/S) | ERFUELLT | 05 §7.1-7.7 + Verknuepfungs-Matrix §7.8. |
| 10 | Verknuepfungs-Ketten (4 Ketten) | ERFUELLT | 05 §6.1-6.4 (Ketten A-D) + Querschnitts-Kette Finanzen §6.5. |
| 11 | Automationen + Integrationen | ERFUELLT | 07 §9 (12 Automationen, Trigger/Bedingung/Aktion) + §10 (12 Integrationen mit Scopes/Risiko/Phase). |
| 12 | Technische Architektur (Ordnerstruktur/Naming/Error/Logging/Security/Backups) | **LUECKE** | **Kein** dediziertes Dokument. Datei `08-technische-architektur.md` fehlt. Nur Fragmente in 00/01/09. |
| 13 | 10 Phasen (Ziel/Scope/nicht-enthalten/Erfolgskriterien/Abhaengigkeiten) | ERFUELLT | 09 §12 Phase 1-10 - alle 5 Pflichtfelder je Phase + Roadmap-Tabelle §12.1. |
| 14 | Entwicklungsregeln | ERFUELLT | 09 §13.1-13.3 (21 verbindliche Regeln + Definition of Done). |

**Ergebnis: 12 von 14 Anforderungen erfuellt; 1 teilweise (4), 1 fehlend (12).**

---

## 3 Gefundene Luecken (fehlende Inhalte)

### 3.1 KRITISCH - Fehlendes Dokument: Rollen & Berechtigungsmatrix (Anforderung 4)
- Die in der Pruefvorgabe erwartete Datei `02-rollen-rechte.md` existiert nicht.
- Die 9 Rollen sind als Liste (00 §3) und als Tabelle `roles` (03 §5.2) definiert, aber es fehlt die **explizite Berechtigungsmatrix** (welche der 9 Rollen darf je Ressource/Modul create/read/update/delete/manage/approve/export). Die RLS-Regeln sind heute pro Tabelle in Prosa verstreut (03/04) und nirgends in einer geschlossenen Matrix zusammengefuehrt.
- **Fix:** Eigenes Dokument `02-rollen-rechte.md` anlegen mit (a) 1-Satz-Zweck je Rolle, (b) vollstaendiger Matrix Rolle x Kern-Ressource x Aktion (`permission_action`-Werte aus 03 §5.3: create/read/update/delete/manage/export/approve), (c) Sonderregeln (`viewer` nur Lesen, harte Loeschung nur `super_admin`, `finance`-Sichtbarkeit fuer Geldfelder, `approve`-Recht fuer Angebote/Rechnungen).

### 3.2 KRITISCH - Fehlendes Dokument: Technische Architektur (Anforderung 12)
- Die in der Pruefvorgabe erwartete Datei `08-technische-architektur.md` existiert nicht.
- Es fehlen: **Ordnerstruktur** (Monorepo/App-Router-Verzeichnisse), **Naming der Code-Artefakte** (Komponenten, Server Actions, API-Routen ueber das in 00 §8 Genannte hinaus), **Error-Handling-Strategie**, **Logging-Konzept** (technisches Logging neben `audits`/`activity_logs`), **Security-Konzept als Gesamtbild** (Secrets-Management, Verschluesselung at rest, Auth-Flow), **Backup-/Restore-Strategie**.
- Heute existieren nur Bausteine: Stack-Nennung (01 §1.4: Next.js App Router, Supabase/PostgreSQL), API-/Action-Naming (00 §8), Engineering-Regeln (09 §13.2), Security pro Tabelle (RLS in 03/04). Ein zusammenfuehrender Architektur-Abschnitt fehlt.
- **Fix:** Dokument `08-technische-architektur.md` anlegen mit Ordnerstruktur, Naming-Konventionen fuer Code, Error-Handling, Logging, Security-Gesamtbild und Backup-Strategie.

### 3.3 GERING - Section-Nummerierung divergiert zwischen Dateien
- Die fortlaufenden Abschnittsnummern in den Dateien stimmen nicht mit der Dateinummer ueberein und lassen Luecken: 03+04 beide als "# 5", 05 als "# 6/# 7", 06 als "# 8", 07 als "# 9/# 10", 09 als "# 12/# 13". Die fehlenden Dateien 02 und 08 entsprechen genau den "ausgelassenen" Abschnittsnummern (Rollen waeren Abschnitt nach Vision; Architektur waere "# 11"). Das bestaetigt, dass zwei geplante Abschnitte nie geschrieben wurden.
- **Fix:** Nach Ergaenzung der fehlenden Dokumente die Abschnittsnummern luckenlos und konsistent zur Dateifolge fuehren.

---

## 4 Gefundene Inkonsistenzen (Widersprueche zwischen Abschnitten)

### 4.1 MITTEL - Feldname `opportunity_category` vs. `opportunity_type`
- **Kanonisch/Datenmodell (04 §5.4.2):** Das Feld der `opportunities`-Kategorie heisst `category` mit Enum **`opportunity_category`** (Werte: `website_audit`, `ads`, `content`, `recruiting`, `crm_automation`, `upsell`, `referral`, `manual`).
- **AI-Engines (06):** Durchgaengig (9 Vorkommen) wird stattdessen ein Feld **`opportunity_type`** verwendet (z. B. §8.0.2, §8.2, §8.3 ...).
- **Widerspruch:** Zwei verschiedene Feldnamen fuer dasselbe Konzept. Verstoesst gegen 00 §8 (kanonische Namen verbindlich).
- **Fix:** In 06 durchgehend `opportunity_category` (Feld `category`) verwenden; `opportunity_type` ersetzen.

### 4.2 MITTEL - Ungueltiger `lead_source`-Wert `website_audit`
- **Datenmodell (03 §5.4):** `lead_source` ist abschliessend definiert als `engine`, `referral`, `inbound`, `outbound`, `event`, `manual`.
- **Modulverknuepfungen (05 §6.4, Kette D, Schritt 1):** Setzt `leads.source = website_audit` - ein Wert, der **nicht** im Enum `lead_source` existiert (er gehoert zu `opportunity_category`).
- **Widerspruch:** Ein Lead erhaelt einen nicht erlaubten `source`-Wert; vermischt Lead-Quelle mit Opportunity-Kategorie.
- **Fix:** In 05 Kette D den Lead-`source` auf einen gueltigen `lead_source`-Wert setzen (z. B. `engine`); die Audit-Herkunft gehoert an die `opportunity`, nicht an den `lead.source`.

### 4.3 MITTEL - Engine-Ausgabe `opportunity_type = lead_qualification`
- **AI-Engines (06 §8.1 Lead Engine, Output):** erzeugt eine Opportunity mit `opportunity_type = lead_qualification`.
- **Datenmodell (04 §5.4.2):** `lead_qualification` ist **kein** Wert des Enums `opportunity_category`.
- **Widerspruch:** Engine schreibt einen nicht definierten Kategoriewert.
- **Fix:** Entweder `lead_qualification` als zusaetzlichen kanonischen Enum-Wert in 00/04 aufnehmen oder die Lead Engine auf einen bestehenden Wert mappen (bzw. an dieser Stelle gar keine Opportunity erzeugen).

### 4.4 GERING - `website_status`/`crm_build_status`-Enums nicht in der kanonischen Status-Liste
- **Datenmodell (04 §5.1.3 / §5.1.5):** Fuehrt Enums `website_status` (`discovery`, `design`, `development`, `review`, `live`, `maintenance`, `archived`) und `crm_build_status` (`discovery`, `design`, `build`, `testing`, `live`, `maintenance`, `archived`) ein.
- **Kanonische Referenz (00 §8 Status-Enums):** Diese beiden Enums sind dort **nicht** gelistet (00 enthaelt nur `campaign_status` fuer Production-Lieferungen, aber keine Web-/CRM-Build-Status).
- **Widerspruch:** 00 §8 erhebt den Anspruch, alle kanonischen Status-Werte zu enthalten ("keine ad hoc erfundenen Werte", 09 Regel 15); 04 fuehrt aber zwei neue Status-Enums ein, ohne dass sie in 00 verankert sind.
- **Fix:** `website_status` und `crm_build_status` in die kanonische Status-Tabelle in 00 §8 nachtragen (oder dort als "in Teil 2 definiert" referenzieren).

### 4.5 GERING - Weitere in 03/04 eingefuehrte, in 00 nicht gelistete Enums
- 03/04 fuehren mehrere fachlich sinnvolle, aber in 00 §8 nicht aufgefuehrte Enums ein: `user_status`, `permission_action`, `lead_source`, `client_health`, `offer_source`, `meeting_type`, `meeting_status`, `report_cadence`, `reporting_call_status`, `content_format`, `content_channel`, `content_source`, `task_source`, `creator_type`, `creator_status`, `ad_platform`, `billing_interval`, `expense_status`, `expense_category`, `integration_status`, `webhook_direction`, `automation_trigger`.
- **Bewertung:** Inhaltlich konsistent und nicht widerspruechlich, aber 00 §8 ist dadurch **nicht** mehr die vollstaendige Single Source of Truth fuer Status-/Enum-Werte.
- **Fix:** 00 §8 entweder um diese Enums ergaenzen oder explizit als "Kern-Enums; weitere fachliche Enums werden im Datenmodell Teil 1/2 definiert" kennzeichnen.

### 4.6 GERING - `audit_id`-Feld in `websites` mit unklarer Referenz
- **Datenmodell (04 §5.1.3):** Die `websites`-Feldtabelle listet zunaechst `audit_id` (FK `audits`-Domaene? - mit eigenem Fragezeichen im Text), korrigiert dies im Folgehinweis aber auf `opportunity_id` (FK `opportunities`).
- **Bewertung:** Das `audit_id`-Feld ist ein Redaktions-Artefakt; die korrekte Referenz ist `opportunity_id`. Stehen beide nebeneinander, ist das missverstaendlich.
- **Fix:** Die `audit_id`-Zeile in 04 §5.1.3 entfernen; nur `opportunity_id` belassen.

### 4.7 GERING - Cron-Tick-Aussage vs. Phase-10-Abgrenzung
- **Automationen (07 §9):** Beschreibt Cron-Tick-Logik und automatisch ausgeloeste Aktionen als Bestandteil des Betriebs.
- **Datenmodell-Notiz (04) / Phasen (09 Phase 9 "NICHT enthalten"):** Cron/zeitgesteuerte Ausloesung ist explizit erst Phase 10.
- **Bewertung:** Kein echter Widerspruch (07 beschreibt den Zielzustand), aber 07 sollte den Phasenbezug klarer machen, damit nicht der Eindruck entsteht, Automationen seien vor Phase 10 aktiv.
- **Fix:** In 07 einen Verweis ergaenzen, dass die beschriebene Automation-Engine gemaess 09 in Phase 10 implementiert wird (Modell ab Phase 2 vorbereitet).

---

## 5 Positiv-Befunde (was sauber ist)

- **27 Kern-Tabellen vollstaendig** behandelt (14 in 03, 13 in 04), jeweils mit Zweck, Feldern, Beziehungen, Status/Enums, Indizes und RLS-Sicherheitsregeln - exakt die geforderten 6 Aspekte.
- **12 AI Engines vollstaendig** (06), jede mit Zweck, Input, Output, verbundenen Tabellen, Automationslogik und Sicherheitsgrenzen; rechtssensible Outreach-Engine korrekt mit UWG/revDSG-Schranken.
- **7 Module + 4 Ketten + Finanz-Querschnitt** (05) konsistent; Modul-Verknuepfungs-Matrix bestaetigt "keine Insel".
- **10 Phasen** (09) mit Ziel/Scope/Nicht-enthalten/Erfolgskriterien/Abhaengigkeiten luckenlos, plus 21 verbindliche Entwicklungsregeln und Definition of Done.
- **Sprache durchgehend Deutsch**; Enum-Werte korrekt englisch/snake_case mit dokumentierter UI-Uebersetzung. **Kein SQL-DDL/Code** eingeschlichen - die Feldtabellen sind rein beschreibend.
- **Compliance (UWG/revDSG)** konsistent ueber 06, 07 und 09 verankert (kein automatischer Massenversand, nur 1:1-Entwuerfe, Audit-Pflicht).

---

## 6 Empfehlungen (priorisiert)

1. **(kritisch)** `02-rollen-rechte.md` erstellen: 9 Rollen + vollstaendige Berechtigungsmatrix (Rolle x Ressource x Aktion) + Sonderregeln.
2. **(kritisch)** `08-technische-architektur.md` erstellen: Ordnerstruktur, Code-Naming, Error-Handling, Logging, Security-Gesamtbild, Backup-/Restore-Strategie.
3. **(mittel)** `opportunity_type` in 06 durchgaengig auf `opportunity_category` (Feld `category`) angleichen.
4. **(mittel)** Ungueltigen `lead.source = website_audit` in 05 Kette D auf gueltigen `lead_source`-Wert korrigieren.
5. **(mittel)** `lead_qualification` als Opportunity-Kategorie entweder kanonisch aufnehmen oder in 06 §8.1 entfernen.
6. **(gering)** 00 §8 um `website_status`, `crm_build_status` und die uebrigen fachlichen Enums ergaenzen oder die Status-Liste als nicht-abschliessend kennzeichnen.
7. **(gering)** Redaktions-Artefakt `audit_id` in `websites` (04 §5.1.3) entfernen.
8. **(gering)** Section-Nummerierung nach Ergaenzung der fehlenden Dokumente luckenlos zur Dateifolge fuehren; Phasenbezug der Automationen in 07 klarstellen.

---

*Erstellt im Rahmen der QA-/Konsistenzpruefung des eCreator-OS-Blueprints. Grundlage: kanonische Referenz `00-kanonische-referenz.md` (Prompt 0).*
