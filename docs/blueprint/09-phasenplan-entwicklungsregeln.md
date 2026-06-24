# 12 Umsetzung in Phasen

> Dieser Abschnitt beschreibt die verbindliche Reihenfolge, in der eCreator OS aufgebaut wird. Leitgedanke: **Datenmodell vor UI, operative Kern-Einheit vor Modulen.** Die zentrale operative Einheit der gesamten Plattform ist die Aufgabe (`tasks`); deshalb steht das Task-System ganz vorne, noch vor allen fachlichen Modulen. Jede Phase baut strikt auf der vorherigen auf: Es wird nichts gebaut, dessen Fundament (Auth, Datenmodell, Rechte, Tasks) nicht bereits steht.

## 12.0 Grundsaetze des Phasenplans

1. **Eine Plattform. Eine Datenbank. Ein Login. Alles verbunden.** Jede Phase erweitert dieselbe Supabase-Datenbank und denselben App-Shell; es entstehen keine getrennten Sub-Apps.
2. **Datenmodell vor UI.** Eine fachliche Oberflaeche wird erst gebaut, wenn die zugehoerigen Tabellen, Beziehungen, Status-Enums, RLS-Policies und Audit-Hooks existieren.
3. **Tasks zuerst, dann Module.** Sales, Clients, Production usw. haengen alle Aufgaben an Objekte. Darum ist das Task-System (Phase 3) Voraussetzung fuer jedes fachliche Modul ab Phase 4.
4. **Sicher by default.** Schon ab Phase 1 gilt: jede Tabelle mit Row Level Security, jede schreibende Aktion mit Audit-Eintrag. Sicherheit wird nicht nachgeruestet.
5. **Operativ in jeder Phase.** Jede Phase liefert einen sichtbaren operativen Nutzen ("Was muss heute gemacht werden?"), nicht nur ein technisches Zwischenergebnis.
6. **Keine Mockdaten als Endzustand.** Eine Phase gilt erst als fertig, wenn echte CRUD-Funktion gegen die echte Datenbank vorhanden ist; Demo-Inhalte sind nur Seed-Daten, nie ein Ersatz fuer Funktion.

---

## Phase 1 - Foundation / Auth / Rollen / Layout

**Ziel**
Ein lauffaehiges, abgesichertes Anwendungsgeruest schaffen: Jeder Mitarbeitende kann sich anmelden, erhaelt seine Rolle und bewegt sich in der finalen Hauptnavigation. Dies ist das Fundament, auf dem alles Weitere steht.

**Scope (enthalten)**
- Next.js (App Router) + TypeScript + Tailwind CSS Projekt-Setup, Supabase-Anbindung (DB, Auth, Storage).
- Supabase Auth: Login, Logout, Session-Handling, Passwort-Reset; Anlage der Tabelle `users` mit Stammdaten.
- Rollenmodell als Daten: Tabellen `roles` (die 9 kanonischen Rollen) und `permissions` (granulare Rechte), Zuordnung Rolle -> Rechte.
- RLS-Grundgeruest: `org_id`-Spalte und Basis-Policy-Muster (Org + Rolle) als wiederverwendbare Vorlage; Aktivierung von Row Level Security auf allen bereits existierenden Tabellen.
- App-Shell: globales Layout, die sieben Hauptbereiche der Navigation (Home, Sales, Clients, Production, Operations, Finance, Settings), rollenabhaengiges Ein-/Ausblenden von Bereichen.
- Settings-Grundfunktionen: Organisation, Benutzer, Rollen & Rechte, Mein Profil (mindestens lesend + Benutzerverwaltung).
- Audit-Grundgeruest: Tabelle `audits` angelegt, zentraler Schreib-Helfer fuer schreibende Aktionen vorbereitet.

**NICHT enthalten**
- Keine fachlichen Module (Sales, Clients, Production, Finance) ausser als leere, berechtigte Navigationsrahmen.
- Keine Tasks, keine Projekte, keine AI-Engines, keine Automationen.
- Kein vollstaendiges Datenmodell der Domaenen B-F (folgt in Phase 2).

**Erfolgskriterien**
- Ein Benutzer mit zugewiesener Rolle kann sich anmelden und sieht nur die fuer seine Rolle freigegebenen Navigationsbereiche.
- Ein nicht berechtigter Zugriff (falsche Rolle / falsche `org_id`) wird durch RLS auf Datenbankebene verhindert, nicht nur im UI.
- Anlegen/Bearbeiten eines Benutzers erzeugt einen Eintrag in `audits`.
- Die App ist auf Mobile bedienbar (Navigation, Login, Profil).

