# 5 Datenmodell - Teil 2 (Erweiterte Entitaeten & Hilfstabellen)

Dieser Abschnitt setzt das Datenmodell aus Teil 1 (Identitaet, Sales-Kern, Kunden-Kern, Projekt-/Task-Kern) fort und beschreibt die **erweiterten fachlichen Entitaeten** der Domaenen Produktion, Operations, Finanzen, Sales-Akquise sowie den **Audit-/Aktivitaets-Layer**. Anschliessend werden die **Hilfstabellen** der kanonischen Referenz kompakt, aber vollstaendig dokumentiert. Den Abschluss bildet eine textuelle **Gesamt-ER-Uebersicht**.

Alle Tabellen folgen den verbindlichen Konventionen aus der kanonischen Referenz (Abschnitt 8):

- Primaerschluessel `id` (UUID), Fremdschluessel `<singular>_id`.
- Jede fachliche Tabelle traegt `org_id` (FK auf `organizations`, Default = eCreator) fuer zukunftssichere Mandantentrennung.
- Zeitstempel `created_at`, `updated_at` (Trigger-gepflegt); Soft-Delete via `deleted_at` (NULL = aktiv).
- Owner-/Audit-Felder `owner_id`, `assigned_to`, `created_by`, `updated_by` (FK auf `users`), wo fachlich sinnvoll.
- Geldbetraege als Ganzzahl in **Rappen**, Feldname endet auf `_amount`, plus `currency` (Default `CHF`).
- Enum-Werte in der DB englisch/`snake_case`; UI-Beschriftung erst in der Praesentationsschicht ins Deutsche uebersetzt.

> Die Felder `id`, `org_id`, `created_at`, `updated_at`, `deleted_at` werden im Folgenden als **Standardfelder** vorausgesetzt und nicht in jeder Feld-Tabelle wiederholt, ausser ihre Bedeutung weicht ab oder ist fachlich tragend.

---

## 5.1 Domaene D - Produktion & Lieferung (erweiterte Entitaeten)

Die Tabellen `projects`, `tasks`, `subtasks` und `content_items` wurden in Teil 1 behandelt. Hier folgen die **Lieferleistungs-Tabellen**, die jeweils an ein `project` und ueber dieses an einen `client` haengen, sowie der `creators`-Pool und die `shoots`.

### 5.1.1 `creators`

**Zweck.** Verwaltet den Pool interner und externer Creator/Talente (Video, Foto, Design, Schnitt, Voice), die fuer Drehs (`shoots`) und Content (`content_items`) eingesetzt werden. Der Creator-Pool ist die Stammdatenquelle des Bereichs Operations (`/operations/creators`) und wird u. a. von der **Recruiting Opportunity Engine** gespeist.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `display_name` | text | Anzeigename/Kuenstlername des Creators |
| `first_name` | text | Vorname (intern, fuer Vertraege/Abrechnung) |
| `last_name` | text | Nachname (intern) |
| `email` | text | Kontakt-E-Mail |
| `phone` | text | Telefon/Mobile |
| `type` | enum (`creator_type`) | Beziehungstyp: `internal`, `freelance`, `agency` |
| `disciplines` | text[] | Gewerke/Skills (z. B. `video`, `photo`, `editing`, `design`, `voice`) |
| `seniority` | text | Erfahrungsstufe (`junior`, `mid`, `senior`, `lead`) |
| `location` | text | Standort/Region fuer Einsatzplanung |
| `day_rate_amount` | integer (Rappen) | Tagessatz in Rappen |
| `hourly_rate_amount` | integer (Rappen) | Stundensatz in Rappen (optional) |
| `currency` | text | Waehrung der Saetze (Default `CHF`) |
| `portfolio_url` | text | Link zu Portfolio/Showreel |
| `rating` | numeric | interne Qualitaetsbewertung (1-5) |
| `availability_note` | text | Freitext zur Verfuegbarkeit |
| `status` | enum (`creator_status`) | Pool-Status: `prospect`, `active`, `inactive`, `blacklisted` |
| `user_id` | uuid (FK `users`, nullable) | verknuepftes Benutzerkonto, falls interner Creator |
| `source` | text | Herkunft (`recruiting_engine`, `referral`, `manual`) |
| `owner_id` | uuid (FK `users`) | verantwortlicher Talent-Manager |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

**Beziehungen.**
- 1:n zu `shoots` (ein Creator kann an vielen Drehs beteiligt sein; die n:m-Detailzuordnung erfolgt ueber die Hilfstabelle bzw. `shoot_assignees` - siehe Hinweis unten).
- 0/1:1 zu `users` (`user_id`), wenn ein interner Mitarbeitender zugleich Creator ist.
- Polymorph adressierbar von `content_items` (als ausfuehrender Creator) ueber `attachments`/`comments` sowie `tags`/`taggables`.
- Kann aus `opportunities` (Kategorie Recruiting) hervorgehen (`source = recruiting_engine`).

> Hinweis zur n:m-Zuordnung Creator↔Shoot: Da ein Dreh mehrere Creator hat und ein Creator mehrere Drehs, wird die Beteiligung ueber eine schlanke Zuordnung (Pattern `project_members`, hier sinngemaess `shoot_assignees` mit `shoot_id`, `creator_id`, `role`, `rate_amount`) modelliert. Diese folgt exakt der Verknuepfungstabellen-Konvention und gehoert konzeptionell zu den Hilfstabellen.

**Statusfelder/Enums.**
- `creator_status`: `prospect` (von Engine vorgeschlagen, noch nicht onboarded) → `active` → `inactive` (ruhend) / `blacklisted` (gesperrt).
- `creator_type`: `internal`, `freelance`, `agency`.

**Wichtige Indizes.**
- `(org_id, status)` fuer Pool-Filter im Operations-Modul.
- `(org_id, type)` und GIN-Index auf `disciplines` fuer Skill-basierte Suche.
- `user_id` (eindeutig, partiell wo nicht NULL) zur 1:1-Kopplung an `users`.

**Sicherheitsregeln (RLS).**
- Lesen: `super_admin`, `ceo`, `project_manager`, `creative` (volle Pool-Sicht); `cso`/`sales` lesend fuer Angebotskontext; `viewer` lesend auf freigegebene Felder.
- Schreiben/Anlegen: `creative`, `project_manager`, `super_admin`.
- Saetze (`day_rate_amount`, `hourly_rate_amount`) sind in der RLS-/Spaltenpolicy nur fuer `super_admin`, `ceo`, `finance`, `project_manager`, `creative` sichtbar - `viewer` sieht sie nicht.
- Harte Loeschung nur `super_admin`; sonst Soft-Delete. Jede Mutation erzeugt `audits`-Eintrag, jede Statusaenderung `activity_logs`-Eintrag.

