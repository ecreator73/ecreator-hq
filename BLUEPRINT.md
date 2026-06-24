# eCreator OS - Master Blueprint (Prompt 0)

> **Vision:** eCreator OS ist das interne Betriebssystem der eCreator GmbH, das den gesamten Geschaeftsablauf - von Leadgewinnung ueber Verkauf, Kundenbetreuung und Produktion bis zu Finanzen - in einer einzigen, vollstaendig verbundenen Plattform buendelt und jeden Mitarbeitenden taeglich operativ fuehrt.

**Stand:** {{DATUM}} (Platzhalter) &nbsp;|&nbsp; **Status:** Planung, kein Code &nbsp;|&nbsp; **Dokument-Typ:** Master-Index ueber den gesamten Blueprint-Satz (Prompt 0)

---

## 1. Kurzfassung / Executive Summary

eCreator OS ist das zentrale, interne Betriebssystem der eCreator GmbH (Schweizer Digital-Growth-Agentur). Es ersetzt die heute verstreuten Insel-Tools durch **eine** Anwendung, in der jeder Geschaeftsprozess der Agentur abgebildet und miteinander verknuepft ist: Sales, Clients, Production, Operations, Finance und Settings - gefuehrt von einem operativen Home-Bereich.

Das Leitprinzip lautet **"Eine Plattform. Eine Datenbank. Ein Login. Alles verbunden."** Jedes Objekt - Lead, Kunde, Projekt, Aufgabe, Rechnung - existiert genau einmal und ist ueber Fremdschluessel mit seinem Kontext verbunden; es gibt keine doppelte Datenhaltung und keine isolierten Module.

Der **technische Stack** steht fest: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (PostgreSQL) mit Supabase Auth, Row Level Security, Server Actions, API Routes, Cron Jobs und Storage - durchgaengig rollenbasiert und mit lueckenlosen Audit Logs.

Der **operative Fokus** ist die DNA der Plattform: Jede Seite beantwortet die Frage **"Was muss heute gemacht werden?"** - sie ist handlungsorientiert, nicht nur Analytics. Die zentrale operative Einheit ist die Aufgabe (`tasks`); jedes Modul, das Arbeit ausloest, erzeugt Aufgaben im selben Task-System. **12 AI-Engines** wirken als operative Co-Piloten: Sie erzeugen Chancen, Aufgaben und Entwuerfe als menschlich zu pruefende Vorschlaege, niemals als unbeaufsichtigten Automatismus - DSG-/UWG-konform.

Dieser Blueprint ist **reine Planung (Prompt 0)**: kein Code, keine Migrations, keine fertigen Komponenten. Datenmodelle sind beschreibende Feld-Tabellen. Er ist die verbindliche Grundlage fuer alle Folge-Prompts.

---

## 2. Inhaltsverzeichnis (docs/blueprint/)

Alle Detailinhalte liegen in den folgenden Abschnittsdateien. Bei Konflikten gilt immer die **kanonische Referenz (00)**.

| # | Datei | Inhalt (1 Zeile) |
| --- | --- | --- |
| 00 | [00-kanonische-referenz.md](./docs/blueprint/00-kanonische-referenz.md) | Verbindliche Single Source of Truth: Vision, Navigation, 9 Rollen, 27 Kern-Tabellen, 12 Engines, Module, Phasen, Namens- & Status-Konventionen. |
| 01 | [01-vision-navigation-ux.md](./docs/blueprint/01-vision-navigation-ux.md) | Vision, Leitprinzipien, die 7 Navigationsbereiche mit allen Unterseiten und die UX-Kernregel "Was muss heute gemacht werden?". |
| 02 | [02-rollen-rechte.md](./docs/blueprint/02-rollen-rechte.md) | Die 9 Rollen samt vollstaendiger Berechtigungsmatrix (Rolle x Ressource x Aktion) und Sonderregeln (Soft-Delete, Geld-Sichtbarkeit, Approve). |
| 03 | [03-datenmodell-kern.md](./docs/blueprint/03-datenmodell-kern.md) | Datenmodell Teil 1: Kern-Tabellen (Identitaet, Sales, Kunden) mit Zweck, Feldern, Beziehungen, Status, Indizes, Sicherheit. |
| 04 | [04-datenmodell-erweitert.md](./docs/blueprint/04-datenmodell-erweitert.md) | Datenmodell Teil 2: restliche Kern-Tabellen (Production, Finance, Audit) plus die 8 markierten Hilfstabellen. |
| 05 | [05-modulverknuepfungen-coremodule.md](./docs/blueprint/05-modulverknuepfungen-coremodule.md) | Die 7 Kernmodule mit Tabellen-Zuordnung sowie die durchgaengigen Verknuepfungs-Ketten ("keine Insel"). |
| 06 | [06-ai-engines.md](./docs/blueprint/06-ai-engines.md) | Die 12 AI-Engines, je mit Input, Output, verbundenen Tabellen, Automationslogik und Sicherheitsgrenzen. |
| 07 | [07-automationen-integrationen.md](./docs/blueprint/07-automationen-integrationen.md) | Interne Automationen (Trigger/Bedingung/Aktion) und externe Integrationen inkl. Scopes, Risiko und Phasenbezug. |
| 08 | [08-technische-architektur.md](./docs/blueprint/08-technische-architektur.md) | Technische Architektur: Ordnerstruktur, Code-Naming, Error-Handling, Logging, Security-Gesamtbild, Backup-/Restore-Strategie. |
| 09 | [09-phasenplan-entwicklungsregeln.md](./docs/blueprint/09-phasenplan-entwicklungsregeln.md) | Die 10 Umsetzungsphasen (Ziel/Scope/nicht-enthalten/Erfolgskriterien/Abhaengigkeiten) plus 21 Entwicklungsregeln und Definition of Done. |
| 10 | [10-qa-konsistenzpruefung.md](./docs/blueprint/10-qa-konsistenzpruefung.md) | QA- & Konsistenzpruefung des gesamten Blueprints gegen die 14 Anforderungen aus Prompt 0. |