**Abhaengigkeiten / naechste Schritte**
- Abhaengigkeit: keine (Startphase).
- Naechster Schritt: Phase 2 vervollstaendigt das Datenmodell, das hier nur fuer Identitaet & Zugriff begonnen wurde.

---

## Phase 2 - Core Database Model

**Ziel**
Das vollstaendige, konsistente Datenmodell als Single Source of Truth etablieren - alle 27 Kern-Tabellen plus Hilfstabellen, mit Beziehungen, Namens- und Status-Konventionen, RLS und Audit-Basis. Erst wenn dieses Fundament steht, beginnt der UI-Aufbau der Module.

**Scope (enthalten)**
- Anlage aller 27 Kern-Tabellen der Domaenen A-G gemaess kanonischer Liste.
- Anlage aller Hilfstabellen: `notifications`, `tags`, `taggables`, `comments`, `project_members`, `attachments`, `integrations`, `webhooks`.
- Beziehungen/Fremdschluessel (`client_id`, `project_id`, `lead_id` usw.), polymorphe Muster (`<name>_type` + `<name>_id`).
- Verbindliche Konventionen: `id` (UUID), `created_at`/`updated_at`, Soft-Delete `deleted_at`, Owner-/Zuweisungsfelder (`owner_id`, `assigned_to`, `created_by`, `updated_by`), `org_id` auf jeder fachlichen Tabelle.
- Alle Status-Enums in englisch/snake_case (`lead_status`, `task_status`, `invoice_status`, ...).
- RLS-Policy fuer jede Tabelle (Org + Rolle); `audits` und `activity_logs` an das zentrale Schreibmuster angebunden.
- Seed-/Referenzdaten nur fuer Stammdaten (Rollen, Tags), keine fiktiven Geschaeftsdaten.

**NICHT enthalten**
- Keine fachlichen Oberflaechen/Workflows (diese folgen modulweise ab Phase 3).
- Keine AI-Engine-Logik, keine Automations-Laeufe, keine Cron Jobs.
- Keine Geschaeftslogik ueber Validierung und Integritaet hinaus.

**Erfolgskriterien**
- Jede der 27 Kern-Tabellen plus Hilfstabellen existiert, hat RLS aktiviert und folgt exakt den Namens- und Status-Konventionen.
- Beziehungen sind referenziell integer; ein Objekt laesst sich ueber Fremdschluessel eindeutig verknuepfen (keine doppelte Datenhaltung).
- Eine schreibende Testaktion erzeugt korrekte Eintraege in `audits` (alt/neu) und `activity_logs`.
- Soft-Delete funktioniert: Standardabfragen filtern `deleted_at IS NULL`.

**Abhaengigkeiten / naechste Schritte**
- Abhaengigkeit: Phase 1 (Auth, Rollen, RLS-Muster, `org_id`).
- Naechster Schritt: Phase 3 setzt auf `tasks`/`subtasks` auf und macht das Modell erstmals operativ erlebbar.

---

## Phase 3 - Task System

**Ziel**
Die zentrale operative Einheit der Plattform lebendig machen: ein vollwertiges Aufgaben-System mit Subtasks und der persoenlichen "Mein Tag"-Ansicht. Ab hier beantwortet eCreator OS taeglich die Kernfrage "Was muss heute gemacht werden?".

**Scope (enthalten)**
- Volle CRUD-Funktion fuer `tasks` und `subtasks` inkl. `task_status` (`todo`, `in_progress`, `review`, `done`, `blocked`) und `priority` (`low`, `medium`, `high`, `urgent`).
- Zuweisung (`assigned_to`), Verantwortung (`owner_id`), Faelligkeit (`due_date`), Verknuepfung mit `projects` (Container-Bezug vorbereitet).
- Home-Modul: "Mein Tag" (`/`), "Meine Aufgaben" (`/my-tasks`), Benachrichtigungen (`/notifications`), Aktivitaetsverlauf (`/activity`).
- Kommentare (`comments`) und Anhaenge (`attachments`) an Aufgaben; Statuswechsel schreiben `activity_logs`, mutierende Aktionen schreiben `audits`.
- In-App-Benachrichtigungen (`notifications`) bei Zuweisung/Faelligkeit.