### 5.1.2 `shoots`

**Zweck.** Plant und dokumentiert Foto-/Video-Drehs als Produktionsereignis. Ein Dreh gehoert zu einem Projekt/Kunden, hat einen Termin, einen Ort und beteiligte Creator. Sichtbar unter `/production/shoots`.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `title` | text | Bezeichnung des Drehs |
| `project_id` | uuid (FK `projects`) | zugehoeriges Projekt (Lieferklammer) |
| `client_id` | uuid (FK `clients`) | Kunde (denormalisiert fuer schnelle Filter) |
| `shoot_date` | date | geplantes/erfolgtes Drehdatum |
| `start_at` / `end_at` | timestamptz | konkrete Start-/Endzeit |
| `location` | text | Drehort/Adresse |
| `briefing` | text | Konzept/Briefing/Shotlist (Freitext) |
| `lead_creator_id` | uuid (FK `creators`, nullable) | verantwortlicher Creator vor Ort |
| `status` | enum (`shoot_status`) | Lebenszyklus des Drehs |
| `deliverables_count` | integer | geplante Anzahl Liefer-Assets |
| `assigned_to` | uuid (FK `users`, nullable) | koordinierender Mitarbeiter (PM/Creative) |
| `owner_id` | uuid (FK `users`) | verantwortliche Person |
| `completed_at` | timestamptz | Zeitpunkt der Lieferung/Fertigstellung |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

**Beziehungen.**
- n:1 zu `projects` und (denormalisiert) zu `clients`.
- n:1 zu `creators` ueber `lead_creator_id`; n:m zu `creators` ueber `shoot_assignees`.
- 1:n zu `content_items` (aus einem Dreh entstehen mehrere Content-Stuecke).
- 1:n zu `files`/`attachments` (Rohmaterial, finale Assets).
- Optionaler Bezug zu `meetings` (Vorbereitungstermin) und `tasks` (Produktionsaufgaben).

**Statusfelder/Enums.**
- `shoot_status`: `planned` → `confirmed` → `shot` → `delivered`; Abbruch jederzeit nach `cancelled`.

**Wichtige Indizes.**
- `(org_id, shoot_date)` fuer Kalender-/Planungsansichten.
- `(org_id, status)` fuer Board-Filter.
- `project_id`, `client_id`, `lead_creator_id` als FK-Indizes.

**Sicherheitsregeln (RLS).**
- Lesen: `super_admin`, `ceo`, `project_manager`, `creative`; `cso`/`sales` lesend im Kundenkontext; `viewer` lesend.
- Schreiben: `creative`, `project_manager`, `super_admin`. `finance` nur lesend (fuer Kostenbezug ueber `expenses`).
- Mutationen → `audits`; Statuswechsel → `activity_logs` (z. B. `confirmed`, `delivered`).

### 5.1.3 `websites`

**Zweck.** Fuehrt Website-Projekte/-Builds pro Kunde als eigene Lieferleistung. Spiegelt den Lebenszyklus von Konzept ueber Entwicklung bis Go-Live und Wartung. Sichtbar unter `/production/websites`; technisch bearbeitet von der Rolle `developer`.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `name` | text | Projektname der Website |
| `project_id` | uuid (FK `projects`) | uebergeordnetes Projekt |
| `client_id` | uuid (FK `clients`) | Kunde (denormalisiert) |
| `domain` | text | Ziel-Domain/URL |
| `platform` | text | Technologie/CMS (`nextjs`, `webflow`, `wordpress`, …) |
| `environment_url` | text | Staging-/Preview-URL |
| `repo_url` | text | Code-Repository (falls vorhanden) |
| `status` | enum (`website_status`) | Build-Status (siehe unten) |
| `go_live_date` | date | geplantes/erfolgtes Go-Live-Datum |
| `launched_at` | timestamptz | tatsaechlicher Live-Zeitpunkt |
| `lead_developer_id` | uuid (FK `users`, nullable) | verantwortlicher Entwickler |
| `assigned_to` | uuid (FK `users`, nullable) | aktueller Bearbeiter |
| `owner_id` | uuid (FK `users`) | verantwortliche Person (i. d. R. PM) |
| `audit_id` | uuid (FK `audits`-Domaene? → siehe Hinweis) | Bezug zu auslösendem Website-Audit-Befund |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

> Hinweis: Der fachliche Befund der **Website Audit Engine** wird ueber `opportunities` (Kategorie `website_audit`) bzw. die dedizierte Befund-Tabelle abgebildet (siehe 5.4.3 `audits` als Sicherheits-Audit vs. fachliche Befunde). Der Build referenziert die ausloesende `opportunity` per `opportunity_id`, nicht den Sicherheits-Audit-Trail.

| Feld (ergaenzt) | Typ | Zweck |
| --- | --- | --- |
| `opportunity_id` | uuid (FK `opportunities`, nullable) | ausloesende Chance (Audit-/Akquise-Herkunft) |

**Beziehungen.**
- n:1 zu `projects`, `clients`.
- 1:n zu `tasks` (Entwicklungsaufgaben), `files`/`attachments` (Assets, Exporte), `comments`.
- 0/1:1 zu `opportunities` als Herkunft.

**Statusfelder/Enums.**
- `website_status` (build-spezifisch, kanonisch konsistent zu Produktions-Lebenszyklen): `discovery`, `design`, `development`, `review`, `live`, `maintenance`, `archived`.

**Wichtige Indizes.**
- `(org_id, status)`, `(org_id, go_live_date)`.
- `project_id`, `client_id`, `lead_developer_id` als FK-Indizes.
- eindeutiger Index auf `domain` (partiell, wo nicht NULL) zur Vermeidung von Doubletten.

**Sicherheitsregeln (RLS).**
- Lesen: `super_admin`, `ceo`, `project_manager`, `developer`; `cso`/`sales` im Kundenkontext; `viewer` lesend.
- Schreiben: `developer`, `project_manager`, `super_admin`.
- Mutationen → `audits`; Statuswechsel (insb. `live`) → `activity_logs`.

### 5.1.4 `ad_campaigns`

