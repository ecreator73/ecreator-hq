# eCreator OS - Vision, Hauptnavigation & UX-Kernregel

> Blueprint-Abschnitt 01 (Prompt 0 - Planung). Baut verbindlich auf der kanonischen Referenz (`00-kanonische-referenz.md`) auf. Alle Namen von Tabellen, Rollen, Modulen, Engines, Phasen und Status-Werten sind exakt von dort uebernommen. Bei Konflikten gilt die kanonische Referenz.

---

## 1 Vision & Projektziel

### 1.1 Was eCreator OS ist

**eCreator OS ist das interne Betriebssystem der eCreator GmbH** - einer Schweizer Digital-Growth-Agentur. Es buendelt den gesamten Geschaeftsablauf - von der Leadgewinnung ueber Verkauf, Kundenbetreuung und Produktion bis zu den Finanzen - in einer einzigen, vollstaendig verbundenen Plattform und fuehrt jeden Mitarbeitenden taeglich operativ durch seine Arbeit.

eCreator OS ist bewusst **kein "weiteres CRM"** und **kein Reporting-Dashboard**. Ein CRM verwaltet Kontakte und Deals; eCreator OS verwaltet das gesamte Unternehmen als ein zusammenhaengendes operatives System. Es ist die zentrale Arbeitsoberflaeche, an der jede Rolle ihren Tag beginnt und beendet: Sales arbeitet die Pipeline ab, der Project Manager steuert die Lieferung, Finance fakturiert, die Geschaeftsfuehrung steuert strategisch - alles auf demselben Datenbestand, ohne Medienbruch.

### 1.2 Warum ein Betriebssystem statt "nur ein CRM"

Eine Wachstumsagentur erbringt heterogene Leistungen (Content, Websites, Ad-Kampagnen, CRM-Builds, Drehs) fuer dieselben Kunden, die sie selbst akquiriert, betreut und fakturiert. Diese Wertschoepfungskette ist durchgaengig - die Werkzeuglandschaft ist es typischerweise nicht. Das fuehrt zu den klassischen Symptomen einer Tool-Landschaft aus Inselloesungen:

- **Datendopplung & Drift** - derselbe Kunde existiert in CRM, Projekttool, Buchhaltung und Tabellen mehrfach, mit auseinanderlaufenden Staenden.
- **Kontextverlust** - der Bezug zwischen Lead, gewonnenem Kunden, laufendem Projekt und offener Rechnung geht beim Tool-Wechsel verloren.
- **Manuelle Uebergaben** - Informationen werden per Copy-Paste, Mail oder Zuruf zwischen Abteilungen transportiert, was fehleranfaellig und nicht nachvollziehbar ist.
- **Kein operativer Fokus** - vorhandene Tools zeigen Vergangenheit (Berichte), aber nicht den naechsten konkreten Handlungsschritt.

eCreator OS loest dies, indem **jedes Geschaeftsobjekt genau einmal existiert** und mit allen relevanten anderen Objekten verknuepft ist. Ein Lead (`leads`) wird zum Kunden (`clients`), dem ein Vertrag (`contracts`), ein oder mehrere Projekte (`projects`) und daraus entstehende Rechnungen (`invoices`) zugeordnet sind - ueber dieselbe Datenbank, dieselbe Identitaet, denselben Verlauf (`activity_logs`).

### 1.3 Was eCreator OS ersetzt

eCreator OS konsolidiert die typische Werkzeugkette einer Agentur in einer Plattform:

| Bisherige Insel-Kategorie | Wird in eCreator OS abgebildet durch |
| --- | --- |
| Klassisches Sales-CRM (Kontakte, Pipeline) | Bereich **Sales** (`leads`, `opportunities`, `offers`, `outreach_emails`, `meetings`) |
| Kundenstamm & Vertragsverwaltung | Bereich **Clients** (`clients`, `contacts`, `contracts`, `reporting_calls`) |
| Projekt- & Aufgaben-Tool (Kanban, To-dos) | Bereich **Production** (`projects`, `tasks`, `subtasks`) |
| Content-/Redaktions- & Dreh-Planung | Bereich **Production** (`content_items`, `shoots`) + **Operations** (`creators`) |
| Ablage/Dateiserver | Bereich **Operations** (`files`, `attachments`) |
| Buchhaltung/Faktura-Vorstufe | Bereich **Finance** (`invoices`, `expenses`, wiederkehrende Vertragswerte) |
| Verstreute Automationen & Skripte | Bereich **Operations** (`automations`, AI-Engines, `webhooks`) |
| Tabellen-Wildwuchs (Excel/Sheets) | strukturierte Kern-Tabellen + Verlauf statt freier Tabellen |