**NICHT enthalten**
- Noch keine fachlichen Aufgaben-Quellen aus Sales/Production/AI (Aufgaben werden vorerst manuell erstellt).
- Keine automatische Aufgabengenerierung durch Engines oder Automationen (Phasen 9-10).
- Kein vollstaendiges Projekt-Modul (nur der Task-Container-Bezug, nicht die Production-Oberflaeche).

**Erfolgskriterien**
- Ein Mitarbeitender sieht auf "Mein Tag" sofort seine heute faelligen und offenen Aufgaben.
- Aufgaben und Subtasks lassen sich anlegen, zuweisen, priorisieren, im Status aendern und abschliessen - alles gegen die echte Datenbank.
- Jeder Statuswechsel erscheint im Aktivitaetsverlauf; jede Zuweisung erzeugt eine Benachrichtigung.
- Mobile: Aufgaben sind unterwegs vollstaendig bedienbar.

**Abhaengigkeiten / naechste Schritte**
- Abhaengigkeit: Phase 2 (`tasks`, `subtasks`, `comments`, `notifications`, `activity_logs`).
- Naechster Schritt: Ab Phase 4 haengen alle fachlichen Module ihre Aufgaben an dieses System an.

---

## Phase 4 - Sales CRM

**Ziel**
Den Akquise- und Verkaufsprozess von Lead bis Abschluss vollstaendig operativ abbilden: Pipeline, Leads, Opportunities, Angebote, Outreach und Termine - jeweils mit anhaengenden Aufgaben.

**Scope (enthalten)**
- CRUD und Workflow fuer `leads` (`lead_status`), `opportunities` (`opportunity_status`, `priority`), `offers` (`offer_status`), `outreach_emails` (`outreach_status`), `meetings`.
- Sales-Navigation: Pipeline, Leads, Opportunities, Angebote, Outreach, Termine.
- Kanban-/Pipeline-Ansicht entlang `lead_status`; Verknuepfung von Leads/Opportunities mit `contacts`.
- Aufgaben aus Sales-Objekten heraus erstellen (z. B. "Lead nachfassen") - Anbindung an das Task-System aus Phase 3.
- Outreach als manuelle 1:1-Mail-Entwuerfe (DSG-/UWG-konform), Tracking ueber `outreach_status`; jede Aktion schreibt `audits` und `activity_logs`.

**NICHT enthalten**
- Keine automatische Lead-Generierung durch die Lead Engine (Phase 9).
- Keine automatischen Outreach-Entwuerfe durch die Outreach Engine bzw. den Proposal Generator (Phase 9).
- Keine Umwandlung gewonnener Leads in vollwertige Kundenakten (Client Management folgt in Phase 5).

**Erfolgskriterien**
- Ein Lead durchlaeuft die Pipeline (`new` -> ... -> `won`/`lost`) mit nachvollziehbarem Verlauf.
- Aus einem Lead/einer Opportunity heraus entstehen echte Aufgaben, die auf "Mein Tag" erscheinen.
- Ein Angebot kann erstellt, versendet (`sent`) und als angenommen/abgelehnt markiert werden.
- Mobile: Pipeline und Lead-Detail sind bedienbar.

**Abhaengigkeiten / naechste Schritte**
- Abhaengigkeit: Phasen 2 (Sales-Tabellen) und 3 (Tasks).
- Naechster Schritt: Phase 5 nimmt gewonnene Leads (`won`) als Kunden auf.

---

## Phase 5 - Client Management

**Ziel**
Bestandskunden als zentrale Entitaeten der Plattform fuehren: aus gewonnenen Leads werden Kunden mit Kontakten, Vertraegen und wiederkehrenden Reporting-Calls. Der Kunde ist der Bezugspunkt fuer alle spaeteren Leistungen.

**Scope (enthalten)**
- CRUD fuer `clients` (`client_status`: `active`, `paused`, `churned`), `contacts`, `contracts` (`contract_status`), `reporting_calls`.
- Clients-Navigation: Kundenuebersicht, Kundenprofil (`/clients/[id]`), Kontakte, Vertraege, Reporting-Calls, Upsell & Empfehlungen (Rahmen).
- Uebernahme gewonnener Leads (`lead_status = won`) in eine Kundenakte ohne doppelte Datenhaltung (Verknuepfung, keine Kopie).
- Kundenprofil als 360-Grad-Sicht: Kontakte, Vertraege, Termine, anhaengende Aufgaben, Aktivitaetsverlauf.
- Reporting-Calls als wiederkehrende Termine mit Folgeaufgaben.