---

## 3. Hauptnavigation auf einen Blick

Sieben Bereiche. Beschriftung Deutsch, technischer Pfad englisch/kebab-case.

| Bereich | Pfad | Zweck (1 Zeile) | Wichtigste Kern-Tabellen |
| --- | --- | --- | --- |
| Home | `/` | Persoenlicher operativer Einstieg: "Was muss ich heute tun?" | `tasks`, `notifications`, `activity_logs` |
| Sales | `/sales` | Akquise und Verkauf von Lead bis Abschluss | `leads`, `opportunities`, `offers`, `outreach_emails`, `meetings` |
| Clients | `/clients` | Betreuung, Vertraege und Wachstum von Bestandskunden | `clients`, `contacts`, `contracts`, `reporting_calls` |
| Production | `/production` | Lieferung aller Leistungen (Content, Web, Ads, CRM, Drehs) | `projects`, `tasks`, `content_items`, `websites`, `ad_campaigns`, `crm_builds`, `shoots` |
| Operations | `/operations` | Interne Steuerung: Creator-Pool, Auslastung, Automationen, AI-Engines, Dateien | `creators`, `automations`, `files`, `integrations` |
| Finance | `/finance` | Rechnungen, Ausgaben, wiederkehrende Umsaetze und Berichte | `invoices`, `expenses`, `contracts` |
| Settings | `/settings` | Organisation, Benutzer, Rollen/Rechte, Integrationen, Audit | `users`, `roles`, `permissions`, `integrations`, `audits` |

Detaillierte Unterseiten je Bereich: siehe [00 §2](./docs/blueprint/00-kanonische-referenz.md) und [01](./docs/blueprint/01-vision-navigation-ux.md).

---

## 4. UX-Kernregel: "Was muss heute gemacht werden?"

eCreator OS ist **operativ, nicht nur analytisch**. Jede Seite ist handlungsorientiert: Der naechste Schritt ist immer sichtbar, und keine Anzeige bleibt bei einer reinen Kennzahl stehen, ohne einen ableitbaren Handlungsschritt anzubieten.

- **Home** ist das Command-Center jedes Mitarbeitenden: heute faellige und offene Aufgaben, Zuweisungen, Benachrichtigungen - sofort sichtbar.
- **Jeder Fachbereich** (Sales, Clients, Production, Operations, Finance) zeigt seine eigene Auspraegung der Frage: faellige Nachfass-Leads, anstehende Reporting-Calls, blockierte Produktionsaufgaben, ueberfaellige Rechnungen.
- **Die zentrale operative Einheit ist die Aufgabe** (`tasks`/`subtasks`). Jedes Modul, das Arbeit ausloest, erzeugt Aufgaben im selben Task-System - keine modul-eigenen To-do-Mechanismen.
- **AI-Engines fuettern den Arbeitsfluss:** Sie erzeugen Aufgaben und Chancen, die als naechster Schritt erscheinen, statt nur Berichte zu liefern.

> Reine Analytics-Anzeigen ohne handlungsleitenden naechsten Schritt werden nicht gebaut. Ein "Screen, der nur huebsch aussieht" gilt als unfertig.

---

## 5. Phasen-Roadmap auf einen Blick

