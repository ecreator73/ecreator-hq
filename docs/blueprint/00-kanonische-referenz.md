# eCreator OS - Kanonische Referenz (Prompt 0)

> Verbindliche Grundlage fuer alle weiteren Blueprint-Abschnitte. Alle nachfolgenden Prompts MUESSEN exakt die hier definierten Namen (Tabellen, Rollen, Module, Engines, Phasen, Status-Werte, Routen) verwenden. Bei Konflikten gilt immer dieses Dokument.

---

## 1. Vision in einem Satz

**eCreator OS ist das interne Betriebssystem der eCreator GmbH, das den gesamten Geschaeftsablauf - von der Leadgewinnung ueber Verkauf, Kundenbetreuung und Produktion bis zu Finanzen - in einer einzigen, vollstaendig verbundenen Plattform buendelt und jeden Mitarbeitenden taeglich operativ fuehrt.**

### Leitprinzipien

1. **Eine Plattform. Eine Datenbank. Ein Login. Alles verbunden.** - Keine Insel-Tools, keine doppelte Datenpflege; jedes Objekt existiert genau einmal und ist mit allen relevanten Objekten verknuepft.
2. **"Was muss heute gemacht werden?"** - Jede Seite ist operativ und handlungsorientiert, nicht nur ein Analytics-Dashboard; der naechste Schritt ist immer sichtbar.
3. **Rollenbasiert & sicher by default** - Jeder sieht und tut nur, was seine Rolle erlaubt (Row Level Security, rollenbasierte Rechte, Audit Logs ohne Ausnahme).
4. **AI als operativer Co-Pilot** - KI-Engines erzeugen konkrete Aufgaben, Chancen und Entwuerfe, nicht nur Berichte; sie fuettern den Arbeitsfluss, ersetzen ihn aber nicht.
5. **Schweizer Qualitaet & Compliance** - Sachlich, vertrauenswuerdig, DSG-konform; sauberer Audit-Trail und nachvollziehbare Datenherkunft.

---

## 2. Hauptnavigation (final)

Sieben Bereiche. Beschriftung in Deutsch, technischer Pfad in englisch/kebab-case.

### Home - `/`
- Mein Tag (Dashboard) - `/`
- Meine Aufgaben - `/my-tasks`
- Benachrichtigungen - `/notifications`
- Aktivitaetsverlauf - `/activity`

### Sales - `/sales`
- Pipeline - `/sales/pipeline`
- Leads - `/sales/leads`
- Opportunities - `/sales/opportunities`
- Angebote - `/sales/offers`
- Outreach - `/sales/outreach`
- Termine - `/sales/meetings`

### Clients - `/clients`
- Kundenuebersicht - `/clients`
- Kundenprofil - `/clients/[id]`
- Kontakte - `/clients/contacts`
- Vertraege - `/clients/contracts`
- Reporting-Calls - `/clients/reporting-calls`
- Upsell & Empfehlungen - `/clients/growth`

### Production - `/production`
- Projekte - `/production/projects`
- Aufgaben-Board - `/production/board`
- Content - `/production/content`
- Websites - `/production/websites`
- Ad-Kampagnen - `/production/ad-campaigns`
- CRM-Builds - `/production/crm-builds`
- Drehs - `/production/shoots`

### Operations - `/operations`
- Creator-Pool - `/operations/creators`
- Team & Auslastung - `/operations/team`
- Automationen - `/operations/automations`
- Dateien - `/operations/files`
- AI-Engines - `/operations/engines`

### Finance - `/finance`
- Finanzuebersicht - `/finance`
- Rechnungen - `/finance/invoices`
- Ausgaben - `/finance/expenses`
- Vertragswerte (MRR/ARR) - `/finance/recurring`
- Berichte - `/finance/reports`