**Zweck.** Bildet bezahlte Werbekampagnen (Meta/Google/TikTok) pro Kunde als Lieferleistung ab - mit Budget, Laufzeit, Plattform und Performance-Kennzahlen. Sichtbar unter `/production/ad-campaigns`. Wird von der **Ads Opportunity Engine** mit Chancen gespeist.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `name` | text | Kampagnenname |
| `project_id` | uuid (FK `projects`) | uebergeordnetes Projekt |
| `client_id` | uuid (FK `clients`) | Kunde (denormalisiert) |
| `platform` | enum (`ad_platform`) | `meta`, `google`, `tiktok`, `linkedin`, `other` |
| `objective` | text | Kampagnenziel (Awareness, Leads, Sales …) |
| `budget_amount` | integer (Rappen) | Gesamt-/Periodenbudget in Rappen |
| `currency` | text | Waehrung (Default `CHF`) |
| `start_date` / `end_date` | date | Laufzeit |
| `status` | enum (`campaign_status`) | `draft`, `active`, `paused`, `completed` |
| `external_campaign_id` | text | ID im Werbekonto der Plattform |
| `integration_id` | uuid (FK `integrations`, nullable) | Quelle der Performance-Daten |
| `spend_amount` | integer (Rappen) | bisher ausgegebenes Budget |
| `impressions` | bigint | Auslieferungen (Performance) |
| `clicks` | bigint | Klicks |
| `conversions` | integer | gemessene Conversions |
| `roas` | numeric | Return on Ad Spend (abgeleitet) |
| `assigned_to` | uuid (FK `users`, nullable) | verantwortlicher Bearbeiter (Ads-Manager) |
| `owner_id` | uuid (FK `users`) | verantwortliche Person |
| `opportunity_id` | uuid (FK `opportunities`, nullable) | ausloesende Chance |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

**Beziehungen.**
- n:1 zu `projects`, `clients`.
- n:1 zu `integrations` (Datenquelle/Werbekonto).
- 0/1:1 zu `opportunities` (Herkunft `ads_opportunity_engine`).
- 1:n zu `tasks`, `files`/`attachments` (Creatives), `comments`.

**Statusfelder/Enums.**
- `campaign_status`: `draft` → `active` ↔ `paused` → `completed`.
- `ad_platform`: `meta`, `google`, `tiktok`, `linkedin`, `other`.

**Wichtige Indizes.**
- `(org_id, status)`, `(org_id, platform)`.
- `(client_id, start_date)` fuer Kundenkampagnen-Timeline.
- `external_campaign_id` (zur Deduplikation beim Sync), `integration_id`.

**Sicherheitsregeln (RLS).**
- Lesen: `super_admin`, `ceo`, `project_manager`, `creative` (Creatives), `cso`/`sales` (Kundenkontext); `finance` lesend fuer Budgetbezug; `viewer` lesend.
- Schreiben: `project_manager`, `super_admin`; Performance-Felder zusaetzlich durch System/Automation (Service-Rolle) via Cron-Sync.
- Budget-/Spend-Felder in Spaltenpolicy nur fuer `super_admin`, `ceo`, `finance`, `project_manager`.
- Mutationen → `audits`; Statuswechsel → `activity_logs`.

### 5.1.5 `crm_builds`

**Zweck.** Beschreibt CRM-/Automations-Aufbauten als Lieferleistung pro Kunde (z. B. HubSpot-/Pipeline-Setups, Lead-Routing, Mail-Automationen). Sichtbar unter `/production/crm-builds`. Wird von der **CRM Automation Opportunity Engine** gespeist und technisch von `developer`/`project_manager` umgesetzt.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `name` | text | Bezeichnung des CRM-/Automations-Aufbaus |
| `project_id` | uuid (FK `projects`) | uebergeordnetes Projekt |
| `client_id` | uuid (FK `clients`) | Kunde (denormalisiert) |
| `target_system` | text | Zielsystem (`hubspot`, `pipedrive`, `make`, `zapier`, …) |
| `scope` | text | Umfang/Anforderung (Freitext) |
| `status` | enum (`crm_build_status`) | Build-Status (siehe unten) |
| `integration_id` | uuid (FK `integrations`, nullable) | technische Verbindung zum Zielsystem |
| `go_live_date` | date | geplantes Aktivierungsdatum |
| `delivered_at` | timestamptz | Lieferzeitpunkt |
| `lead_developer_id` | uuid (FK `users`, nullable) | verantwortlicher Umsetzer |
| `assigned_to` | uuid (FK `users`, nullable) | aktueller Bearbeiter |
| `owner_id` | uuid (FK `users`) | verantwortliche Person |
| `opportunity_id` | uuid (FK `opportunities`, nullable) | ausloesende Chance |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

**Beziehungen.**
- n:1 zu `projects`, `clients`.
- n:1 zu `integrations`.
- 0/1:1 zu `opportunities` (Herkunft `crm_automation_opportunity_engine`).
- 1:n zu `tasks`, `files`/`attachments`, `comments`.
- Konzeptionelle Naehe zu `automations`: Ein `crm_build` ist die **Kunden-Lieferleistung**, `automations` sind **interne** Regeln von eCreator OS - sie werden nicht vermischt.

**Statusfelder/Enums.**
- `crm_build_status`: `discovery`, `design`, `build`, `testing`, `live`, `maintenance`, `archived`.

**Wichtige Indizes.**
- `(org_id, status)`, `(client_id, go_live_date)`.
- `project_id`, `integration_id`, `lead_developer_id` als FK-Indizes.

**Sicherheitsregeln (RLS).**
- Lesen: `super_admin`, `ceo`, `project_manager`, `developer`; `cso`/`sales` im Kundenkontext; `viewer` lesend.
- Schreiben: `developer`, `project_manager`, `super_admin`.
- Zugangsdaten zum Zielsystem werden **nicht** in `crm_builds`, sondern in `integrations` (verschluesselt) gehalten.
- Mutationen → `audits`; Statuswechsel → `activity_logs`.

---

## 5.2 Domaene E - Operations & Dateien (erweiterte Entitaeten)

### 5.2.1 `files`

**Zweck.** Zentrales Verzeichnis aller im Supabase Storage abgelegten Dateien (Vertraege, Creatives, Exporte, Belege, Showreels). `files` ist die **Stammtabelle** der Datei; die polymorphe Verknuepfung zu Fachobjekten erfolgt ueber die Hilfstabelle `attachments`. Sichtbar unter `/operations/files`.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `name` | text | Anzeigename der Datei |
| `storage_path` | text | Pfad/Key im Storage-Bucket |
| `bucket` | text | Storage-Bucket (z. B. `client-assets`, `invoices`) |
| `mime_type` | text | Inhaltstyp (z. B. `image/png`, `application/pdf`) |
| `size_bytes` | bigint | Dateigroesse in Byte |
| `checksum` | text | Hash zur Integritaets-/Duplikatpruefung |
| `is_public` | boolean | ob ueber signierte/oeffentliche URL erreichbar |
| `client_id` | uuid (FK `clients`, nullable) | optionaler direkter Kundenbezug |
| `project_id` | uuid (FK `projects`, nullable) | optionaler direkter Projektbezug |
| `uploaded_by` | uuid (FK `users`) | hochladende Person |
| `owner_id` | uuid (FK `users`) | verantwortliche Person |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