**NICHT enthalten**
- Noch keine Produktions-Lieferobjekte (Projekte, Content, Websites, Ads, CRM-Builds) am Kunden (Phase 6).
- Keine AI-gestuetzten Upsell-/Referral-Vorschlaege (Upsell Engine, Referral Engine - Phase 9).
- Keine Rechnungsstellung aus Vertraegen (Finance - Phase 8).

**Erfolgskriterien**
- Ein gewonnener Lead laesst sich verlustfrei in einen Kunden ueberfuehren; der Verlauf bleibt verknuepft.
- Das Kundenprofil zeigt alle verbundenen Objekte an einem Ort.
- Ein Reporting-Call erzeugt nachvollziehbar Folgeaufgaben.
- Mobile: Kundenprofil und Kontaktliste sind bedienbar.

**Abhaengigkeiten / naechste Schritte**
- Abhaengigkeit: Phasen 2, 3 und 4 (Lead-Uebernahme).
- Naechster Schritt: Phase 6 haengt die Lieferleistungen als Projekte an den Kunden.

---

## Phase 6 - Production Module

**Ziel**
Die Leistungserbringung end-to-end abbilden: Projekte als zentrale Lieferklammer pro Kunde, darunter Content, Websites, Ad-Kampagnen und CRM-Builds - alle Arbeit laeuft als Aufgaben durch das Task-System.

**Scope (enthalten)**
- CRUD fuer `projects` (`project_status`), `content_items` (`content_status`), `websites`, `ad_campaigns` (`campaign_status`), `crm_builds`.
- Production-Navigation: Projekte, Aufgaben-Board, Content, Websites, Ad-Kampagnen, CRM-Builds (Drehs folgen in Phase 7).
- Projekt als Container: `project_members` (Team-Zuordnung mit Projektrolle), gebuendelte Aufgaben, Dateien (`files`/`attachments`).
- Aufgaben-Board (`/production/board`) ueber `task_status` fuer alle Gewerke.
- Verknuepfung jedes Lieferobjekts mit genau einem Kunden und Projekt (keine isolierten Module).

**NICHT enthalten**
- Kein Creator-Pool und keine Drehplanung (Phase 7).
- Keine Finanzbewertung der Projekte/Leistungen (Phase 8).
- Keine AI-Engines (Website Audit, Ads/Content Opportunity, Content Script Generator - Phase 9).

**Erfolgskriterien**
- Ein Kunde hat mindestens ein Projekt mit zugeordnetem Team und Aufgaben.
- Content, Website, Ad-Kampagne und CRM-Build lassen sich anlegen, im Status fuehren und einem Projekt/Kunden zuordnen.
- Das Aufgaben-Board zeigt den gesamten Produktionsfortschritt; Erledigungen erscheinen im Aktivitaetsverlauf.
- Mobile: Board und Projektdetail sind bedienbar.

**Abhaengigkeiten / naechste Schritte**
- Abhaengigkeit: Phasen 2, 3 und 5 (Kunde als Bezugspunkt).
- Naechster Schritt: Phase 7 ergaenzt Creator-Pool und Drehs als Produktions-Ressource.

---

## Phase 7 - Creator Pool

**Ziel**
Die Produktion um die Talent-Dimension erweitern: einen verwalteten Creator-Pool und eine vollstaendige Drehplanung, sodass Drehs als planbare, statusgefuehrte Lieferobjekte mit Aufgaben laufen.

**Scope (enthalten)**
- CRUD fuer `creators` (interne/externe Talente) und `shoots` (`shoot_status`: `planned`, `confirmed`, `shot`, `delivered`, `cancelled`).
- Operations-Navigation: Creator-Pool (`/operations/creators`); Drehs in der Production (`/production/shoots`).
- Verknuepfung von `shoots` mit `creators`, `projects`/`clients` und `content_items`.
- Verfuegbarkeits-/Auslastungssicht fuer Creator; Dreh-Aufgaben (Vorbereitung, Durchfuehrung, Lieferung) ueber das Task-System.

**NICHT enthalten**
- Keine automatische Creator-Suche durch die Recruiting Opportunity Engine (Phase 9).
- Keine Finanzabwicklung von Creator-Honoraren (Phase 8).
- Keine Auslastungs-Automationen (Phase 10).