### Settings - `/settings`
- Organisation - `/settings/organization`
- Benutzer - `/settings/users`
- Rollen & Rechte - `/settings/roles`
- Integrationen - `/settings/integrations`
- Audit Logs - `/settings/audit`
- Mein Profil - `/settings/profile`

---

## 3. Rollenmodell (9 Rollen)

| Rolle | Schluessel (Code) | Zweck (1 Satz) |
| --- | --- | --- |
| Super Admin | `super_admin` | Technischer Vollzugriff inkl. Organisation, Rollen, Integrationen und Audit Logs; verwaltet die Plattform selbst. |
| CEO | `ceo` | Geschaeftsfuehrung mit lesendem Vollblick auf alle Bereiche plus strategische Steuerung von Zielen und Genehmigungen. |
| CSO | `cso` | Verantwortet Vertrieb und Wachstum: steuert Pipeline, Opportunities und Sales-Team end-to-end. |
| Sales | `sales` | Bearbeitet Leads, Angebote und Outreach und treibt Deals bis zum Abschluss. |
| Project Manager | `project_manager` | Plant und koordiniert Projekte, Aufgaben und Liefertermine ueber alle Produktionsgewerke hinweg. |
| Developer | `developer` | Setzt Website- und CRM-Builds technisch um und pflegt die zugehoerigen Aufgaben. |
| Creative | `creative` | Produziert Content, Skripte und Drehs (Video/Foto/Design) und arbeitet eng mit dem Creator-Pool. |
| Finance | `finance` | Verwaltet Rechnungen, Ausgaben, wiederkehrende Umsaetze und finanzielle Berichte. |
| Viewer | `viewer` | Reiner Lesezugriff auf freigegebene Bereiche, ohne Bearbeitungs- oder Loeschrechte. |

---

## 4. Datenmodell - kanonische Tabellenliste

Konvention: alle Tabellen `snake_case`, Plural. 27 Kern-Tabellen, nach Domaene gruppiert und durchnummeriert. Danach klar markierte Hilfstabellen.

### Domaene A - Identitaet & Zugriff
| # | Tabelle | Zweck (Halbsatz) |
| --- | --- | --- |
| 1 | `users` | alle Mitarbeitenden-Konten mit Authentifizierung und Stammdaten |
| 2 | `roles` | definierte Rollen (die 9 Rollen aus Abschnitt 3) |
| 3 | `permissions` | granulare Rechte, die Rollen zugeordnet werden |

### Domaene B - Sales & Akquise
| # | Tabelle | Zweck (Halbsatz) |
| --- | --- | --- |
| 4 | `leads` | potenzielle Kunden vor dem Abschluss, inkl. Quelle und Status |
| 5 | `opportunities` | konkrete Wachstums-/Verkaufschancen aus AI-Engines oder manuell |
| 6 | `offers` | Angebote/Proposals mit Positionen, Wert und Status |
| 7 | `outreach_emails` | versendete bzw. entworfene 1:1-Akquise-Mails inkl. Tracking |

### Domaene C - Kunden & Beziehung
| # | Tabelle | Zweck (Halbsatz) |
| --- | --- | --- |
| 8 | `clients` | aktive Kunden (aus gewonnenen Leads) mit Vertragskontext |
| 9 | `contacts` | Ansprechpersonen zu Leads und Kunden |
| 10 | `contracts` | laufende Vertraege inkl. Laufzeit, Leistungen und Wert |
| 11 | `meetings` | Termine/Gespraeche (Sales- wie Kundentermine) mit Teilnehmern |
| 12 | `reporting_calls` | wiederkehrende Reporting-/Review-Calls mit Kunden |