**Beziehungen.**
- 1:n zu `attachments` (polymorphe Anbindung an beliebige Objekte: `tasks`, `shoots`, `websites`, `ad_campaigns`, `invoices`, `expenses`, …).
- Optionaler direkter FK zu `clients`/`projects` fuer haeufige Direktzugriffe (Performance).
- n:1 zu `users` (`uploaded_by`).

**Statusfelder/Enums.**
- Kein klassisches Status-Enum; Lebenszyklus ueber `deleted_at` (Soft-Delete) und `is_public`.

**Wichtige Indizes.**
- `(org_id, bucket)`, `(org_id, mime_type)`.
- `client_id`, `project_id` (partiell, wo nicht NULL).
- `checksum` zur Duplikaterkennung.

**Sicherheitsregeln (RLS).**
- Lesen: rollen- und objektabhaengig - eine Datei ist sichtbar, wenn die Person das **verknuepfte Objekt** sehen darf (Join ueber `attachments`) oder direkter Kunden-/Projektbezug es erlaubt. `super_admin`/`ceo` sehen alles.
- Schreiben/Upload: alle bearbeitenden Rollen im Rahmen ihres Objektzugriffs; Loeschen (hart) nur `super_admin`.
- Storage-Bucket-Policies spiegeln die DB-RLS (signierte URLs, keine offenen Buckets fuer vertrauliche Inhalte wie `invoices`).
- Mutationen → `audits`.

### 5.2.2 `automations`

**Zweck.** Konfiguration und Laufprotokoll **interner** Automationsregeln von eCreator OS (Trigger → Bedingung → Aktion), die ueber Cron Jobs und Webhooks ausgefuehrt werden. Speist u. a. `notifications` und `tasks`. Sichtbar unter `/operations/automations`. Abzugrenzen von `crm_builds` (= Kunden-Lieferleistung).

| Feld | Typ | Zweck |
| --- | --- | --- |
| `name` | text | sprechender Name der Automation |
| `description` | text | Zweck/Beschreibung |
| `trigger_type` | enum (`automation_trigger`) | Ausloeser: `schedule`, `event`, `webhook`, `manual` |
| `trigger_config` | jsonb | Trigger-Parameter (Cron-Ausdruck, Event-Name, Filter) |
| `action_type` | text | auszufuehrende Aktion (`create_task`, `send_notification`, `send_webhook`, `update_record`) |
| `action_config` | jsonb | Aktions-Parameter (Vorlage, Zielobjekt, Mapping) |
| `engine` | text (nullable) | zugeordnete AI Engine, falls von Engine ausgeloest |
| `status` | enum (`automation_status`) | `active`, `paused`, `error` |
| `is_active` | boolean | Schnellschalter (zusaetzlich zum Status) |
| `last_run_at` | timestamptz | Zeitpunkt des letzten Laufs |
| `last_run_status` | text | Ergebnis des letzten Laufs (`success`, `error`) |
| `last_error` | text | Fehlertext des letzten fehlgeschlagenen Laufs |
| `run_count` | integer | Anzahl bisheriger Laeufe |
| `owner_id` | uuid (FK `users`) | verantwortliche Person |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

**Beziehungen.**
- 1:n zu `webhooks` (eine Automation kann Webhooks ausloesen/empfangen).
- erzeugt (logisch) Datensaetze in `tasks`, `notifications`, `activity_logs`.
- optionaler Bezug zu einer AI Engine ueber `engine` (Wert aus der kanonischen Engine-Liste).

**Statusfelder/Enums.**
- `automation_status`: `active` ↔ `paused`; `error` (gesetzt, wenn der letzte Lauf fehlschlug und ein Eingriff noetig ist).
- `automation_trigger`: `schedule`, `event`, `webhook`, `manual`.

**Wichtige Indizes.**
- `(org_id, status)`, `(org_id, trigger_type)`.
- `last_run_at` fuer Monitoring/Health-Ansicht.

**Sicherheitsregeln (RLS).**
- Lesen: `super_admin`, `ceo`, `project_manager` (operativer Ueberblick); `viewer` nur, wenn freigegeben.
- Schreiben/Konfigurieren: `super_admin` (und `project_manager` fuer fachliche Regeln im eigenen Bereich).
- Ausfuehrung erfolgt durch die **Service-Rolle** (Cron/Server), die RLS gezielt umgeht, dabei aber jeden Lauf in `audits`/`activity_logs` protokolliert.
- `trigger_config`/`action_config` koennen sensible Referenzen enthalten → nur fuer `super_admin` voll sichtbar.

---

## 5.3 Domaene F - Finanzen (erweiterte Entitaeten)

### 5.3.1 `expenses`

**Zweck.** Erfasst betriebliche Ausgaben (Tools, Werbebudgets, Freelancer-Honorare, Spesen) inkl. Kategorie und Beleg. Sichtbar unter `/finance/expenses`. Verantwortet von der Rolle `finance`.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `title` | text | Bezeichnung der Ausgabe |
| `category` | enum (`expense_category`) | Kostenart (siehe unten) |
| `amount` (`gross_amount`) | integer (Rappen) | Bruttobetrag in Rappen |
| `net_amount` | integer (Rappen) | Nettobetrag (ohne MwSt.) |
| `vat_amount` | integer (Rappen) | MwSt.-Betrag |
| `currency` | text | Waehrung (Default `CHF`) |
| `expense_date` | date | Belegdatum |
| `vendor` | text | Lieferant/Empfaenger |
| `payment_method` | text | Zahlungsart (`card`, `bank_transfer`, `cash`) |
| `is_billable` | boolean | an Kunde weiterverrechenbar |
| `client_id` | uuid (FK `clients`, nullable) | Kundenbezug (bei billable/Projektkosten) |
| `project_id` | uuid (FK `projects`, nullable) | Projektbezug |
| `campaign_id` | uuid (FK `ad_campaigns`, nullable) | Bezug zu Werbeausgabe |
| `creator_id` | uuid (FK `creators`, nullable) | Bezug zu Freelancer-Honorar |
| `status` | enum (`expense_status`) | `pending`, `approved`, `reimbursed`, `rejected` |
| `approved_by` | uuid (FK `users`, nullable) | genehmigende Person |
| `receipt_file_id` | uuid (FK `files`, nullable) | Belegdatei |
| `owner_id` | uuid (FK `users`) | erfassende/verantwortliche Person |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