**Erfolgskriterien**
- Ein Dreh laesst sich planen, einem Creator und Projekt zuordnen und durch alle Status fuehren.
- Gelieferte Drehs verknuepfen sich mit den zugehoerigen Content-Items.
- Aus der Drehplanung entstehen Aufgaben, die auf "Mein Tag" erscheinen.
- Mobile: Creator-Profil und Drehplan sind bedienbar.

**Abhaengigkeiten / naechste Schritte**
- Abhaengigkeit: Phasen 2, 3 und 6 (Projekte/Content als Bezug).
- Naechster Schritt: Phase 8 macht alle erbrachten Leistungen finanziell bewertbar.

---

## Phase 8 - Finance

**Ziel**
Die finanzielle Schicht ueber alle vorhandenen Geschaeftsobjekte legen: Rechnungen, Ausgaben, wiederkehrende Umsaetze (MRR/ARR) und Berichte - direkt aus Vertraegen, Kunden und Projekten gespeist, ohne doppelte Datenhaltung.

**Scope (enthalten)**
- CRUD fuer `invoices` (`invoice_status`) und `expenses` (mit Kategorie und Beleg via `files`).
- Finance-Navigation: Finanzuebersicht, Rechnungen, Ausgaben, Vertragswerte (MRR/ARR), Berichte.
- Ableitung von Rechnungen aus `contracts`/`clients`; MRR/ARR aus aktiven Vertraegen (`contract_status = active`).
- Geldbetraege strikt als Ganzzahl in Rappen mit `currency` (Default `CHF`); finanzielle Sichten rollenbeschraenkt (Finance/CEO/Super Admin).
- Faelligkeits-/Mahnstatus (`overdue`) und zugehoerige Aufgaben.

**NICHT enthalten**
- Keine externe Buchhaltungs-/Banken-Integration als Automatik (Schnittstellen-Anbindung erst mit Integrationen/Automationen, Phase 10).
- Keine AI-gestuetzten Finanzprognosen.
- Keine automatische Rechnungserzeugung per Cron (Phase 10).

**Erfolgskriterien**
- Eine Rechnung entsteht aus einem Vertrag/Kunden, durchlaeuft `draft` -> `sent` -> `paid` und zeigt `overdue` korrekt an.
- MRR/ARR sind aus aktiven Vertraegen nachvollziehbar berechnet.
- Finanzdaten sind nur fuer berechtigte Rollen sichtbar (RLS greift).
- Mobile: Rechnungsuebersicht und Ausgaben-Erfassung sind bedienbar.

**Abhaengigkeiten / naechste Schritte**
- Abhaengigkeit: Phasen 2, 5 (Vertraege/Kunden) und 6 (Projektleistungen).
- Naechster Schritt: Phase 9 bringt die AI-Engines, die Chancen und Aufgaben in alle bisherigen Module einspeisen.

---

## Phase 9 - AI Engines

**Ziel**
Die 12 AI-Engines als operative Co-Piloten anbinden: Sie erzeugen konkrete Aufgaben, Opportunities und Entwuerfe in den bestehenden Modulen - sie fuettern den Arbeitsfluss, ersetzen ihn aber nicht.

**Scope (enthalten)**
- Anbindung der 12 Engines: Lead Engine, Website Audit Engine, Ads Opportunity Engine, Content Opportunity Engine, Recruiting Opportunity Engine, CRM Automation Opportunity Engine, Outreach Engine, Proposal Generator, Content Script Generator, Meeting Assistant, Upsell Engine, Referral Engine.
- Operations-Navigation: AI-Engines (`/operations/engines`) zur Verwaltung/Beobachtung.
- Engines schreiben in bestehende Tabellen: vor allem `opportunities` (`opportunity_status`), `leads`, `outreach_emails`, `offers`, `content_items`, `creators` - und erzeugen Aufgaben im Task-System.
- Jede AI-Ausgabe ist ein Vorschlag (Status `open`/`in_review`), den ein Mensch akzeptiert (`accepted`) oder verwirft (`dismissed`); jede Erzeugung wird in `audits`/`activity_logs` protokolliert.

**NICHT enthalten**
- Keine zeitgesteuerte/automatische Ausloesung der Engines (das ist Aufgabe der Automationen in Phase 10).
- Keine automatische, unbeaufsichtigte Aktion ohne menschliche Freigabe (insb. kein automatischer Mailversand).
- Keine neuen Datenmodelle - Engines nutzen ausschliesslich das bestehende Modell.