### Domaene D - Produktion & Lieferung
| # | Tabelle | Zweck (Halbsatz) |
| --- | --- | --- |
| 13 | `projects` | Kundenprojekte als zentrale Lieferklammer |
| 14 | `tasks` | Aufgaben innerhalb von Projekten (Kern des Task-Systems) |
| 15 | `subtasks` | Teilaufgaben/Checklistenpunkte zu einer Aufgabe |
| 16 | `content_items` | einzelne Content-Stuecke (Posts, Reels, Captions, Skripte) |
| 17 | `creators` | externe/interne Creator im Pool (Talente fuer Drehs/Content) |
| 18 | `shoots` | geplante und durchgefuehrte Foto-/Video-Drehs |
| 19 | `websites` | Website-Projekte/-Builds pro Kunde |
| 20 | `ad_campaigns` | bezahlte Werbekampagnen (Meta/Google/TikTok) pro Kunde |
| 21 | `crm_builds` | CRM-/Automations-Aufbauten als Lieferleistung pro Kunde |

### Domaene E - Operations & Dateien
| # | Tabelle | Zweck (Halbsatz) |
| --- | --- | --- |
| 22 | `files` | im Storage abgelegte Dateien mit Verknuepfung zu Objekten |
| 23 | `automations` | konfigurierte interne Automationsregeln und ihre Laeufe |

### Domaene F - Finanzen
| # | Tabelle | Zweck (Halbsatz) |
| --- | --- | --- |
| 24 | `expenses` | betriebliche Ausgaben inkl. Kategorie und Beleg |
| 25 | `invoices` | ausgehende Rechnungen mit Status und Zahlungsdaten |

### Domaene G - Audit & Aktivitaet
| # | Tabelle | Zweck (Halbsatz) |
| --- | --- | --- |
| 26 | `audits` | revisionssicherer Audit-Trail aller sicherheitsrelevanten Aktionen |
| 27 | `activity_logs` | fachliche Aktivitaets-Feed-Eintraege fuer den Verlauf je Objekt |

### Hilfstabellen (klar markiert)
| Tabelle | Zweck (Halbsatz) |
| --- | --- |
| `notifications` | personenbezogene In-App-Benachrichtigungen mit Lese-Status |
| `tags` | wiederverwendbare Schlagworte zur Klassifizierung |
| `taggables` | polymorphe Zuordnung von `tags` zu beliebigen Objekten |
| `comments` | Kommentare/Notizen an beliebigen Objekten (polymorph) |
| `project_members` | Zuordnung von `users` zu `projects` inkl. Projektrolle |
| `attachments` | Verknuepfung von `files` zu einzelnen Objekten (polymorph) |
| `integrations` | verbundene Drittsysteme inkl. Zugangsdaten/Status |
| `webhooks` | ein-/ausgehende Webhook-Endpunkte fuer Integrationen |

> Die Hilfstabellen sind verbindlicher Bestandteil des Modells, gehoeren aber nicht zu den 27 Kern-Tabellen.

---

## 5. AI Engines (12)

| Engine | Funktion (Halbsatz) |
| --- | --- |
| Lead Engine | findet und qualifiziert neue Leads und speist `leads` |
| Website Audit Engine | analysiert Kunden-/Prospect-Websites und erzeugt Befunde und Opportunities |
| Ads Opportunity Engine | erkennt ungenutztes Werbe-Potenzial und schlaegt Kampagnen-Chancen vor |
| Content Opportunity Engine | identifiziert Content-Luecken und liefert Themen-/Format-Chancen |
| Recruiting Opportunity Engine | findet passende Creator/Talente fuer den Creator-Pool |
| CRM Automation Opportunity Engine | deckt automatisierbare Kundenprozesse auf und schlaegt CRM-Builds vor |
| Outreach Engine | erstellt personalisierte 1:1-Outreach-Entwuerfe (manueller Versand) |
| Proposal Generator | generiert massgeschneiderte Angebote/Proposals aus Lead- und Bedarfsdaten |
| Content Script Generator | erzeugt Skripte und Captions fuer Content-Items und Drehs |
| Meeting Assistant | bereitet Termine vor, transkribiert/fasst zusammen und erzeugt Folgeaufgaben |
| Upsell Engine | erkennt Upsell-/Cross-Sell-Potenzial bei Bestandskunden |
| Referral Engine | identifiziert Empfehlungs-Chancen und steuert Referral-Anfragen |