**Beziehungen.**
- optionale FKs zu `clients`, `projects`, `ad_campaigns`, `creators` (Kostenherkunft).
- n:1 zu `files` (`receipt_file_id`) und n:1 zu `users` (`approved_by`).

**Statusfelder/Enums.**
- `expense_status`: `pending` → `approved` → `reimbursed`; alternativ `rejected`.
- `expense_category`: `tools_software`, `ad_spend`, `freelancer`, `travel`, `office`, `other`.

**Wichtige Indizes.**
- `(org_id, expense_date)`, `(org_id, category)`, `(org_id, status)`.
- `client_id`, `project_id`, `campaign_id` (partiell).

**Sicherheitsregeln (RLS).**
- Lesen: `super_admin`, `ceo`, `finance` (vollstaendig); `project_manager` lesend fuer eigene Projektkosten.
- Schreiben/Erfassen: `finance`, `super_admin`; Genehmigung (`approved`/`rejected`) durch `finance`/`ceo` (Vier-Augen je nach Betragsschwelle).
- Andere Rollen sehen keine Ausgaben (Finanzdaten vertraulich).
- Mutationen → `audits`; Genehmigungen/Statuswechsel → `activity_logs`.

### 5.3.2 `invoices`

**Zweck.** Verwaltet ausgehende Rechnungen mit Positionen, Status und Zahlungsdaten. Bildet zusammen mit `contracts` die Grundlage fuer MRR/ARR und Finanzberichte. Sichtbar unter `/finance/invoices`.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `invoice_number` | text | fortlaufende, eindeutige Rechnungsnummer |
| `client_id` | uuid (FK `clients`) | Rechnungsempfaenger (Kunde) |
| `contract_id` | uuid (FK `contracts`, nullable) | zugrunde liegender Vertrag |
| `project_id` | uuid (FK `projects`, nullable) | Projektbezug |
| `issue_date` | date | Rechnungsdatum |
| `due_date` | date | Faelligkeitsdatum |
| `net_amount` | integer (Rappen) | Nettosumme |
| `vat_amount` | integer (Rappen) | MwSt.-Betrag |
| `total_amount` | integer (Rappen) | Bruttosumme (zahlungsrelevant) |
| `currency` | text | Waehrung (Default `CHF`) |
| `status` | enum (`invoice_status`) | `draft`, `sent`, `paid`, `overdue`, `cancelled` |
| `line_items` | jsonb | Rechnungspositionen (Beschreibung, Menge, Einzelpreis) |
| `sent_at` | timestamptz | Versandzeitpunkt |
| `paid_at` | timestamptz | Zahlungseingang |
| `payment_reference` | text | Zahlungs-/QR-Referenz |
| `pdf_file_id` | uuid (FK `files`, nullable) | generiertes Rechnungs-PDF |
| `owner_id` | uuid (FK `users`) | verantwortliche Person |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

**Beziehungen.**
- n:1 zu `clients` (Pflicht), optional zu `contracts` und `projects`.
- n:1 zu `files` (`pdf_file_id`).
- Quelle fuer Finanzberichte; `overdue` kann eine `automation` (Mahnlauf) und `notifications` ausloesen.

**Statusfelder/Enums.**
- `invoice_status`: `draft` → `sent` → `paid`; `overdue` (Faelligkeit ueberschritten, automatisch durch Cron); `cancelled`.

**Wichtige Indizes.**
- eindeutiger Index auf `(org_id, invoice_number)`.
- `(org_id, status)`, `(org_id, due_date)` fuer offene/ueberfaellige Posten.
- `client_id`, `contract_id` als FK-Indizes.

**Sicherheitsregeln (RLS).**
- Lesen: `super_admin`, `ceo`, `finance` (vollstaendig); `cso` lesend auf aggregierte Werte des eigenen Kunden (eingeschraenkt).
- Schreiben/Versenden/Statuswechsel: `finance`, `super_admin`. Stornierung (`cancelled`) protokollpflichtig.
- Andere Rollen ohne Zugriff.
- Mutationen → `audits`; Statuswechsel (`sent`, `paid`, `overdue`, `cancelled`) → `activity_logs`.

---

## 5.4 Sales-Akquise & Audit-/Aktivitaets-Layer (erweiterte Entitaeten)

### 5.4.1 `outreach_emails`

**Zweck.** Erfasst entworfene und versendete **1:1-Akquise-Mails** inkl. Tracking. Erzeugt von der **Outreach Engine** (Entwurf), Versand bleibt manuell (DSG-/UWG-konform: keine automatisierte Massenwerbung). Sichtbar unter `/sales/outreach`.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `lead_id` | uuid (FK `leads`, nullable) | adressierter Lead |
| `contact_id` | uuid (FK `contacts`, nullable) | konkrete Ansprechperson |
| `opportunity_id` | uuid (FK `opportunities`, nullable) | zugrunde liegende Chance |
| `to_email` | text | Empfaengeradresse |
| `subject` | text | Betreff |
| `body` | text | Mail-Text (personalisiert) |
| `status` | enum (`outreach_status`) | `draft`, `sent`, `replied`, `bounced` |
| `generated_by_engine` | boolean | von Outreach Engine erzeugter Entwurf |
| `sent_at` | timestamptz | manueller Versandzeitpunkt |
| `replied_at` | timestamptz | Zeitpunkt der Antwort |
| `opened_at` | timestamptz | erstes Oeffnen (sofern getrackt) |
| `assigned_to` | uuid (FK `users`) | verantwortlicher Sales-Mitarbeiter |
| `owner_id` | uuid (FK `users`) | verantwortliche Person |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

**Beziehungen.**
- n:1 zu `leads`, `contacts`, `opportunities`.
- haengt am Sales-Funnel; Statuswechsel kann `tasks` (Follow-up) und `activity_logs` erzeugen.

**Statusfelder/Enums.**
- `outreach_status`: `draft` → `sent` → `replied`; `bounced` bei Zustellfehler.

**Wichtige Indizes.**
- `(org_id, status)`, `(org_id, sent_at)`.
- `lead_id`, `contact_id`, `opportunity_id`, `assigned_to` als FK-Indizes.

**Sicherheitsregeln (RLS).**
- Lesen/Schreiben: `sales`, `cso`, `super_admin`; `ceo` lesend.
- Sichtbarkeit i. d. R. auf eigene/zugewiesene Datensaetze beschraenkt (`assigned_to = auth.uid()` oder Rolle `cso`/`ceo`).
- Versand bleibt manuell; das System setzt `sent_at` nur auf explizite Nutzeraktion. Mutationen → `audits`.

### 5.4.2 `opportunities`