**Erfolgskriterien**
- Mindestens eine Engine je Domaene erzeugt nachvollziehbar Eintraege (z. B. Lead Engine -> `leads`, Website Audit Engine -> `opportunities`).
- Jede Opportunity ist einem Quell-Engine-Lauf und einem Zielobjekt zugeordnet (Datenherkunft sichtbar).
- AI-Vorschlaege erscheinen als annehmbare/verwerfbare Aufgaben im operativen Fluss.
- Mobile: Opportunities lassen sich pruefen und entscheiden.

**Abhaengigkeiten / naechste Schritte**
- Abhaengigkeit: Phasen 2-8 (Engines brauchen die Zielmodule und das Task-System).
- Naechster Schritt: Phase 10 automatisiert Ausloesung, Zeitplanung und Benachrichtigung.

---

## Phase 10 - Automationen

**Ziel**
Den Betrieb selbstlaufend machen: interne Automationsregeln, Cron Jobs, Webhooks und Benachrichtigungen verbinden Engines, Module und Aufgaben zu einem durchgaengigen, ueberwachten Fluss - die Klammer um das gesamte System.

**Scope (enthalten)**
- CRUD und Laufverwaltung fuer `automations` (`automation_status`: `active`, `paused`, `error`); ein-/ausgehende `webhooks`; ausgeloeste `notifications`.
- Operations-Navigation: Automationen (`/operations/automations`); Anbindung externer Systeme ueber `integrations`.
- Cron Jobs als zeitgesteuerte Ausloeser (z. B. taegliche Engine-Laeufe, Faelligkeits-Erinnerungen, Reporting-Call-Vorbereitung).
- Regelbasierte Folgeaktionen (Statuswechsel -> Aufgabe/Benachrichtigung); vollstaendige Protokollierung jedes Laufs in `audits`/`activity_logs` inkl. Fehlerzustand (`error`).

**NICHT enthalten**
- Keine Automation, die menschliche Freigaben fuer Aussenkommunikation umgeht (Compliance bleibt: manueller 1:1-Versand).
- Keine neuen fachlichen Module - Automationen orchestrieren ausschliesslich Bestehendes.

**Erfolgskriterien**
- Ein Cron Job loest reproduzierbar einen Engine-Lauf oder eine Erinnerung aus und erzeugt die erwarteten Aufgaben/Benachrichtigungen.
- Ein Webhook empfaengt/sendet Ereignisse zuverlaessig und protokolliert sie.
- Fehlerhafte Automationen wechseln nachvollziehbar in `error` und sind im UI sichtbar.
- Mobile: Benachrichtigungen aus Automationen erreichen den Nutzer.

**Abhaengigkeiten / naechste Schritte**
- Abhaengigkeit: alle Phasen 1-9 (Automationen sind die Klammer ueber das fertige System).
- Naechster Schritt: Plattform ist funktional vollstaendig; Folge-Prompts bauen Detail-Workflows, Reports und Feinschliff auf diesem Fundament aus.

---

## 12.1 Roadmap-Tabelle (Reihenfolge & Abhaengigkeiten)

| Phase | Name | Baut auf | Liefert (Kern) | Operativer Kern-Nutzen |
| --- | --- | --- | --- | --- |
| 1 | Foundation / Auth / Rollen / Layout | - | `users`, `roles`, `permissions`, App-Shell, RLS-Muster | Anmeldung + rollenbasierte Navigation |
| 2 | Core Database Model | 1 | alle 27 Kern-Tabellen + Hilfstabellen, Audit-Basis | konsistente, verbundene Datenbasis |
| 3 | Task System | 2 | `tasks`, `subtasks`, Home-Modul | "Was muss heute gemacht werden?" |
| 4 | Sales CRM | 2, 3 | `leads`, `opportunities`, `offers`, `outreach_emails`, `meetings` | Lead bis Abschluss steuern |
| 5 | Client Management | 2, 3, 4 | `clients`, `contacts`, `contracts`, `reporting_calls` | Kunden als zentrale Entitaeten fuehren |
| 6 | Production Module | 2, 3, 5 | `projects`, `content_items`, `websites`, `ad_campaigns`, `crm_builds` | Leistungen liefern (Projekt als Container) |
| 7 | Creator Pool | 2, 3, 6 | `creators`, `shoots` | Talente und Drehs planen |
| 8 | Finance | 2, 5, 6 | `invoices`, `expenses` | Umsaetze, Kosten, MRR/ARR steuern |
| 9 | AI Engines | 2-8 | `opportunities`, `automations` (Speisung) | KI erzeugt Chancen & Aufgaben |
| 10 | Automationen | 1-9 | `automations`, `webhooks`, `notifications` | selbstlaufender, ueberwachter Betrieb |