Leitgedanke: **Datenmodell vor UI, operative Kern-Einheit (Tasks) vor Modulen.** Die Spalte "Baut auf" ist verbindlich - keine Phase darf vor ihren Voraussetzungen begonnen werden. Details: [09 §12](./docs/blueprint/09-phasenplan-entwicklungsregeln.md).

| Phase | Name | Ziel (Kern) | Baut auf |
| --- | --- | --- | --- |
| 1 | Foundation / Auth / Rollen / Layout | Abgesichertes App-Geruest: Login, Rollen, RLS-Muster, App-Shell mit 7-Bereiche-Navigation | - |
| 2 | Core Database Model | Vollstaendiges, konsistentes Datenmodell (27 Kern-Tabellen + Hilfstabellen, RLS, Audit-Basis) als Single Source of Truth | 1 |
| 3 | Task System | Zentrale operative Einheit: `tasks`/`subtasks` + "Mein Tag"; ab hier "Was muss heute gemacht werden?" | 2 |
| 4 | Sales CRM | Akquise von Lead bis Abschluss: Pipeline, Leads, Opportunities, Angebote, Outreach, Termine | 2, 3 |
| 5 | Client Management | Bestandskunden als zentrale Entitaeten: Kontakte, Vertraege, Reporting-Calls (gewonnene Leads -> Kunde) | 2, 3, 4 |
| 6 | Production Module | Leistungserbringung: Projekte als Container fuer Content, Websites, Ads, CRM-Builds | 2, 3, 5 |
| 7 | Creator Pool | Talent-Dimension: Creator-Pool und statusgefuehrte Drehplanung | 2, 3, 6 |
| 8 | Finance | Finanzschicht: Rechnungen, Ausgaben, MRR/ARR und Berichte aus Vertraegen/Kunden | 2, 5, 6 |
| 9 | AI Engines | 12 Engines als Co-Piloten: erzeugen Chancen/Aufgaben/Entwuerfe als pruefbare Vorschlaege | 2-8 |
| 10 | Automationen | Selbstlaufender, ueberwachter Betrieb: Automationsregeln, Cron Jobs, Webhooks, Benachrichtigungen | 1-9 |

**Achse:** erst Sicherheit & Identitaet (1) -> Datenmodell (2) -> Aufgabe (3) -> Fachmodule entlang der Wertschoepfungskette (4 Sales -> 5 Clients -> 6 Production -> 7 Creator -> 8 Finance) -> intelligente Schicht (9) -> Orchestrierung (10).

---

## 6. Verbindliche Entwicklungsregeln (Kurzfassung)

Vollstaendig in [09 §13](./docs/blueprint/09-phasenplan-entwicklungsregeln.md) (21 Regeln + Definition of Done). Kurzfassung:

**Produkt & Architektur**

1. Keine Mockdaten ohne echte CRUD-Funktion gegen die Datenbank.
2. Keine isolierten Module - jedes Objekt verweist auf seinen Kontext (Kunde/Projekt/Aufgabe/Owner).
3. Keine doppelte Datenhaltung - verknuepfen statt kopieren.
4. Keine Features ohne operativen Nutzen ("naechster Schritt" immer sichtbar).
5. Keine UI vor klarem Datenmodell (erst Tabellen/Beziehungen/Enums/RLS/Audit).
6. Tasks bleiben die zentrale operative Einheit - keine parallelen To-do-Mechanismen.
7. Projekte sind Container; Kunden sind zentrale Entitaeten.
8. Alles auf Deutsch (UI); Enums bleiben englisch/snake_case, nur in der Praesentation uebersetzt.
9. Mobile ist Abnahmekriterium jeder Phase.
10. Rechte/RLS immer auf Datenbankebene, by default aktiv.

**Engineering**

11. Jede fachliche Tabelle hat RLS aktiviert (Org + Rolle).
12. Jede mutierende Aktion schreibt `audits`; jede Statusaenderung zusaetzlich `activity_logs` - keine stillen Schreibvorgaenge.
13. Server Actions / API Routes validieren jeden Input serverseitig.
14. Namens- & Status-Konventionen sind bindend; nur kanonische Enum-Werte.
15. Soft-Delete (`deleted_at`) statt harter Loeschung; harte Loeschung nur `super_admin`.
16. Geld immer als Ganzzahl in Rappen mit `currency` (Default `CHF`).
17. `org_id` auf jeder fachlichen Tabelle (zukunftssichere Multi-Tenancy).
18. AI-Ausgaben sind Vorschlaege mit menschlichem Entscheid; kein automatischer Massenversand (DSG-/UWG-konform).
19. Datenherkunft jedes Engine-/Automations-Objekts ist nachvollziehbar.
20. Wiederverwenden statt duplizieren (zentrale Muster: RLS-Vorlage, Audit-Helfer, Status-Badges, polymorphe Anhaenge/Kommentare/Tags).