**Zweck.** Buendelt konkrete Wachstums-/Verkaufschancen aus den **AI Engines** (Website-Audit, Ads, Content, Recruiting, CRM-Automation, Upsell, Referral) oder manuell. Zentrale Verbindungsstelle zwischen Engines und operativem Arbeitsfluss. Sichtbar unter `/sales/opportunities` (und im Clients-Wachstum `/clients/growth`).

| Feld | Typ | Zweck |
| --- | --- | --- |
| `title` | text | Kurzbeschreibung der Chance |
| `description` | text | Detailbefund/Begruendung |
| `category` | enum (`opportunity_category`) | Herkunft/Art (siehe unten) |
| `source` | text | erzeugende Engine oder `manual` |
| `lead_id` | uuid (FK `leads`, nullable) | bezogener Lead (Akquise) |
| `client_id` | uuid (FK `clients`, nullable) | bezogener Kunde (Upsell/Wachstum) |
| `estimated_value_amount` | integer (Rappen) | geschaetzter Wert in Rappen |
| `currency` | text | Waehrung (Default `CHF`) |
| `priority` | enum (`priority`) | `low`, `medium`, `high`, `urgent` |
| `status` | enum (`opportunity_status`) | `open`, `in_review`, `accepted`, `dismissed`, `expired` |
| `confidence` | numeric | Engine-Konfidenz (0-1) |
| `due_date` | date | empfohlene Bearbeitungsfrist |
| `assigned_to` | uuid (FK `users`, nullable) | zustaendige Person |
| `owner_id` | uuid (FK `users`) | verantwortliche Person |
| `accepted_at` / `dismissed_at` | timestamptz | Entscheidungszeitpunkte |
| `created_by` / `updated_by` | uuid (FK `users`) | Audit |

**Beziehungen.**
- n:1 zu `leads` **oder** `clients` (je nach Akquise- vs. Bestandskunden-Chance).
- 1:0/1 zu Lieferleistungen: bei Annahme entsteht je nach Kategorie ein `website`, eine `ad_campaign`, ein `crm_build`, ein `shoot`/`content_item` oder ein `creators`-Eintrag (via `opportunity_id`).
- 1:n zu `tasks` (Bearbeitungsaufgaben), `outreach_emails`, `offers`.

**Statusfelder/Enums.**
- `opportunity_status`: `open` → `in_review` → `accepted`/`dismissed`; `expired` (Frist verstrichen).
- `priority`: `low`, `medium`, `high`, `urgent`.
- `opportunity_category`: `website_audit`, `ads`, `content`, `recruiting`, `crm_automation`, `upsell`, `referral`, `manual`.

**Wichtige Indizes.**
- `(org_id, status, priority)` fuer die priorisierte Arbeitsliste ("Was muss heute gemacht werden?").
- `(org_id, category)`, `(client_id)`, `(lead_id)`.

**Sicherheitsregeln (RLS).**
- Lesen: `super_admin`, `ceo`, `cso`, `sales` (Akquise-Chancen); `project_manager` (Produktions-Chancen); zugeordnete Bearbeiter sehen ihre.
- Schreiben/Entscheiden: `cso`, `sales`, `project_manager`, `super_admin` je nach Kategorie.
- Engines schreiben ueber die **Service-Rolle**; jede Annahme/Ablehnung → `audits` + `activity_logs`.

### 5.4.3 `audits`

**Zweck.** Revisionssicherer, **append-only** Audit-Trail aller sicherheitsrelevanten und schreibenden Aktionen (wer, was, wann, alt/neu). Grundlage fuer DSG-Konformitaet und Nachvollziehbarkeit. Sichtbar unter `/settings/audit` (nur fuer Berechtigte).

| Feld | Typ | Zweck |
| --- | --- | --- |
| `actor_id` | uuid (FK `users`, nullable) | handelnde Person (NULL = System/Service) |
| `action` | text | ausgefuehrte Aktion (`create`, `update`, `delete`, `login`, `permission_change`, …) |
| `entity_type` | text | betroffener Objekttyp (Tabellenname, polymorph) |
| `entity_id` | uuid | betroffene Objekt-ID |
| `changes` | jsonb | Diff alt/neu (`before`/`after`) |
| `ip_address` | inet | Quell-IP der Aktion |
| `user_agent` | text | Client-/Browser-Kennung |
| `context` | jsonb | Zusatzkontext (Route, Request-ID, Engine) |
| `created_at` | timestamptz | Zeitpunkt der Aktion (kein `updated_at`/`deleted_at`) |

**Beziehungen.**
- polymorph zu allen fachlichen Tabellen ueber `entity_type` + `entity_id`.
- n:1 zu `users` (`actor_id`).

**Statusfelder/Enums.**
- Kein Status; **unveraenderlich** (kein Update, kein Soft-Delete). `action` ist ein offenes, kontrolliertes Vokabular.

**Wichtige Indizes.**
- `(entity_type, entity_id)` fuer Objekt-Historie.
- `(actor_id, created_at)` fuer Personen-Audit.
- `(org_id, created_at)` fuer chronologische Auswertung.

**Sicherheitsregeln (RLS).**
- Lesen: nur `super_admin` und `ceo` (vollstaendig); ggf. `finance` fuer finanzbezogene Audits.
- Schreiben: ausschliesslich Server/Service-Rolle (append-only); **keine** Update-/Delete-Rechte fuer irgendeine Rolle.
- Aufbewahrungsfrist gemaess DSG; keine harte Loeschung ueber UI.

### 5.4.4 `activity_logs`

**Zweck.** Fachlicher Aktivitaets-Feed je Objekt (menschlich lesbar): "Status auf `done` gesetzt", "Kommentar hinzugefuegt", "Rechnung versendet". Speist die Verlaufsansichten (`/activity`, Objekt-Timelines) - im Gegensatz zum technischen, revisionssicheren `audits`.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `actor_id` | uuid (FK `users`, nullable) | ausloesende Person (NULL = System/Engine) |
| `verb` | text | Aktivitaet (`created`, `status_changed`, `commented`, `assigned`, `sent`) |
| `entity_type` | text | Objekttyp (polymorph) |
| `entity_id` | uuid | Objekt-ID |
| `summary` | text | menschlich lesbare Zusammenfassung |
| `meta` | jsonb | strukturierte Zusatzinfos (alt/neu-Status, Werte) |
| `is_system` | boolean | von Automation/Engine erzeugt |
| `created_at` | timestamptz | Zeitpunkt (kein Soft-Delete) |

**Beziehungen.**
- polymorph zu allen fachlichen Tabellen (`entity_type` + `entity_id`).
- n:1 zu `users` (`actor_id`).
- Quelle fuer Home-/Objekt-Timelines.