eCreator OS ersetzt damit die **Koordinationsschicht zwischen diesen Tools** (Listen, Mails, Zurufe) ebenso wie die Tools selbst, wo sinnvoll. Drittsysteme, die bewusst extern bleiben (z. B. Werbeplattformen, Mailprovider), werden ueber `integrations` und `webhooks` angebunden, nicht nachgebaut.

### 1.4 Das Leitprinzip: "Eine Plattform. Eine Datenbank. Ein Login. Alles verbunden."

Dieses Prinzip ist die architektonische DNA des Systems und gilt ohne Ausnahme:

- **Eine Plattform** - eine Next.js-Anwendung (App Router) mit sieben Bereichen; keine separaten Tools, kein Tab-Hopping. Jede Rolle arbeitet in derselben Oberflaeche, sieht aber rollenabhaengig unterschiedliche Inhalte.
- **Eine Datenbank** - ein Supabase/PostgreSQL-Schema mit 27 Kern-Tabellen plus Hilfstabellen. Jedes Objekt ist genau einmal vorhanden; Beziehungen werden ueber Fremdschluessel (`client_id`, `project_id`, `lead_id`) und polymorphe Verknuepfungen (`taggables`, `attachments`, `comments`) hergestellt - nie durch Kopien.
- **Ein Login** - eine Identitaet pro Mitarbeitendem (`users`) ueber Supabase Auth. Was jemand sieht und tun darf, ergibt sich aus seiner Rolle (`roles`, `permissions`) und wird durch Row Level Security auf `org_id` + Rolle erzwungen.
- **Alles verbunden** - jede schreibende Aktion erzeugt einen Eintrag in `audits`, jede sichtbare Statusaenderung einen Eintrag in `activity_logs`. Dadurch ist der vollstaendige Kontext eines Objekts jederzeit nachvollziehbar (Wer? Was? Wann? Woraus entstanden?).

Konkret heisst das: Wird ein Lead gewonnen, entsteht daraus ein Kunde mit Vertrag, daraus ein Projekt mit Aufgaben, daraus Content/Websites/Kampagnen, daraus Rechnungen - und jeder dieser Schritte bleibt mit seinem Ursprung verknuepft und im Verlauf sichtbar. Niemand pflegt denselben Sachverhalt zweimal.

### 1.5 Abgrenzung zu reinen Analytics-Tools

eCreator OS ist ausdruecklich **operativ, nicht analytisch** als Primaerzweck. Der Unterschied:

| Reines Analytics-Tool | eCreator OS |
| --- | --- |
| Zeigt, **was passiert ist** (Reports, Charts, KPIs) | Zeigt, **was jetzt zu tun ist** (Aufgaben, Faelligkeiten, naechste Schritte) |
| Aggregiert Daten aus Drittquellen zur Ansicht | Haelt die Daten selbst und veraendert ihren Zustand (Status, Zuweisung, Abschluss) |
| Entscheidungs-Vorbereitung | Arbeits-Durchfuehrung |
| KI fasst zusammen und berichtet | KI-Engines erzeugen konkrete `tasks`, `opportunities` und Entwuerfe, die in den Arbeitsfluss einspeisen |
| Read-only-Charakter | Schreibendes System mit `audits` + `activity_logs` |

Das Schwesterprodukt **eCreator Command** (Client-Analytics & Reporting, agenturseitig) ist genau ein solches Analytics-Werkzeug fuer Kunden-Reporting. eCreator OS ist davon getrennt: Es ist das **interne Betriebssystem**, das die Agentur selbst betreibt. Analytics ist in eCreator OS vorhanden (z. B. Finanzberichte, Auslastung, Pipeline-Werte), aber immer als Beifahrer einer operativen Seite - nie als Selbstzweck. Die Leitfrage jeder Seite lautet nicht "Wie steht es?", sondern **"Was muss heute gemacht werden?"** (siehe Abschnitt 3).

---

## 2 Grundstruktur / Hauptnavigation