**Definition of Done (pro Feature):** Datenmodell steht; RLS gegen min. 2 Rollen geprueft; echte CRUD; validierte Server Actions mit Audit/Activity; Systemverknuepfung vorhanden; operativer Nutzen sichtbar; deutsche Oberflaeche; mobil bedienbar.

---

## 7. Qualitaetsstatus

Die QA- & Konsistenzpruefung ([10](./docs/blueprint/10-qa-konsistenzpruefung.md), Pruefdatum 2026-06-23) attestiert dem Blueprint **hohe inhaltliche Qualitaet**: durchgaengig Deutsch, frei von SQL-DDL/Code, mit rein beschreibenden Feld-Tabellen und sehr konsistent zur kanonischen Referenz. Alle 27 Kern-Tabellen, 12 AI-Engines, 7 Module mit Verknuepfungs-Ketten, 10 Phasen und die Entwicklungsregeln sind vollstaendig ausgearbeitet; Compliance (UWG/revDSG) ist konsistent verankert.

Der Bericht bewertete zum Pruefzeitpunkt zwei Anforderungen als offen, weil die Dateien `02-rollen-rechte.md` und `08-technische-architektur.md` damals fehlten - **beide Dokumente liegen inzwischen vor** und schliessen die Berechtigungsmatrix bzw. die technische Architektur. Es verbleiben einige **geringfuegige Begriffs-Inkonsistenzen** (v. a. `opportunity_category` vs. `opportunity_type`, ein ungueltiger `lead_source`-Wert sowie nicht in 00 §8 gelistete Zusatz-Enums); diese sind nicht konzeptionell tragend und vor der Umsetzung durch reine Begriffsangleichung zu beheben.

---

## 8. So nutzt du dieses Blueprint

Dieses Master-Dokument ist die **Landkarte** ueber den gesamten Planungssatz (Prompt 0). Es fasst zusammen und navigiert - die Detailtiefe liegt in den verlinkten Dateien. Die kanonische Referenz ([00](./docs/blueprint/00-kanonische-referenz.md)) ist bei jedem Konflikt massgeblich.

**Grundlage fuer die Folge-Prompts.** Jeder Folge-Prompt (1-10) setzt die jeweilige Umsetzungsphase aus [09](./docs/blueprint/09-phasenplan-entwicklungsregeln.md) um und stuetzt sich auf die zugehoerigen Planungsdokumente:

| Folge-Prompt / Phase | Primaer genutzte Blueprint-Dateien |
| --- | --- |
| Prompt 1 - Foundation / Auth / Rollen / Layout | 00 (Konventionen), 01 (Navigation/UX), 02 (Rollen & Rechte), 08 (Architektur) |
| Prompt 2 - Core Database Model | 00 (Tabellen-/Status-Liste), 03 + 04 (vollstaendiges Datenmodell), 02 (RLS-Grundlage) |
| Prompt 3 - Task System | 00, 03/04 (`tasks`/`subtasks`/`comments`/`notifications`), 05 (Home-Modul), 01 (UX "Mein Tag") |
| Prompt 4 - Sales CRM | 00, 03 (Sales-Tabellen), 05 (Sales-Modul & Ketten), 02 (Rollen Sales/CSO) |
| Prompt 5 - Client Management | 00, 03/04 (Kunden/Vertraege), 05 (Client-Modul & Lead-Uebernahme) |
| Prompt 6 - Production Module | 00, 04 (Production-Tabellen), 05 (Production-Modul & Container-Logik) |
| Prompt 7 - Creator Pool | 00, 04 (`creators`/`shoots`), 05 (Verknuepfung Production) |
| Prompt 8 - Finance | 00, 04 (`invoices`/`expenses`), 05 (Finanz-Querschnittskette), 02 (Geld-Sichtbarkeit) |
| Prompt 9 - AI Engines | 06 (12 Engines), 00/03/04 (Zieltabellen), 09 Regel 19 (Vorschlag-Prinzip) |
| Prompt 10 - Automationen | 07 (Automationen & Integrationen), 08 (Cron/Webhooks-Architektur), 06 (Engine-Ausloesung) |

**Arbeitsweise:** Vor jedem Folge-Prompt zuerst [00](./docs/blueprint/00-kanonische-referenz.md) konsultieren, dann die phasen-spezifischen Dateien. Namen (Tabellen, Rollen, Module, Engines, Phasen, Status-Werte, Routen) sind **exakt** aus 00 zu uebernehmen, damit der gesamte Satz konsistent bleibt.