**Statusfelder/Enums.**
- Kein Status; `verb` als kontrolliertes Vokabular.

**Wichtige Indizes.**
- `(entity_type, entity_id, created_at)` fuer Objekt-Timeline.
- `(org_id, created_at)` fuer globalen Feed.
- `(actor_id, created_at)`.

**Sicherheitsregeln (RLS).**
- Lesen: jede Rolle sieht Feed-Eintraege zu **Objekten, die sie sehen darf** (Sichtbarkeit folgt dem referenzierten Objekt).
- Schreiben: System/Service-Rolle bei jeder sichtbaren Statusaenderung; append-only (keine Updates/Loeschungen ueber UI).

---

## 5.5 Hilfstabellen (kompakt, vollstaendig)

Die Hilfstabellen sind verbindlicher Bestandteil des Modells, gehoeren aber nicht zu den 27 Kern-Tabellen. Sie tragen ebenfalls die Standardfelder (sofern fachlich), polymorphe Beziehungen ueber `<name>_type` + `<name>_id`.

### 5.5.1 `notifications`

**Zweck.** Personenbezogene In-App-Benachrichtigungen mit Lese-Status; gespeist von `automations`, Engines und Statuswechseln. Sichtbar unter `/notifications`.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `user_id` | uuid (FK `users`) | Empfaenger |
| `type` | text | Kategorie (`task_assigned`, `invoice_overdue`, `opportunity_new`, …) |
| `title` | text | Kurztitel |
| `body` | text | Inhalt |
| `entity_type` / `entity_id` | text / uuid | verknuepftes Objekt (polymorph, Deep-Link) |
| `is_read` | boolean | Lese-Status |
| `read_at` | timestamptz | Zeitpunkt des Lesens |
| `priority` | enum (`priority`) | Dringlichkeit |

**Beziehungen.** n:1 zu `users`; polymorph zu beliebigem Objekt. **Indizes:** `(user_id, is_read, created_at)`. **RLS:** Eine Person sieht **nur ihre eigenen** Notifications (`user_id = auth.uid()`); Erstellung durch Service-Rolle. Soft-Delete optional, sonst Loeschen nach Aufbewahrungsfrist.

### 5.5.2 `tags`

**Zweck.** Wiederverwendbare Schlagworte zur Klassifizierung (z. B. Branche, Prioritaet, Kampagnentyp).

| Feld | Typ | Zweck |
| --- | --- | --- |
| `name` | text | Schlagwort |
| `slug` | text | normalisierter Schluessel (eindeutig je org) |
| `color` | text | Anzeigefarbe (UI) |
| `category` | text | optionale Gruppierung von Tags |

**Beziehungen.** 1:n zu `taggables`. **Indizes:** eindeutiger `(org_id, slug)`. **RLS:** Lesen fuer alle eingeloggten Rollen; Anlegen/Pflegen durch `project_manager`/`super_admin`. Mutationen → `audits`.

### 5.5.3 `taggables`

**Zweck.** Polymorphe n:m-Zuordnung von `tags` zu beliebigen Objekten.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `tag_id` | uuid (FK `tags`) | zugeordnetes Tag |
| `taggable_type` | text | Objekttyp (z. B. `clients`, `tasks`, `opportunities`) |
| `taggable_id` | uuid | Objekt-ID |

**Beziehungen.** n:1 zu `tags`; polymorph zum Zielobjekt. **Indizes:** eindeutiger `(tag_id, taggable_type, taggable_id)`; zusaetzlich `(taggable_type, taggable_id)`. **RLS:** Sichtbarkeit folgt dem getaggten Objekt; Zuweisung durch Rollen mit Schreibrecht auf das Objekt.

### 5.5.4 `comments`

**Zweck.** Kommentare/Notizen an beliebigen Objekten (polymorph), inkl. Threading.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `author_id` | uuid (FK `users`) | Verfasser |
| `commentable_type` / `commentable_id` | text / uuid | Zielobjekt (polymorph) |
| `body` | text | Kommentartext |
| `parent_id` | uuid (FK `comments`, nullable) | Antwort/Thread |
| `mentions` | uuid[] | erwaehnte `users` (loesen `notifications` aus) |

**Beziehungen.** n:1 zu `users`; selbstreferenziell (`parent_id`); polymorph zum Zielobjekt; erzeugt `activity_logs`/`notifications`. **Indizes:** `(commentable_type, commentable_id, created_at)`. **RLS:** Lesen/Schreiben durch Rollen mit Zugriff auf das Zielobjekt; eigene Kommentare editierbar, Loeschung (hart) nur `super_admin` (sonst Soft-Delete). Mutationen → `audits`.

### 5.5.5 `project_members`

**Zweck.** Zuordnung von `users` zu `projects` inkl. Projektrolle (steuert projektbezogene Sichtbarkeit).

| Feld | Typ | Zweck |
| --- | --- | --- |
| `project_id` | uuid (FK `projects`) | Projekt |
| `user_id` | uuid (FK `users`) | Mitglied |
| `project_role` | text | Rolle im Projekt (`lead`, `member`, `reviewer`, `observer`) |
| `added_by` | uuid (FK `users`) | wer das Mitglied hinzufuegte |

**Beziehungen.** n:1 zu `projects` und `users`. **Indizes:** eindeutiger `(project_id, user_id)`. **RLS:** Lesen fuer Projektmitglieder, `project_manager`, `ceo`, `super_admin`; Pflege durch `project_manager`/`super_admin`. Diese Tabelle ist eine zentrale Grundlage projektbezogener RLS-Policies in der Produktion.

### 5.5.6 `attachments`

**Zweck.** Polymorphe Verknuepfung von `files` zu einzelnen Objekten (1 Datei kann an mehreren Objekten haengen).

| Feld | Typ | Zweck |
| --- | --- | --- |
| `file_id` | uuid (FK `files`) | verknuepfte Datei |
| `attachable_type` / `attachable_id` | text / uuid | Zielobjekt (polymorph) |
| `role` | text | Rolle der Datei (`receipt`, `creative`, `contract`, `deliverable`) |
| `attached_by` | uuid (FK `users`) | wer die Datei anhing |

**Beziehungen.** n:1 zu `files`; polymorph zum Zielobjekt. **Indizes:** `(attachable_type, attachable_id)`; `file_id`. **RLS:** Sichtbarkeit folgt dem Zielobjekt; dadurch wird die Dateisicht (`files`) transitiv gesteuert. Mutationen → `audits`.

### 5.5.7 `integrations`

**Zweck.** Verbundene Drittsysteme (Meta/Google/TikTok Ads, HubSpot, Mail, Storage) inkl. **verschluesselter** Zugangsdaten und Status. Sichtbar unter `/settings/integrations`.