**Lesart der Roadmap:** Die Spalte "Baut auf" ist verbindlich. Keine Phase darf vor ihren Voraussetzungen begonnen werden. Die Achse ist klar: erst Sicherheit & Identitaet (1), dann das Datenmodell (2), dann die zentrale operative Einheit Aufgabe (3), danach die fachlichen Module entlang der Wertschoepfungskette (4 Sales -> 5 Clients -> 6 Production -> 7 Creator -> 8 Finance), schliesslich die intelligente Schicht (9 AI Engines) und die Orchestrierung (10 Automationen). So entsteht in jeder Phase nutzbarer operativer Wert, ohne dass spaeter ein Modellbruch noetig wird.

---

# 13 Regeln fuer spaetere Entwicklung

> Diese Regeln sind verbindlich fuer jede weitere Entwicklung an eCreator OS - in jedem Folge-Prompt, jedem Feature, jeder Phase. Sie sind nicht verhandelbar und gelten ueber das Leitprinzip **"Eine Plattform. Eine Datenbank. Ein Login. Alles verbunden."**.

## 13.1 Produkt- & Architektur-Regeln (Kernregeln)

1. **Keine Mockdaten ohne echte CRUD-Funktion.** Jede sichtbare Liste, Karte oder Tabelle muss gegen die echte Supabase-Datenbank lesen und schreiben. Demo-/Seed-Daten sind erlaubt, aber niemals als Ersatz fuer fehlende Funktion. Ein "Screen, der nur huebsch aussieht" gilt als unfertig.
2. **Keine isolierten Module.** Jedes Modul ist mit dem uebrigen System verbunden. Kein Feature lebt fuer sich; jedes Objekt verweist auf seinen Kontext (Kunde, Projekt, Aufgabe, Owner). Insel-Tools sind verboten.
3. **Keine doppelte Datenhaltung.** Jedes Objekt existiert genau einmal und wird ueber Fremdschluessel verknuepft - nie kopiert. Aus einem gewonnenen Lead wird ein verknuepfter Kunde, keine Datenkopie. Redundante Felder sind zu vermeiden.
4. **Keine Features ohne operativen Nutzen.** Jede Seite beantwortet "Was muss heute gemacht werden?". Reine Analytics-Anzeigen ohne handlungsleitenden naechsten Schritt werden nicht gebaut. Der naechste Schritt ist immer sichtbar.
5. **Keine UI vor klarem Datenmodell.** Erst Tabellen, Beziehungen, Status-Enums, RLS und Audit-Hook - dann die Oberflaeche. Eine Oberflaeche ohne fundiertes Datenmodell darunter wird nicht begonnen.
6. **Tasks bleiben die zentrale operative Einheit.** Arbeit wird ueber `tasks`/`subtasks` organisiert. Jedes Modul, das Arbeit ausloest (Sales, Clients, Production, AI-Engines, Automationen), erzeugt Aufgaben im selben Task-System - keine parallelen, modul-eigenen "To-do"-Mechanismen.
7. **Projekte sind Container.** `projects` buendeln die Lieferleistung pro Kunde (Content, Websites, Ads, CRM-Builds, Drehs, Aufgaben, Dateien, Team). Lieferobjekte haengen immer an einem Projekt - nie freischwebend.
8. **Kunden sind zentrale Entitaeten.** `clients` sind der Bezugspunkt der Wertschoepfung. Vertraege, Projekte, Termine, Rechnungen, Opportunities und Aufgaben verweisen letztlich auf einen Kunden (oder einen Lead auf dem Weg dorthin).
9. **Alles auf Deutsch.** Die gesamte Benutzeroberflaeche, alle Beschriftungen, Hinweise und Texte sind in Schweizer Geschaeftsdeutsch. Datenbank-Enums bleiben englisch/snake_case und werden nur in der Praesentationsschicht ins Deutsche uebersetzt.
10. **Mobile muss funktionieren.** Jede operative Kernfunktion (Aufgaben, Pipeline, Kundenprofil, Benachrichtigungen) ist auf dem Smartphone vollwertig bedienbar. Mobile ist kein optionales Extra, sondern Abnahmekriterium jeder Phase.
11. **Rechte/RLS immer beruecksichtigen.** Jede Funktion respektiert Rolle und Sichtbarkeit. Sicherheit wird auf Datenbankebene (Row Level Security) durchgesetzt, nicht nur im UI - und ist by default aktiv, nie nachtraeglich angeflanscht.