---

## 6. Kernmodule

| Modul | Bereich | Aufgabe (Halbsatz) | Wichtigste Kern-Tabellen |
| --- | --- | --- | --- |
| Home | `/` | persoenlicher operativer Einstieg: "Was muss ich heute tun?" | `tasks`, `notifications`, `activity_logs` |
| Sales | `/sales` | Akquise und Verkauf von Lead bis Abschluss | `leads`, `opportunities`, `offers`, `outreach_emails`, `meetings` |
| Clients | `/clients` | Betreuung, Vertraege und Wachstum von Bestandskunden | `clients`, `contacts`, `contracts`, `reporting_calls` |
| Production | `/production` | Lieferung aller Leistungen (Content, Web, Ads, CRM, Drehs) | `projects`, `tasks`, `subtasks`, `content_items`, `websites`, `ad_campaigns`, `crm_builds`, `shoots` |
| Operations | `/operations` | interne Steuerung: Creator-Pool, Auslastung, Automationen, AI-Engines, Dateien | `creators`, `automations`, `files`, `integrations` |
| Finance | `/finance` | Rechnungen, Ausgaben, wiederkehrende Umsaetze und Berichte | `invoices`, `expenses`, `contracts` |
| Settings | `/settings` | Organisation, Benutzer, Rollen/Rechte, Integrationen, Audit | `users`, `roles`, `permissions`, `integrations`, `audits` |

---

## 7. Umsetzungsphasen (10)

| Phase | Name | Inhalt (Halbsatz) | Liefert (Kern-Tabellen/Module) |
| --- | --- | --- | --- |
| 1 | Foundation / Auth / Rollen / Layout | Projekt-Setup, Supabase Auth, Rollen, RLS-Grundgeruest, App-Shell/Navigation | `users`, `roles`, `permissions` |
| 2 | Core Database Model | vollstaendiges Datenmodell, Beziehungen, Hilfstabellen, Audit-Basis | alle 27 Kern-Tabellen + Hilfstabellen |
| 3 | Task System | operatives Aufgaben-System inkl. Subtasks und "Mein Tag" | `tasks`, `subtasks`, Home-Modul |
| 4 | Sales CRM | Pipeline, Leads, Opportunities, Angebote, Outreach, Termine | `leads`, `opportunities`, `offers`, `outreach_emails`, `meetings` |
| 5 | Client Management | Kunden, Kontakte, Vertraege, Reporting-Calls | `clients`, `contacts`, `contracts`, `reporting_calls` |
| 6 | Production Module | Projekte, Content, Websites, Ads, CRM-Builds | `projects`, `content_items`, `websites`, `ad_campaigns`, `crm_builds` |
| 7 | Creator Pool | Creator-Verwaltung und Drehplanung | `creators`, `shoots` |
| 8 | Finance | Rechnungen, Ausgaben, wiederkehrende Umsaetze, Berichte | `invoices`, `expenses` |
| 9 | AI Engines | Anbindung der 12 Engines, die Aufgaben/Opportunities erzeugen | `opportunities`, `automations` |
| 10 | Automationen | interne Automationsregeln, Cron Jobs, Webhooks, Benachrichtigungen | `automations`, `webhooks`, `notifications` |

---

## 8. Namens- & Status-Konventionen (verbindlich)

### Tabellen
- `snake_case`, immer **Plural** (`leads`, `ad_campaigns`).
- Verknuepfungstabellen mit beiden Bezugsnamen oder polymorph (`project_members`, `taggables`).
- Polymorphe Beziehungen ueber Felder `<name>_type` + `<name>_id` (z.B. `taggable_type`, `taggable_id`).