| Feld | Typ | Zweck |
| --- | --- | --- |
| `provider` | text | Anbieter (`meta_ads`, `google_ads`, `hubspot`, …) |
| `name` | text | Anzeigename der Verbindung |
| `status` | enum (`integration_status`) | `connected`, `disconnected`, `error` |
| `credentials` | jsonb (verschluesselt) | Token/Secrets (verschluesselt at rest) |
| `config` | jsonb | nicht-geheime Konfiguration |
| `last_sync_at` | timestamptz | letzter erfolgreicher Sync |
| `last_error` | text | letzter Fehler |
| `connected_by` | uuid (FK `users`) | wer verbunden hat |

**Beziehungen.** 1:n zu `webhooks`, `ad_campaigns`, `crm_builds` (Datenquelle). **Indizes:** `(org_id, provider)`, `(org_id, status)`. **RLS:** Lesen/Schreiben nur `super_admin` (und `ceo` lesend ohne Secrets). `credentials` werden **nie** an den Client ausgeliefert; Entschluesselung nur serverseitig. Mutationen → `audits`.

### 5.5.8 `webhooks`

**Zweck.** Ein-/ausgehende Webhook-Endpunkte fuer Integrationen und Automationen (z. B. Event-Empfang, ausgehende Trigger).

| Feld | Typ | Zweck |
| --- | --- | --- |
| `integration_id` | uuid (FK `integrations`, nullable) | zugehoerige Integration |
| `automation_id` | uuid (FK `automations`, nullable) | ausloesende/empfangende Automation |
| `direction` | enum (`webhook_direction`) | `inbound`, `outbound` |
| `url` | text | Ziel-/Quell-URL |
| `event` | text | Ereignisname/Topic |
| `secret` | text (verschluesselt) | Signatur-Secret zur Verifikation |
| `is_active` | boolean | aktiv/inaktiv |
| `last_triggered_at` | timestamptz | letzter Aufruf |
| `last_status` | text | Ergebnis des letzten Aufrufs |

**Beziehungen.** n:1 zu `integrations` und/oder `automations`. **Indizes:** `(org_id, direction, is_active)`, `integration_id`, `automation_id`. **RLS:** Lesen/Schreiben nur `super_admin`; Ausfuehrung durch Service-Rolle. Eingehende Webhooks werden ueber `secret` signaturverifiziert. Mutationen → `audits`.

---

## 5.6 Gesamt-ER-Uebersicht (textuell)

Die zentralen Entitaeten des Modells sind `clients`, `projects` und `tasks`. Um sie gruppieren sich Sales-Akquise, Lieferleistungen, Finanzen und der Audit-/Aktivitaets-Layer. Wichtigste Kanten:

**Akquise → Kunde (Sales-Funnel).**
- `leads` 1:n `contacts`; `leads` 1:n `opportunities`; `leads` 1:n `offers`; `leads` 1:n `outreach_emails`.
- Ein gewonnener `lead` (`lead_status = won`) erzeugt genau einen `client`. `clients` 1:n `contacts`, `clients` 1:n `contracts`, `clients` 1:n `meetings`/`reporting_calls`.

**`clients` (Beziehungs-Drehkreuz).**
- `clients` 1:n `projects` (jede Leistung laeuft ueber ein Projekt).
- `clients` 1:n `invoices`, 1:n `expenses` (billable), 1:n `opportunities` (Upsell/Referral/Wachstum).
- `clients` 1:n `contracts`; `contracts` 1:n `invoices` (Abrechnungsgrundlage, MRR/ARR).

**`projects` (Liefer-Klammer).**
- `projects` 1:n `tasks`; `tasks` 1:n `subtasks`.
- `projects` 1:n der Lieferleistungen: `websites`, `ad_campaigns`, `crm_builds`, `shoots`, `content_items`.
- `projects` n:m `users` ueber `project_members` (steuert projektbezogene RLS).

**`tasks` (operativer Kern, "Was muss heute gemacht werden?").**
- `tasks` n:1 `projects`; `tasks` n:1 `users` (`assigned_to`).
- `tasks` koennen aus `opportunities`, `meetings` (Folgeaufgaben), `automations` und Engines entstehen.
- `tasks` 1:n `subtasks`, 1:n `comments`, 1:n `attachments`.

**Produktion & Pool.**
- `shoots` n:1 `projects`/`clients`, n:1 `creators` (`lead_creator_id`), n:m `creators` (`shoot_assignees`).
- `shoots` 1:n `content_items`; `content_items` n:1 `projects`/`clients`.
- `creators` 0/1:1 `users` (interner Creator).
- `websites`/`ad_campaigns`/`crm_builds` jeweils n:1 `projects`/`clients`, optional n:1 `integrations`, optional 0/1:1 `opportunities` (Herkunft).

**Operations & Dateien.**
- `files` 1:n `attachments` (polymorph an alle Objekte).
- `automations` 1:n `webhooks`; `automations` erzeugen `tasks`, `notifications`, `activity_logs`.
- `integrations` 1:n `webhooks`, speisen `ad_campaigns`/`crm_builds`.

**Finanzen.**
- `invoices` n:1 `clients`, optional n:1 `contracts`/`projects`.
- `expenses` optional n:1 `clients`/`projects`/`ad_campaigns`/`creators`; n:1 `files` (Beleg).

**Querschnitt: Klassifizierung, Kommunikation, Audit.**
- `tags` n:m alle Objekte ueber `taggables`.
- `comments` polymorph an alle Objekte; `notifications` n:1 `users`, polymorph verlinkt.
- `audits` (append-only, technisch) und `activity_logs` (fachlich, lesbar) sind **polymorph mit jedem fachlichen Objekt** verbunden (`entity_type` + `entity_id`); jede schreibende Aktion erzeugt einen `audits`-Eintrag, jede sichtbare Statusaenderung einen `activity_logs`-Eintrag.
- `org_id` verbindet **jede** fachliche Tabelle mit `organizations` und bildet die Basis aller RLS-Policies (Single-Tenant heute, Multi-Tenant-faehig morgen).

**Grundprinzip der Kanten.** Jede Akquise-Spur (`leads`/`opportunities`/`offers`/`outreach_emails`) muendet bei Erfolg in `clients`; jeder Kunde produziert `projects`; jedes Projekt zerfaellt in `tasks` und konkrete Lieferleistungen; jede Lieferung erzeugt `files`, `invoices` und `expenses`; und der gesamte Lebenszyklus wird ueber `audits` und `activity_logs` lueckenlos nachvollziehbar gehalten - "Eine Plattform. Eine Datenbank. Ein Login. Alles verbunden."