Die Anwendung gliedert sich in **sieben Bereiche**. Die Beschriftung ist Deutsch, der technische Routenpfad englisch/kebab-case. Die linke Hauptnavigation zeigt diese sieben Bereiche; pro Bereich oeffnet sich eine Sektion mit den zugehoerigen Unterseiten. Sichtbarkeit jeder Seite und jeder Aktion richtet sich nach der Rolle (`roles`, `permissions`) und wird durch Row Level Security erzwungen.

| # | Bereich | Pfad | Kernzweck (1 Satz) |
| --- | --- | --- | --- |
| 1 | Home | `/` | Persoenlicher operativer Einstieg - "Was muss ich heute tun?" |
| 2 | Sales | `/sales` | Akquise und Verkauf von Lead bis Abschluss |
| 3 | Clients | `/clients` | Betreuung, Vertraege und Wachstum von Bestandskunden |
| 4 | Production | `/production` | Lieferung aller Leistungen (Content, Web, Ads, CRM, Drehs) |
| 5 | Operations | `/operations` | Interne Steuerung: Creator-Pool, Auslastung, Automationen, AI-Engines, Dateien |
| 6 | Finance | `/finance` | Rechnungen, Ausgaben, wiederkehrende Umsaetze und Berichte |
| 7 | Settings | `/settings` | Organisation, Benutzer, Rollen/Rechte, Integrationen, Audit |

---

### 2.1 Home - `/`

**Zweck.** Persoenlicher, rollenadaptiver Einstiegspunkt. Home beantwortet fuer die angemeldete Person sofort die Kernfrage "Was muss ich heute tun?" und buendelt ihre faelligen Aufgaben, Benachrichtigungen und relevante Aktivitaeten - quer ueber alle Bereiche, gefiltert auf das, was diese Person betrifft.

**Unterseiten.**

| Unterseite | Pfad | Inhalt |
| --- | --- | --- |
| Mein Tag (Dashboard) | `/` | Persoenliches Command-Center: heute faellige Aufgaben, ueberfaellige Posten, Termine des Tages, offene Genehmigungen, Alerts |
| Meine Aufgaben | `/my-tasks` | Alle der Person zugewiesenen Aufgaben (`assigned_to`) ueber alle Projekte, filter- und sortierbar |
| Benachrichtigungen | `/notifications` | In-App-Benachrichtigungen mit Lese-Status, gruppiert nach Quelle |
| Aktivitaetsverlauf | `/activity` | Persoenlich relevanter Feed aus `activity_logs` (eigene Objekte, eigene Projekte) |

**Wichtigste Funktionen.**
- "Mein Tag"-Aggregation: zieht heute-faellige und ueberfaellige `tasks`/`subtasks` (`due_date`, `task_status`) sowie Termine (`meetings`) zusammen.
- Aufgaben direkt erledigen, Status aendern (`todo` → `in_progress` → `done`), Faelligkeit verschieben - ohne den Bereich zu verlassen.
- Benachrichtigungen lesen/abhaken und direkt zum verknuepften Objekt springen.
- Schnellzugriff auf zuletzt bearbeitete Objekte und offene Genehmigungen.

**Sichtbare Daten.** Ausschliesslich auf die angemeldete Person zugeschnitten: ihre `tasks`/`subtasks`, ihre `notifications`, der sie betreffende Ausschnitt aus `activity_logs`, ihre `meetings`. Keine fremden Aufgaben ausser bei Rollen mit Leserechten (CEO, CSO, Viewer fuer freigegebene Bereiche).