### Felder
- `snake_case`, sprechend, ohne Tabellen-Praefix (`status`, nicht `lead_status_field`).
- Primaerschluessel: `id` (UUID).
- Fremdschluessel: `<singular>_id` (`client_id`, `project_id`, `lead_id`).
- Geldbetraege: Ganzzahl in Rappen, Feldname endet auf `_amount`, plus `currency` (Default `CHF`).
- Booleans mit `is_`/`has_` Praefix (`is_active`, `has_attachments`).
- Datumsfelder (ohne Zeit) enden auf `_date`, Zeitstempel auf `_at`.

### Zeitstempel
- Jede Tabelle: `created_at` (timestamptz, Default now) und `updated_at` (timestamptz, per Trigger gepflegt).
- Optional fachlich: `started_at`, `completed_at`, `sent_at`, `due_date`.

### Soft-Delete
- `deleted_at` (timestamptz, nullable) auf allen fachlichen Tabellen; `NULL` = aktiv.
- Standard-Abfragen filtern `deleted_at IS NULL`; harte Loeschung nur durch `super_admin`.

### Owner- & Zuweisungsfelder
- `owner_id` (FK auf `users`) = verantwortliche Person des Datensatzes.
- `assigned_to` (FK auf `users`) bei Aufgaben/Leistungen, wo Owner und Bearbeiter abweichen.
- `created_by` / `updated_by` (FK auf `users`) fuer Audit-Zwecke.

### Mandanten-/Org-Feld
- Single-Tenant (nur eCreator GmbH), aber zukunftssicher: jede fachliche Tabelle traegt `org_id` (FK auf `organizations`, Default = eCreator).
- Alle RLS-Policies basieren auf `org_id` + Rolle; so bleibt Multi-Tenancy spaeter ohne Modellbruch moeglich.

### Status-Enums (kanonische Werte)
| Enum | Tabelle(n) | Erlaubte Werte |
| --- | --- | --- |
| `lead_status` | `leads` | `new`, `contacted`, `qualified`, `proposal`, `won`, `lost` |
| `opportunity_status` | `opportunities` | `open`, `in_review`, `accepted`, `dismissed`, `expired` |
| `offer_status` | `offers` | `draft`, `sent`, `accepted`, `rejected`, `expired` |
| `client_status` | `clients` | `active`, `onboarding`, `paused`, `ended` |
| `contract_status` | `contracts` | `draft`, `active`, `expired`, `cancelled` |
| `project_status` | `projects` | `planned`, `active`, `on_hold`, `completed`, `cancelled` |
| `task_status` | `tasks`, `subtasks` | `todo`, `in_progress`, `review`, `done`, `blocked` |
| `priority` | `tasks`, `opportunities` | `low`, `medium`, `high`, `urgent` |
| `content_status` | `content_items` | `idea`, `scripting`, `production`, `review`, `published` |
| `shoot_status` | `shoots` | `planned`, `confirmed`, `shot`, `delivered`, `cancelled` |
| `campaign_status` | `ad_campaigns` | `draft`, `active`, `paused`, `completed` |
| `invoice_status` | `invoices` | `draft`, `sent`, `paid`, `overdue`, `cancelled` |
| `outreach_status` | `outreach_emails` | `draft`, `sent`, `replied`, `bounced` |
| `automation_status` | `automations` | `active`, `paused`, `error` |

> Enum-Werte sind in der Datenbank immer in **englisch, snake_case**; UI-Beschriftungen werden in der Praesentationsschicht ins Deutsche uebersetzt.

### Weitere Konventionen
- API-Routen: `/api/<resource>` in kebab-case, Plural.
- Server Actions: `verbResource` in camelCase (`createLead`, `updateProjectStatus`).
- Jede schreibende Aktion erzeugt einen Eintrag in `audits` (wer, was, wann, alt/neu).
- Jede sichtbare Statusaenderung erzeugt einen Eintrag in `activity_logs`.