## 13.2 Ergaenzende Engineering-Regeln (verbindlich)

12. **Jede fachliche Tabelle hat RLS aktiviert.** Eine neue Tabelle ohne Row-Level-Security-Policy (Org + Rolle) darf nicht in Betrieb gehen. RLS-aus ist kein gueltiger Zustand fuer fachliche Daten.
13. **Jede mutierende Aktion schreibt ins Audit-Log.** Anlegen, Aendern und Loeschen erzeugen einen Eintrag in `audits` (wer, was, wann, alt/neu). Jede sichtbare Statusaenderung erzeugt zusaetzlich einen Eintrag in `activity_logs`. Es gibt keine stillen Schreibvorgaenge.
14. **Server Actions validieren jeden Input.** Schreibende Logik laeuft ueber Server Actions / API Routes mit serverseitiger Validierung (z. B. Schema-Pruefung). Dem Client wird nie vertraut; Validierung im Browser ist Komfort, nicht Schutz.
15. **Namens- & Status-Konventionen sind bindend.** Tabellen `snake_case`/Plural, Felder `snake_case` ohne Tabellen-Praefix, `id` als UUID, Fremdschluessel `<singular>_id`, Booleans mit `is_`/`has_`, Zeitstempel auf `_at`, Datumsfelder auf `_date`. Status-Enums ausschliesslich aus der kanonischen Liste - keine ad hoc erfundenen Werte.
16. **Soft-Delete statt harter Loeschung.** Fachliche Datensaetze werden ueber `deleted_at` deaktiviert; Standardabfragen filtern `deleted_at IS NULL`. Harte Loeschung ist ausschliesslich `super_admin` vorbehalten.
17. **Geld immer als Ganzzahl in Rappen mit Waehrung.** Betragsfelder enden auf `_amount`, sind Integer in Rappen und tragen ein `currency`-Feld (Default `CHF`). Keine Fliesskomma-Betraege, keine impliziten Waehrungen.
18. **`org_id` auf jeder fachlichen Tabelle.** Auch im Single-Tenant-Betrieb traegt jede fachliche Tabelle `org_id`; alle RLS-Policies basieren auf `org_id` + Rolle. So bleibt spaetere Multi-Tenancy ohne Modellbruch moeglich.
19. **AI-Ausgaben sind Vorschlaege, kein Automatismus.** Jede Engine-Ausgabe (Opportunity, Entwurf, Aufgabe) durchlaeuft einen menschlichen Entscheid (`open`/`in_review` -> `accepted`/`dismissed`). Aussenkommunikation (insb. Outreach-Mails) erfolgt grundsaetzlich nur nach manueller Freigabe - DSG-/UWG-konform, kein automatischer Massenversand.
20. **Datenherkunft ist nachvollziehbar.** Jedes von einer Engine oder Automation erzeugte Objekt traegt seine Quelle (welcher Lauf, welches Zielobjekt). Keine "anonymen" Datensaetze ohne Herkunft; der Audit-Trail bleibt vollstaendig.
21. **Wiederverwenden statt duplizieren (Code & Daten).** Gemeinsame Muster - RLS-Policy-Vorlage, Audit-Schreibhelfer, Status-Badges, polymorphe Anhaenge/Kommentare/Tags - werden zentral implementiert und wiederverwendet. Copy-Paste-Logik, die das System auseinanderdriften laesst, ist zu vermeiden.

## 13.3 Definition of Done (pro Feature)

Ein Feature gilt erst als fertig, wenn **alle** folgenden Punkte erfuellt sind:

- [ ] Datenmodell steht (Tabellen, Beziehungen, Enums) und folgt den Konventionen.
- [ ] RLS-Policy aktiv und gegen mindestens zwei Rollen geprueft.
- [ ] Echte CRUD-Funktion gegen die Datenbank (keine Mockdaten als Endzustand).
- [ ] Mutationen ueber validierte Server Actions; `audits` + `activity_logs` werden geschrieben.
- [ ] Verknuepfung mit dem uebrigen System (Kunde/Projekt/Aufgabe/Owner) vorhanden.
- [ ] Operativer Nutzen sichtbar ("naechster Schritt" ist klar).
- [ ] Deutschsprachige Oberflaeche, Enums korrekt uebersetzt.
- [ ] Mobile vollwertig bedienbar.