**Verbundene Module.** Home ist die Konvergenzschicht aller Bereiche: Aufgaben stammen aus **Production**, Termine teils aus **Sales** und **Clients**, Genehmigungen aus **Sales**/**Finance**, der Feed aus dem gesamten System. Home erzeugt selbst keine fachlichen Objekte - es buendelt und verlinkt sie.

---

### 2.2 Sales - `/sales`

**Zweck.** Akquise und Verkauf von der ersten Lead-Beruehrung bis zum Abschluss. Sales bildet die komplette Vertriebs-Pipeline ab, treibt Outreach und Angebote und uebergibt gewonnene Leads sauber an **Clients**.

**Unterseiten.**

| Unterseite | Pfad | Inhalt |
| --- | --- | --- |
| Pipeline | `/sales/pipeline` | Kanban-Ansicht der Leads entlang `lead_status` (`new` → `contacted` → `qualified` → `proposal` → `won`/`lost`) |
| Leads | `/sales/leads` | Listen-/Detailverwaltung aller Leads inkl. Quelle, Owner, Status |
| Opportunities | `/sales/opportunities` | Wachstums-/Verkaufschancen aus AI-Engines oder manuell, mit `opportunity_status` und `priority` |
| Angebote | `/sales/offers` | Proposals mit Positionen, Wert und `offer_status` (`draft` → `sent` → `accepted`/`rejected`/`expired`) |
| Outreach | `/sales/outreach` | 1:1-Akquise-Mails (`outreach_emails`) mit `outreach_status`, manueller Versand |
| Termine | `/sales/meetings` | Sales-Termine (`meetings`) mit Teilnehmern, Vorbereitung und Folgeaufgaben |

**Wichtigste Funktionen.**
- Leads anlegen, qualifizieren und durch die Pipeline ziehen (Statuswechsel per Drag & Drop).
- Opportunities aus den Engines annehmen (`accepted`) oder verwerfen (`dismissed`); angenommene Chancen erzeugen Folgeaufgaben.
- Angebote erstellen (Proposal Generator), versenden und im Status nachhalten; ein `accepted` Angebot stoesst die Kundenanlage an.
- Outreach-Entwuerfe erzeugen (Outreach Engine), personalisiert pruefen, manuell versenden, Antworten erfassen.
- Termine planen, vorbereiten und nachbereiten (Meeting Assistant erzeugt Zusammenfassung + Folgeaufgaben).

**Sichtbare Daten.** `leads`, `opportunities`, `offers`, `outreach_emails`, `meetings` sowie verknuepfte `contacts`. Geldbetraege als `_amount` in Rappen mit `currency` (Default `CHF`). Zuweisung ueber `owner_id`/`assigned_to`. Sales sieht eigene bzw. zugewiesene Datensaetze; CSO/CEO sehen den gesamten Bereich.

**Verbundene Module.** **Clients** (gewonnener Lead → Kunde, Kontakte gemeinsam genutzt), **Operations** (AI-Engines: Lead Engine, Outreach Engine, Proposal Generator, Meeting Assistant; Website/Ads/Content/Recruiting/CRM Opportunity Engines speisen `opportunities`), **Home** (Termine + Aufgaben), **Finance** (gewonnener Deal → Vertrag/Rechnung), **Production** (Auftrag → Projekt nach Abschluss).

---

### 2.3 Clients - `/clients`

**Zweck.** Betreuung, Vertragsverwaltung und Wachstum von Bestandskunden. Clients ist das Zuhause jedes aktiven Kunden und buendelt alles, was zur laufenden Beziehung gehoert - Profil, Kontakte, Vertraege, Reporting-Calls und Upsell-/Empfehlungschancen.

**Unterseiten.**

| Unterseite | Pfad | Inhalt |
| --- | --- | --- |
| Kundenuebersicht | `/clients` | Liste aller Kunden mit `client_status` (`active`/`paused`/`churned`), Owner, Vertragskontext |
| Kundenprofil | `/clients/[id]` | 360-Grad-Profil eines Kunden: Vertraege, Projekte, Rechnungen, Kontakte, Verlauf |
| Kontakte | `/clients/contacts` | Ansprechpersonen (`contacts`) zu Kunden und Leads |
| Vertraege | `/clients/contracts` | Laufende Vertraege (`contracts`) mit Laufzeit, Leistungen, Wert, `contract_status` |
| Reporting-Calls | `/clients/reporting-calls` | Wiederkehrende Review-/Reporting-Calls (`reporting_calls`) mit Kunden |
| Upsell & Empfehlungen | `/clients/growth` | Upsell-/Cross-Sell- und Referral-Chancen je Bestandskunde |

**Wichtigste Funktionen.**
- Kundenprofil als zentrale Klammer: zeigt alle verknuepften `projects`, `contracts`, `invoices`, `meetings` und den `activity_logs`-Verlauf des Kunden.
- Vertraege anlegen/verwalten inkl. Laufzeit, Leistungsumfang und Wert; Statusfuehrung von `draft` bis `expired`/`cancelled`.
- Reporting-Calls terminieren, vorbereiten und nachhalten (Anbindung Meeting Assistant).
- Upsell- und Referral-Chancen sichten und annehmen; angenommene Chancen erzeugen Opportunities/Aufgaben.

**Sichtbare Daten.** `clients`, `contacts`, `contracts`, `reporting_calls`, `meetings`; im Kundenprofil zusaetzlich aggregiert: zugehoerige `projects`, `invoices`, offene `tasks`. Sichtbarkeit rollenabhaengig (Owner/Betreuer, CSO, CEO, Finance fuer Vertragswerte).

**Verbundene Module.** **Sales** (Herkunft des Kunden, gemeinsame `contacts`), **Production** (Projekte und Lieferungen je Kunde), **Finance** (Vertraege → wiederkehrende Umsaetze und Rechnungen), **Operations** (Upsell Engine, Referral Engine speisen die Wachstums-Seite), **Home** (Reporting-Calls und Betreuungsaufgaben).

---

### 2.4 Production - `/production`

**Zweck.** Lieferung saemtlicher Agenturleistungen. Production ist die operative Werkstatt: Projekte sind die zentrale Lieferklammer, darunter laufen Aufgaben, Content, Websites, Ad-Kampagnen, CRM-Builds und Drehs zusammen.

**Unterseiten.**

| Unterseite | Pfad | Inhalt |
| --- | --- | --- |
| Projekte | `/production/projects` | Alle Kundenprojekte (`projects`) mit `project_status`, PM, Deadlines |
| Aufgaben-Board | `/production/board` | Bereichsweites Kanban aller `tasks`/`subtasks` entlang `task_status` |
| Content | `/production/content` | Content-Stuecke (`content_items`) mit `content_status` (`idea` → `published`) |
| Websites | `/production/websites` | Website-Builds (`websites`) pro Kunde |
| Ad-Kampagnen | `/production/ad-campaigns` | Bezahlte Kampagnen (`ad_campaigns`) mit `campaign_status` |
| CRM-Builds | `/production/crm-builds` | CRM-/Automations-Aufbauten (`crm_builds`) als Lieferleistung |
| Drehs | `/production/shoots` | Foto-/Video-Drehs (`shoots`) mit `shoot_status` |

**Wichtigste Funktionen.**
- Projekte planen und steuern (Status, Owner/PM, Termine, Mitglieder via `project_members`).
- Aufgaben und Subtasks anlegen, zuweisen (`assigned_to`), priorisieren (`priority`) und ueber das Board bewegen.
- Content-Pipeline fuehren (Content Opportunity Engine + Content Script Generator liefern Themen und Skripte).
- Website-, Ads- und CRM-Build-Lieferungen als eigene Gewerke planen und an Projekte/Kunden binden.
- Drehs planen und mit dem Creator-Pool koordinieren.

**Sichtbare Daten.** `projects`, `tasks`, `subtasks`, `content_items`, `websites`, `ad_campaigns`, `crm_builds`, `shoots`; verknuepfte `files`/`attachments`, `comments` und `project_members`. Sichtbarkeit nach Rolle (Project Manager, Developer fuer Builds, Creative fuer Content/Drehs) und Projektzugehoerigkeit.

**Verbundene Module.** **Clients** (jedes Projekt gehoert zu einem Kunden), **Operations** (Creator-Pool fuer Drehs, Automationen, Dateien, AI-Engines fuer Content), **Home** (Aufgaben fliessen in "Mein Tag"), **Finance** (geleistete Projekte → Rechnungen), **Sales** (Auftrag aus gewonnenem Deal).

---

### 2.5 Operations - `/operations`

**Zweck.** Interne Steuerungsebene der Agentur. Operations buendelt Ressourcen und Werkzeuge, die quer durch alle Bereiche wirken: den Creator-Pool, Team-Auslastung, interne Automationen, die zentrale Dateiablage und die AI-Engines.

**Unterseiten.**

| Unterseite | Pfad | Inhalt |
| --- | --- | --- |
| Creator-Pool | `/operations/creators` | Interne/externe Creator (`creators`) als Talent-Pool fuer Drehs/Content |
| Team & Auslastung | `/operations/team` | Mitarbeitende (`users`), Zuweisungen und Auslastung ueber offene `tasks` |
| Automationen | `/operations/automations` | Interne Automationsregeln (`automations`) mit `automation_status` und Laeufen |
| Dateien | `/operations/files` | Zentrale Storage-Ablage (`files`) mit Verknuepfung zu Objekten |
| AI-Engines | `/operations/engines` | Steuerung und Status der 12 AI-Engines, erzeugte `opportunities` und Aufgaben |

**Wichtigste Funktionen.**
- Creator-Pool pflegen; Recruiting Opportunity Engine schlaegt neue Talente vor.
- Team-Auslastung sichtbar machen: wer ist mit welchen offenen Aufgaben wie ausgelastet.
- Automationen konfigurieren, aktivieren/pausieren und Fehlerlaeufe (`error`) ueberwachen.
- Dateien zentral ablegen, verknuepfen (`attachments`) und versionieren.
- AI-Engines ueberwachen: erzeugte Chancen pruefen, Engine-Laeufe nachvollziehen.

**Sichtbare Daten.** `creators`, `automations`, `files`, `integrations` (Status), Aggregationen ueber `users` und `tasks` (Auslastung), Engine-Output (`opportunities`, erzeugte `tasks`). Sichtbarkeit ueberwiegend fuer Project Manager, CSO, CEO und Super Admin.

**Verbundene Module.** **Production** (Creator → Drehs, Dateien → Lieferungen, Engines → Content-Themen), **Sales** (Engines → Leads/Opportunities/Outreach/Angebote), **Clients** (Upsell/Referral Engine), **Settings** (Integrationen liefern Engine-Datenquellen), **Home** (Engine-erzeugte Aufgaben landen in "Mein Tag").

---

### 2.6 Finance - `/finance`

**Zweck.** Finanzielle Steuerung der Agentur. Finance verwaltet ausgehende Rechnungen, betriebliche Ausgaben, die wiederkehrenden Vertragswerte (MRR/ARR) und die finanziellen Berichte - immer verknuepft mit Kunden, Vertraegen und Projekten.

**Unterseiten.**

| Unterseite | Pfad | Inhalt |
| --- | --- | --- |
| Finanzuebersicht | `/finance` | Operatives Finanz-Dashboard: offene/ueberfaellige Rechnungen, faellige Posten, Kennzahlen |
| Rechnungen | `/finance/invoices` | Ausgehende Rechnungen (`invoices`) mit `invoice_status` (`draft` → `paid`/`overdue`) |
| Ausgaben | `/finance/expenses` | Betriebliche Ausgaben (`expenses`) inkl. Kategorie und Beleg |
| Vertragswerte (MRR/ARR) | `/finance/recurring` | Wiederkehrende Umsaetze aus `contracts` (MRR/ARR-Sicht) |
| Berichte | `/finance/reports` | Finanzielle Auswertungen und Exporte |

**Wichtigste Funktionen.**
- Rechnungen erstellen, versenden und im Status nachhalten; ueberfaellige Rechnungen (`overdue`) als Faelligkeiten ausweisen.
- Ausgaben erfassen, kategorisieren und mit Belegen (`attachments`) verknuepfen.
- Wiederkehrende Vertragswerte aus `contracts` berechnen und als MRR/ARR fuehren.
- Berichte erzeugen und exportieren; Cron Jobs koennen Faelligkeitspruefungen anstossen.

**Sichtbare Daten.** `invoices`, `expenses`, `contracts` (Wertsicht); Geldbetraege als `_amount` in Rappen + `currency` (Default `CHF`). Sichtbarkeit primaer fuer Finance, lesend fuer CEO; Detailzugriff RLS-gesteuert.

**Verbundene Module.** **Clients** (Rechnung/Vertrag je Kunde), **Production** (geleistete Projekte → fakturierbar), **Settings** (Integrationen fuer Zahlungs-/Buchhaltungssysteme), **Operations** (Automationen/Cron fuer Faelligkeits-Reminder), **Home** (faellige Finanzaufgaben fuer Finance-Rolle).

---

### 2.7 Settings - `/settings`

**Zweck.** Verwaltung der Plattform selbst. Settings deckt Organisation, Benutzer, Rollen/Rechte, Integrationen, den Audit-Trail und das persoenliche Profil ab - die Steuerungsebene fuer Sicherheit, Zugriff und Anbindungen.

**Unterseiten.**

| Unterseite | Pfad | Inhalt |
| --- | --- | --- |
| Organisation | `/settings/organization` | Organisationsstammdaten (`organizations`, Default = eCreator), Grundeinstellungen |
| Benutzer | `/settings/users` | Mitarbeitenden-Konten (`users`) anlegen, aktivieren/deaktivieren, Rollen zuweisen |
| Rollen & Rechte | `/settings/roles` | Die 9 Rollen (`roles`) und granulare Rechte (`permissions`) verwalten |
| Integrationen | `/settings/integrations` | Verbundene Drittsysteme (`integrations`) und `webhooks` konfigurieren |
| Audit Logs | `/settings/audit` | Revisionssicherer Audit-Trail (`audits`) aller sicherheitsrelevanten Aktionen |
| Mein Profil | `/settings/profile` | Persoenliche Stammdaten, Benachrichtigungs-Praeferenzen des angemeldeten Users |

**Wichtigste Funktionen.**
- Benutzer verwalten und Rollen zuweisen; Aktivierung/Deaktivierung ueber `is_active`.
- Rollen- und Rechtemodell pflegen (Grundlage aller RLS-Policies auf `org_id` + Rolle).
- Integrationen und Webhooks anbinden und ueberwachen (Datenquellen fuer Engines und Finance).
- Audit Logs durchsuchen und filtern (Wer, Was, Wann, alt/neu).
- Eigenes Profil und Benachrichtigungs-Einstellungen pflegen.

**Sichtbare Daten.** `users`, `roles`, `permissions`, `integrations`, `webhooks`, `audits`, `organizations`. Schreibzugriff weitestgehend nur fuer Super Admin (und definierte CEO-Rechte); "Mein Profil" fuer jeden angemeldeten User. Harte Loeschungen ausschliesslich durch `super_admin`.

**Verbundene Module.** Querschnittlich zu **allen** Bereichen: Rollen/Rechte steuern jede Seite, Integrationen versorgen **Operations** (Engines), **Finance** und **Sales** mit Daten, `audits` protokolliert Schreibaktionen aus dem gesamten System.

---

## 3 Wichtigste UX-Regel

### 3.1 Die Regel: "Was muss heute gemacht werden?"

Jede Seite in eCreator OS ist **operativ und handlungsorientiert**, nicht nur informativ. Egal welcher Bereich geoeffnet wird - die Oberflaeche beantwortet zuerst die Frage **"Was muss heute gemacht werden?"** und macht den naechsten konkreten Schritt sofort sichtbar und ausfuehrbar. Analytics (Charts, Summen, Trends) ist erlaubt, aber immer nachgeordnet: Es erklaert den Kontext einer Handlung, ersetzt sie aber nie.

Diese Regel ist der wichtigste Unterschied zu reinen Dashboards. Ein Dashboard zeigt Zahlen; eCreator OS zeigt **Arbeit mit einem Knopf zum Erledigen**. Operativ bedeutet konkret: Jede Seite enthaelt mindestens ein Element, das (a) etwas Faelliges/Anstehendes auflistet, (b) eine Verantwortlichkeit ausweist und (c) eine direkte Aktion zum Abarbeiten anbietet.

### 3.2 Wiederkehrendes "Heute"-Muster: das Command-Center-Widget

Damit die Regel ueberall konsistent erlebbar ist, verwendet jede Seite dasselbe wiederkehrende Schema, das **Command-Center-Widget**. Es steht immer oben und folgt stets demselben Aufbau:

**Schema des Command-Center-Widgets**

| Slot | Inhalt | Quelle / Logik |
| --- | --- | --- |
| **Titel** | "Heute" bzw. seitenspezifische Variante ("Heute faellig", "Heute zu tun") | konstant pro Seite |
| **Heute-faellig** | Posten mit `due_date` = heute (oder ueberfaellig) | `tasks`/`subtasks`, `invoices`, `meetings`, `reporting_calls` je Bereich |
| **Follow-ups** | Anstehende Nachfass-Aktionen (Antwort ausstehend, Termin nachbereiten) | `outreach_emails`, `meetings`, `opportunities` |
| **Deadlines** | Naechste harte Termine im Blickfeld (z. B. naechste 7 Tage) | `due_date`/`_date`-Felder der jeweiligen Objekte |
| **Verantwortlichkeit** | Wer ist zustaendig (`owner_id`/`assigned_to`) - Avatar/Name je Zeile | immer sichtbar pro Zeile |
| **Naechster Schritt** | Primaer-Aktion pro Zeile (Status setzen, oeffnen, versenden, abhaken) | Server Action des jeweiligen Objekts |
| **Alerts** | Rote Hinweise: ueberfaellig, blockiert, `overdue`/`blocked`/`error`/`expired` | Status-Enums + Faelligkeit |

Das Widget ist **klickbar und schreibend**: Jede Zeile fuehrt zur direkten Aktion (kein reiner Anzeigewert). Jede Aktion erzeugt einen Eintrag in `audits`, jede Statusaenderung einen in `activity_logs`. Visuell sind drei Dringlichkeitsstufen einheitlich kodiert: **ueberfaellig/Alert** (rot), **heute faellig** (Akzent/Hervorhebung), **anstehend** (neutral).

### 3.3 Auspraegung pro Bereich

Dasselbe Muster, gefuellt mit den bereichsspezifischen Objekten:

| Bereich | "Heute"-Inhalt (Heute-faellig / Follow-ups) | Deadlines | Alerts |
| --- | --- | --- | --- |
| **Home** (`/`) | Heute faellige + ueberfaellige eigene `tasks`/`subtasks`, Termine des Tages | naechste eigene `due_date`/Termine | ueberfaellige Aufgaben (`blocked`), ungelesene kritische `notifications` |
| **Sales** (`/sales`) | Leads mit faelligem Nachfass, Outreach ohne Antwort, heutige `meetings` | Angebots-Gueltigkeit, Termine | Angebote `expired`, Opportunities `expired`, Deals ohne naechsten Schritt |
| **Clients** (`/clients`) | Faellige Reporting-Calls, Betreuungsaufgaben, Vertrags-Checks | Vertrags-Enddaten (`contracts`) | Vertrag laeuft aus (`expired`), Kunde `paused`/Churn-Risiko |
| **Production** (`/production`) | Heute faellige `tasks`/`subtasks`, Content im Review, Drehs heute | Projekt-/Aufgaben-`due_date`, `shoots` | `blocked` Aufgaben, ueberfaellige Projekte, Content steckt in `review` |
| **Operations** (`/operations`) | Engine-erzeugte Aufgaben zu pruefen, Creator-Anfragen offen | geplante Automationslaeufe, Drehtermine | Automationen `error`, Engines ohne Lauf, Ueberlast im Team |
| **Finance** (`/finance`) | Heute faellige Rechnungen, zu versendende Rechnungen | Zahlungsziele, Vertrags-Renewals | Rechnungen `overdue`, fehlende Belege bei `expenses` |
| **Settings** (`/settings`) | Offene Benutzer-/Rollenfreigaben, ablaufende Integrationen | Token-/Integrations-Ablaeufe | Integration getrennt, ungewoehnliche Eintraege in `audits` |

### 3.4 Wie sich die Regel in UI-Elementen niederschlaegt

Ueber das Command-Center-Widget hinaus gelten folgende durchgaengige UI-Konventionen, die die "Heute"-Regel auf jeder Seite verankern:

- **Heute-faellig-Badge** - jeder Listeneintrag mit `due_date` = heute traegt eine einheitliche Hervorhebung; ueberfaellige Eintraege einen roten Alert-Marker.
- **Follow-up-Hinweis** - Objekte, die auf eine Reaktion warten (Outreach ohne Antwort, Termin ohne Nachbereitung), zeigen ein eigenes Follow-up-Label mit Faelligkeit.
- **Verantwortlichkeits-Anzeige** - jede Zeile zeigt Owner bzw. Bearbeiter (`owner_id`/`assigned_to`) als Avatar/Name; "mir zugewiesen" ist filterbar.
- **Naechster-Schritt-Button** - jede Detailansicht hat genau eine hervorgehobene Primaer-Aktion ("Status setzen", "Versenden", "Abschliessen") statt nur Anzeige.
- **Deadline-Leiste** - kommende harte Termine (`_date`/`due_date`) erscheinen als kompakte, sortierte Leiste im Bereichs-Header.
- **Alert-Zone** - kritische Zustaende (`overdue`, `blocked`, `error`, `expired`, Churn-Risiko) werden oben gesammelt und sind nie hinter Klicks versteckt.
- **Engine-Eingangskorb** - von AI-Engines erzeugte `opportunities`/`tasks` erscheinen als handlungsbereite Vorschlaege mit Annehmen/Verwerfen, nicht als blosse Berichte.

So gilt fuer jede der sieben Bereiche dieselbe Erfahrung: Wer eine Seite oeffnet, sieht zuerst, **was heute zu tun ist, wer dafuer zustaendig ist und mit welchem Klick es erledigt wird** - operativ statt nur analytisch, ueberall nach demselben Muster.
