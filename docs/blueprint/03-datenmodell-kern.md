# 5. Datenmodell - Teil 1 (Kernentitaeten)

> Dieser Abschnitt beschreibt die ersten 14 Kernentitaeten des eCreator-OS-Datenmodells. Alle Tabellen-, Feld-, Rollen- und Status-Namen folgen exakt der kanonischen Referenz (`00-kanonische-referenz.md`, Abschnitt 4 und 8). Bei Konflikten gilt immer die kanonische Referenz.
>
> **Konventionen, die fuer jede der folgenden Tabellen gelten und nicht in jeder Feld-Liste wiederholt werden:**
>
> - **Primaerschluessel** `id` (UUID, Default `gen_random_uuid()`).
> - **Mandanten-Feld** `org_id` (UUID, FK auf `organizations`, NOT NULL, Default = eCreator GmbH). Basis aller RLS-Policies; sichert spaetere Multi-Tenancy ohne Modellbruch.
> - **Zeitstempel** `created_at` (timestamptz, Default `now()`) und `updated_at` (timestamptz, per Trigger gepflegt).
> - **Soft-Delete** `deleted_at` (timestamptz, nullable; `NULL` = aktiv). Standardabfragen filtern `deleted_at IS NULL`. Harte Loeschung nur durch `super_admin`.
> - **Audit-Felder** `created_by` und `updated_by` (UUID, FK auf `users`) auf allen fachlichen Tabellen.
> - **Geld** als Ganzzahl in Rappen, Feldname endet auf `_amount`, begleitet von `currency` (Default `CHF`).
> - **Enum-Werte** sind in der Datenbank immer englisch/`snake_case`; die deutsche UI-Beschriftung erfolgt in der Praesentationsschicht.
>
> Die Felder `id`, `org_id`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by` werden in den Feld-Tabellen nur dort explizit aufgefuehrt, wo ihr Verhalten erlaeuterungsbeduerftig ist; ansonsten gelten sie implizit gemaess obiger Konvention.

---

## 5.0 Uebersicht und Lese-Hinweis

Teil 1 behandelt die folgenden 14 Tabellen in dieser Reihenfolge. Die Reihenfolge mischt bewusst Domaene A (Identitaet & Zugriff), B (Sales), C (Kunden) und D (Produktion), weil sie den fachlichen Lebenszyklus eines Geschaeftsfalls abbildet: Identitaet → Lead → Kunde → Lieferung → Vertrag/Angebot/Termin → Content.

| # | Tabelle | Domaene | Zentrale Rolle im Geschaeftsablauf |
| --- | --- | --- | --- |
| 1 | `users` | A | Identitaet jedes Mitarbeitenden; Anker fuer `owner_id`, `assigned_to`, Audit |
| 2 | `roles` | A | die 9 kanonischen Rollen |
| 3 | `permissions` | A | granulare Rechte, ueber Hilfstabelle den Rollen zugeordnet |
| 4 | `leads` | B | potenzieller Kunde vor Abschluss |
| 5 | `clients` | C | gewonnener, aktiver Kunde |
| 6 | `contacts` | C | Ansprechpersonen zu Leads und Kunden |
| 7 | `projects` | D | zentrale Lieferklammer pro Kunde |
| 8 | `tasks` | D | operativer Kern des Aufgaben-Systems |
| 9 | `subtasks` | D | Teilaufgaben/Checklistenpunkte |
| 10 | `contracts` | C | laufende Vertraege inkl. Wert und Laufzeit |
| 11 | `offers` | B | Angebote/Proposals mit Positionen und Status |
| 12 | `meetings` | C | Sales- und Kundentermine mit Teilnehmern |
| 13 | `reporting_calls` | C | wiederkehrende Reporting-/Review-Calls |
| 14 | `content_items` | D | einzelne Content-Stuecke |

**RLS-Grundmuster (gilt fuer alle Tabellen):** Jede Policy prueft zuerst `org_id = aktuelle_org()`. Darauf aufbauend kombinieren wir zwei Zugriffsmodelle:

- **Ownership-basiert** - Zugriff, weil der Datensatz der Person gehoert (`owner_id = auth.uid()`), ihr zugewiesen ist (`assigned_to = auth.uid()`) oder sie ueber eine Hilfstabelle (z.B. `project_members`) verbunden ist.
- **Rollenbasiert** - Zugriff, weil die Rolle bereichsweiten Lese- oder Schreibzugriff hat (z.B. `cso` auf alle Sales-Tabellen, `ceo`/`super_admin` lesend auf alles).

`viewer` erhaelt grundsaetzlich nur Lesezugriff auf freigegebene Bereiche und niemals INSERT/UPDATE/DELETE. Jede schreibende Aktion erzeugt einen Eintrag in `audits`, jede sichtbare Statusaenderung zusaetzlich in `activity_logs`.

---

## 5.1 `users`

### Zweck
Speichert alle Mitarbeitenden-Konten der eCreator GmbH mit Stammdaten und der Verknuepfung zur Supabase-Auth-Identitaet. `users` ist der zentrale Anker fuer alle Verantwortlichkeits-, Zuweisungs- und Audit-Felder im gesamten Modell.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | identisch mit der Supabase-Auth-User-ID; ein 1:1-Bezug zur Auth-Identitaet |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung; Default eCreator GmbH |
| `email` | text (unique) | Login-/Kontakt-E-Mail; eindeutig je Organisation |
| `full_name` | text | vollstaendiger Anzeigename |
| `display_name` | text | Kurz-/Anzeigename fuer UI und Erwaehnungen |
| `avatar_url` | text | Profilbild (Verweis in Storage) |
| `role_id` | uuid (FK → `roles`) | primaere Rolle des Mitarbeitenden |
| `job_title` | text | interne Funktionsbezeichnung (frei) |
| `phone` | text | Telefonnummer (optional) |
| `status` | enum `user_status` | Konto-Status (siehe unten) |
| `is_active` | boolean | schneller Aktiv-Schalter (Default `true`) |
| `last_seen_at` | timestamptz | Zeitpunkt der letzten Aktivitaet |
| `created_at` | timestamptz | Anlagezeitpunkt |
| `updated_at` | timestamptz | letzte Aenderung (Trigger) |
| `deleted_at` | timestamptz (nullable) | Soft-Delete; deaktiviertes/ausgeschiedenes Konto |

> Hinweis: `users` traegt keine eigenen `owner_id`/`created_by`-Selbstbezuege als fachliche Pflicht; technisch wird die anlegende Person (i.d.R. `super_admin`) in `audits` festgehalten.

### Beziehungen
- **`users` n:1 `roles`** - jeder User hat genau eine primaere `role_id`.
- **`users` 1:n auf nahezu alle fachlichen Tabellen** ueber `owner_id`, `assigned_to`, `created_by`, `updated_by` (z.B. `leads.owner_id`, `tasks.assigned_to`).
- **`users` n:m `projects`** ueber die Hilfstabelle `project_members` (inkl. Projektrolle).
- **`users` n:m `meetings`** ueber eine Teilnehmer-Hilfstabelle (siehe `meetings`).
- **`users` 1:n `notifications`** - persoenliche Benachrichtigungen.

### Statusfelder / Enums
- `user_status`: `invited`, `active`, `suspended`, `deactivated`.
  - `invited` = eingeladen, Login noch nicht abgeschlossen; `active` = regulaer; `suspended` = temporaer gesperrt; `deactivated` = dauerhaft deaktiviert (zusaetzlich i.d.R. `deleted_at` gesetzt).

### Wichtige Indizes
- `UNIQUE (org_id, email)` - verhindert Doppelkonten je Organisation.
- Index auf `role_id` - schnelle Rollen-Joins und Rechtepruefung.
- Index auf `status` und `is_active` - Filtern aktiver Mitarbeitender (Team-/Auslastungssichten).
- Partial Index `WHERE deleted_at IS NULL` - Standardabfragen auf aktive Konten.

### Sicherheitsregeln (RLS)
- **Lesen:** Jeder authentifizierte User darf Basisprofile (`full_name`, `display_name`, `avatar_url`, `job_title`) aller Kollegen derselben `org_id` sehen (noetig fuer Zuweisungen, @-Erwaehnungen). Sensible Felder (`phone`, `email`, `last_seen_at`) sind nur fuer den User selbst, `super_admin` und `ceo` sichtbar.
- **Aendern eigenes Profil:** Jeder User darf seine eigenen Stammdaten (`full_name`, `display_name`, `avatar_url`, `phone`) aendern (`id = auth.uid()`).
- **Verwaltung:** Anlegen, Einladen, Rolle zuweisen, Sperren und Deaktivieren ausschliesslich durch `super_admin` (Bereich `/settings/users`). `ceo` darf lesen und Rollenwechsel beantragen, aber nicht technisch erzwingen.
- **Loeschen:** Soft-Delete (`deleted_at`) durch `super_admin`; harte Loeschung nur `super_admin`. `viewer` hat reinen Lesezugriff auf Basisprofile.

---

## 5.2 `roles`

### Zweck
Definiert die neun kanonischen Rollen des Systems (Abschnitt 3 der Referenz) und dient als Verteiler fuer granulare `permissions`. Eine Rolle buendelt einen konsistenten Satz an Rechten und wird Usern ueber `users.role_id` zugewiesen.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `key` | text (unique) | stabiler Code der Rolle (`super_admin`, `ceo`, `cso`, `sales`, `project_manager`, `developer`, `creative`, `finance`, `viewer`) |
| `name` | text | deutsche Anzeige (z.B. "Project Manager") |
| `description` | text | Zweck der Rolle in einem Satz |
| `is_system` | boolean | `true` = vom System vorgegeben, nicht loeschbar/umbenennbar |
| `rank` | smallint | Hierarchiestufe fuer Sortierung/Defaults (z.B. `super_admin` niedrigster Rang = hoechste Macht) |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete (nur fuer kuenftige Custom-Rollen relevant) |

### Beziehungen
- **`roles` 1:n `users`** - eine Rolle, viele User.
- **`roles` n:m `permissions`** ueber die Hilfstabelle `role_permissions` (`role_id` + `permission_id`).

### Statusfelder / Enums
- Kein klassisches Status-Enum. `key` ist faktisch eine geschlossene Werteliste der 9 kanonischen Rollen; `is_system` schuetzt diese vor Aenderung.

### Wichtige Indizes
- `UNIQUE (org_id, key)` - Rollen-Code je Organisation eindeutig.
- Index auf `is_system` - Trennung System- vs. Custom-Rollen in der Verwaltung.

### Sicherheitsregeln (RLS)
- **Lesen:** alle authentifizierten User derselben `org_id` (die Rollennamen muessen ueberall referenzierbar sein).
- **Aendern:** nur `super_admin` (Bereich `/settings/roles`). System-Rollen (`is_system = true`) duerfen nicht umbenannt, im `key` veraendert oder geloescht werden - durchgesetzt zusaetzlich per DB-Trigger/Constraint.
- **Loeschen:** ausgeschlossen fuer System-Rollen; kuenftige Custom-Rollen nur durch `super_admin` (Soft-Delete).

---

## 5.3 `permissions`

### Zweck
Listet granulare Einzelrechte (Aktion auf Ressource), die Rollen zugeordnet werden. Damit lassen sich Zugriffe feiner steuern als ueber die Rolle allein und spaeter ohne Codeaenderung anpassen.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `key` | text (unique) | stabiler Rechte-Code im Muster `resource.action`, z.B. `leads.create`, `invoices.read`, `users.manage` |
| `resource` | text | betroffene Ressource/Tabelle (`leads`, `projects`, `invoices`, …) |
| `action` | enum `permission_action` | erlaubte Aktion (siehe unten) |
| `description` | text | Klartext-Beschreibung des Rechts |
| `is_system` | boolean | vom System vorgegebenes Standardrecht |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

### Beziehungen
- **`permissions` n:m `roles`** ueber die Hilfstabelle `role_permissions`.
- Indirekt wirkt `permissions` auf alle Kerntabellen, da `resource` auf deren Namen verweist.

### Statusfelder / Enums
- `permission_action`: `create`, `read`, `update`, `delete`, `manage`, `export`, `approve`.
  - `manage` = vollstaendige Verwaltung inkl. Konfiguration; `approve` = Freigaberecht (z.B. Angebote, Rechnungen); `export` = Datenexport.

### Wichtige Indizes
- `UNIQUE (org_id, key)` - jedes Recht eindeutig.
- Index auf `resource` - schnelles Auflisten aller Rechte je Ressource im Verwaltungs-UI.

### Sicherheitsregeln (RLS)
- **Lesen:** alle authentifizierten User derselben `org_id` (die App muss Rechte clientseitig fuer Sichtbarkeits-Logik kennen); sensible Verwaltung bleibt serverseitig.
- **Aendern / Zuordnen:** ausschliesslich `super_admin` (Pflege der `role_permissions`-Zuordnung unter `/settings/roles`).
- **Loeschen:** nur `super_admin`; `is_system`-Rechte sind gegen Loeschung geschuetzt.

---

## 5.4 `leads`

### Zweck
Erfasst potenzielle Kunden vor dem Abschluss inklusive Herkunft, Verantwortlichem und Pipeline-Status. `leads` ist der Einstiegspunkt der Sales-Domaene und wird sowohl manuell als auch durch die Lead Engine befuellt.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `company_name` | text | Firmenname des potenziellen Kunden |
| `website_url` | text | Website (Basis fuer Website Audit Engine) |
| `industry` | text | Branche/Segment |
| `source` | enum `lead_source` | Herkunft des Leads (siehe unten) |
| `status` | enum `lead_status` | Pipeline-Status (siehe unten) |
| `score` | smallint | Qualifizierungs-Score 0-100 (von Engine/manuell) |
| `estimated_value_amount` | bigint | geschaetzter Auftragswert in Rappen |
| `currency` | text | Waehrung (Default `CHF`) |
| `primary_contact_id` | uuid (FK → `contacts`) | Hauptansprechperson |
| `owner_id` | uuid (FK → `users`) | verantwortlicher Sales-Mitarbeitender |
| `converted_client_id` | uuid (FK → `clients`, nullable) | gesetzt bei Status `won`; Verweis auf entstandenen Kunden |
| `lost_reason` | text (nullable) | Begruendung bei Status `lost` |
| `next_action_at` | timestamptz (nullable) | naechster faelliger Schritt ("Was ist heute zu tun?") |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

### Beziehungen
- **`leads` n:1 `users`** ueber `owner_id`.
- **`leads` n:1 `contacts`** ueber `primary_contact_id`; zusaetzlich **`contacts` n:1 `leads`** (ein Lead kann mehrere Kontakte haben - siehe `contacts.lead_id`).
- **`leads` 1:1/1:n `clients`** ueber `converted_client_id` (gewonnener Lead wird zu Kunde).
- **`leads` 1:n `opportunities`**, **`leads` 1:n `offers`**, **`leads` 1:n `outreach_emails`**, **`leads` 1:n `meetings`** (jeweils ueber `lead_id` in der Zieltabelle).
- Polymorph: `tags`/`taggables`, `comments`, `attachments`, `activity_logs`.

### Statusfelder / Enums
- `lead_status`: `new`, `contacted`, `qualified`, `proposal`, `won`, `lost` (kanonisch).
- `lead_source` (Herkunft): `engine`, `referral`, `inbound`, `outbound`, `event`, `manual`.
  - `engine` = von der Lead Engine erzeugt; `referral` = via Referral Engine/Empfehlung.

### Wichtige Indizes
- Index auf `owner_id` - "meine Leads"-Sichten und RLS.
- Index auf `status` - Pipeline-Filter und Kanban-Spalten.
- Index auf `source` - Quellen-Auswertung.
- Index auf `next_action_at` - Tagesliste faelliger Aktionen.
- Index auf `created_at` - chronologische Sortierung.
- FK-Indizes auf `primary_contact_id`, `converted_client_id`.
- Composite Index `(org_id, status, owner_id)` - haeufigste kombinierte Pipeline-Abfrage.

### Sicherheitsregeln (RLS)
- **Lesen:** der `owner_id`-Inhaber; alle `sales`-User der Organisation (Team-Pipeline); `cso`, `ceo`, `super_admin` vollumfaenglich; `viewer` lesend auf freigegebene Pipeline-Sichten.
- **Erstellen:** `sales`, `cso`, `super_admin`; die Lead Engine schreibt ueber einen Service-Account mit `source = engine`.
- **Aendern:** der Owner und `cso`/`super_admin`. Statuswechsel nach `won` setzt verpflichtend `converted_client_id`; nach `lost` verpflichtend `lost_reason` (Trigger/Server Action). `sales` kann fremde Leads nur lesen, nicht aendern (Ausnahme: `cso`).
- **Loeschen:** Soft-Delete durch Owner oder `cso`; harte Loeschung nur `super_admin`.

---

## 5.5 `clients`

### Zweck
Repraesentiert aktive Kunden, die aus gewonnenen Leads hervorgehen, inklusive Betreuungs- und Vertragskontext. `clients` ist der zentrale Ankerpunkt der Kunden- und der Produktions-Domaene.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `name` | text | offizieller Kundenname/Firma |
| `legal_name` | text | juristischer Name (fuer Vertraege/Rechnungen) |
| `website_url` | text | Website des Kunden |
| `industry` | text | Branche |
| `source_lead_id` | uuid (FK → `leads`, nullable) | Ursprungs-Lead |
| `primary_contact_id` | uuid (FK → `contacts`) | Hauptansprechperson |
| `account_manager_id` | uuid (FK → `users`) | betreuende Person (Kundenverantwortung) |
| `status` | enum `client_status` | Beziehungsstatus (siehe unten) |
| `health` | enum `client_health` | Beziehungsgesundheit (Ampel) |
| `mrr_amount` | bigint | aktueller monatlich wiederkehrender Umsatz in Rappen |
| `currency` | text | Waehrung (Default `CHF`) |
| `onboarded_at` | timestamptz (nullable) | Start der aktiven Betreuung |
| `churned_at` | timestamptz (nullable) | Zeitpunkt der Kuendigung |
| `owner_id` | uuid (FK → `users`) | verantwortliche Person (i.d.R. = `account_manager_id`) |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

### Beziehungen
- **`clients` n:1 `leads`** ueber `source_lead_id`.
- **`clients` n:1 `users`** ueber `account_manager_id`/`owner_id`.
- **`clients` 1:n `contacts`** (ueber `contacts.client_id`).
- **`clients` 1:n `contracts`**, **1:n `projects`**, **1:n `reporting_calls`**, **1:n `meetings`**, **1:n `invoices`**, **1:n `content_items`** (jeweils ueber `client_id`).
- Polymorph: `tags`/`taggables`, `comments`, `attachments`, `activity_logs`.

### Statusfelder / Enums
- `client_status`: `active`, `paused`, `churned` (kanonisch).
- `client_health` (intern, Ampel): `green`, `yellow`, `red`. Speist die Upsell Engine und Frueh-Warnungen.

### Wichtige Indizes
- Index auf `account_manager_id`/`owner_id` - "meine Kunden"-Sichten und RLS.
- Index auf `status` - aktive vs. pausierte/abgewanderte Kunden.
- Index auf `health` - Risikofilter fuer Betreuung.
- Index auf `source_lead_id`, `primary_contact_id` (FK-Joins).
- Index auf `mrr_amount` - Finance-/Recurring-Auswertungen.
- Partial Index `WHERE deleted_at IS NULL AND status = 'active'` - haeufigste Kundenliste.

### Sicherheitsregeln (RLS)
- **Lesen:** zustaendiger `account_manager_id`/`owner_id`; `project_manager`, `developer`, `creative`, die ueber ein Projekt des Kunden verbunden sind (Join ueber `projects`/`project_members`); `cso`, `ceo`, `finance`, `super_admin` vollumfaenglich; `viewer` lesend auf freigegebene Kundenuebersichten.
- **Erstellen:** entsteht regulaer per Lead-Konvertierung (`won`); manuell nur `cso`, `account_manager`-Rollen (`sales`/`project_manager`) und `super_admin`.
- **Aendern:** Account Manager und `cso`/`super_admin`. `mrr_amount`-/Vertrags-relevante Felder zusaetzlich durch `finance` aenderbar. Statuswechsel nach `churned` setzt `churned_at`.
- **Loeschen:** Soft-Delete durch Account Manager oder `cso`; harte Loeschung nur `super_admin`.

---

## 5.6 `contacts`

### Zweck
Verwaltet einzelne Ansprechpersonen, die einem Lead und/oder einem Kunden zugeordnet sind. Trennt natuerliche Personen sauber von der Firmen-Entitaet (`leads`/`clients`), sodass dieselbe Person ueber den Lebenszyklus erhalten bleibt.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `lead_id` | uuid (FK → `leads`, nullable) | zugehoeriger Lead |
| `client_id` | uuid (FK → `clients`, nullable) | zugehoeriger Kunde |
| `first_name` | text | Vorname |
| `last_name` | text | Nachname |
| `email` | text | E-Mail-Adresse |
| `phone` | text | Telefonnummer |
| `position` | text | Funktion/Position beim Kunden |
| `is_primary` | boolean | Hauptansprechperson der zugehoerigen Firma |
| `preferred_channel` | enum `contact_channel` | bevorzugter Kommunikationsweg |
| `consent_status` | enum `consent_status` | Einwilligungsstatus (DSG/UWG-konform) |
| `owner_id` | uuid (FK → `users`) | verantwortliche Person |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

> Geschaeftsregel: Mindestens eines von `lead_id` oder `client_id` muss gesetzt sein (CHECK-Constraint), damit jeder Kontakt eindeutig verankert ist.

### Beziehungen
- **`contacts` n:1 `leads`** (ueber `lead_id`) und **n:1 `clients`** (ueber `client_id`).
- Rueckbezug: **`leads.primary_contact_id`** und **`clients.primary_contact_id`** zeigen auf `contacts`.
- **`contacts` 1:n `meetings`** und **1:n `outreach_emails`** (als Empfaenger/Teilnehmer, ueber `contact_id`).
- Polymorph: `comments`, `activity_logs`, `tags`/`taggables`.

### Statusfelder / Enums
- `contact_channel`: `email`, `phone`, `whatsapp`, `linkedin`, `in_person`.
- `consent_status`: `unknown`, `granted`, `revoked`. Steuert, ob 1:1-Outreach rechtlich zulaessig ist (DSG/UWG; vgl. interne Compliance-Vorgaben).

### Wichtige Indizes
- Index auf `lead_id` und `client_id` (FK-Joins, "Kontakte zu diesem Kunden").
- Index auf `owner_id` - Verantwortlichkeit/RLS.
- Index auf `email` - Duplikaterkennung und Zuordnung eingehender Antworten.
- Partial Index `WHERE is_primary = true` - schnelle Ermittlung der Hauptansprechperson.

### Sicherheitsregeln (RLS)
- **Lesen:** wer den zugehoerigen Lead bzw. Kunden sehen darf, sieht dessen Kontakte (RLS leitet sich ueber `lead_id`/`client_id` ab); `sales`, `cso`, `ceo`, `super_admin` und betreuende Account Manager.
- **Erstellen / Aendern:** `sales`, `project_manager`, betreuender Account Manager, `cso`, `super_admin`. `consent_status` darf nur durch die verantwortliche Person bzw. `cso`/`super_admin` gesetzt werden (Compliance-Relevanz, Audit-pflichtig).
- **Loeschen:** Soft-Delete durch Owner oder `cso`; harte Loeschung nur `super_admin`. `viewer` rein lesend.

---

## 5.7 `projects`

### Zweck
Buendelt alle Lieferleistungen fuer einen Kunden in einer zentralen Klammer (Lieferprojekt). `projects` verbindet Kunde, Team und Aufgaben und ist Ankerpunkt der gesamten Produktions-Domaene.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `client_id` | uuid (FK → `clients`) | zugehoeriger Kunde |
| `contract_id` | uuid (FK → `contracts`, nullable) | zugrunde liegender Vertrag |
| `name` | text | Projektname |
| `code` | text | kurzer Projektcode (z.B. fuer Referenzen) |
| `description` | text | Projektbeschreibung/Ziel |
| `type` | enum `project_type` | Leistungsart (siehe unten) |
| `status` | enum `project_status` | Projektstatus (siehe unten) |
| `priority` | enum `priority` | Prioritaet |
| `owner_id` | uuid (FK → `users`) | verantwortlicher Project Manager |
| `budget_amount` | bigint | Projektbudget in Rappen |
| `currency` | text | Waehrung (Default `CHF`) |
| `start_date` | date (nullable) | geplanter Start |
| `due_date` | date (nullable) | geplanter Endtermin |
| `started_at` | timestamptz (nullable) | tatsaechlicher Start |
| `completed_at` | timestamptz (nullable) | tatsaechlicher Abschluss |
| `progress` | smallint | Fortschritt 0-100 (abgeleitet aus Tasks) |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

### Beziehungen
- **`projects` n:1 `clients`** (ueber `client_id`).
- **`projects` n:1 `contracts`** (ueber `contract_id`).
- **`projects` n:1 `users`** ueber `owner_id` (Project Manager).
- **`projects` n:m `users`** ueber die Hilfstabelle `project_members` (inkl. Projektrolle je Mitglied).
- **`projects` 1:n `tasks`**, **1:n `content_items`**, **1:n `websites`**, **1:n `ad_campaigns`**, **1:n `crm_builds`**, **1:n `shoots`** (Lieferleistungen haengen am Projekt).
- Polymorph: `files`/`attachments`, `comments`, `tags`/`taggables`, `activity_logs`.

### Statusfelder / Enums
- `project_status`: `planned`, `active`, `on_hold`, `completed`, `cancelled` (kanonisch).
- `priority`: `low`, `medium`, `high`, `urgent` (kanonisch).
- `project_type` (Leistungsart): `content`, `website`, `ads`, `crm`, `shoot`, `mixed`. Steuert, welche Lieferleistungs-Tabellen im Projekt relevant sind.

### Wichtige Indizes
- Index auf `client_id` - alle Projekte eines Kunden.
- Index auf `owner_id` - "meine Projekte" (Project Manager).
- Index auf `status` - aktive vs. abgeschlossene Projekte (Board-Filter).
- Index auf `due_date` - Termin-/Deadline-Sichten.
- Index auf `contract_id` (FK-Join).
- Composite Index `(org_id, status, owner_id)` - haeufigste Projektliste.

### Sicherheitsregeln (RLS)
- **Lesen:** der `owner_id`-PM; alle ueber `project_members` zugeordneten Mitglieder; der betreuende Account Manager des Kunden; `cso`, `ceo`, `finance`, `super_admin`; `viewer` lesend auf freigegebene Projektsichten.
- **Erstellen:** `project_manager`, `cso`, `super_admin`.
- **Aendern:** verantwortlicher PM (`owner_id`) und `super_admin`; Projektmitglieder duerfen ihnen zugewiesene Teilbereiche (z.B. Tasks), aber nicht Stammdaten/Budget aendern. Budget-relevante Felder zusaetzlich durch `finance` sichtbar.
- **Loeschen:** Soft-Delete durch PM-Owner; harte Loeschung nur `super_admin`.

---

## 5.8 `tasks`

### Zweck
Der operative Kern des Systems: einzelne Aufgaben innerhalb eines Projekts mit Zuweisung, Status, Faelligkeit und Prioritaet. `tasks` speist die Sichten "Mein Tag" und "Meine Aufgaben" und beantwortet direkt die Leitfrage "Was muss heute gemacht werden?".

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `project_id` | uuid (FK → `projects`, nullable) | zugehoeriges Projekt (nullable fuer freie/interne Aufgaben) |
| `title` | text | Aufgabentitel |
| `description` | text | Detailbeschreibung |
| `status` | enum `task_status` | Bearbeitungsstatus (siehe unten) |
| `priority` | enum `priority` | Prioritaet |
| `owner_id` | uuid (FK → `users`) | verantwortliche Person (wer die Aufgabe verantwortet) |
| `assigned_to` | uuid (FK → `users`, nullable) | ausfuehrende Person (kann von Owner abweichen) |
| `due_date` | date (nullable) | Faelligkeitsdatum (treibt "Mein Tag") |
| `started_at` | timestamptz (nullable) | tatsaechlicher Bearbeitungsbeginn |
| `completed_at` | timestamptz (nullable) | Abschlusszeitpunkt |
| `estimated_minutes` | integer (nullable) | geschaetzter Aufwand (Auslastungsplanung) |
| `order_index` | integer | Sortierung innerhalb einer Board-Spalte |
| `source` | enum `task_source` | Herkunft (manuell vs. von AI-Engine erzeugt) |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

### Beziehungen
- **`tasks` n:1 `projects`** (ueber `project_id`).
- **`tasks` n:1 `users`** ueber `owner_id` und `assigned_to`.
- **`tasks` 1:n `subtasks`** (ueber `subtasks.task_id`).
- Polymorph: `comments`, `attachments`/`files`, `tags`/`taggables`, `activity_logs`.
- Indirekt: AI-Engines (z.B. Meeting Assistant) erzeugen Folge-`tasks` mit `source = engine`.

### Statusfelder / Enums
- `task_status`: `todo`, `in_progress`, `review`, `done`, `blocked` (kanonisch; identisch fuer `subtasks`).
- `priority`: `low`, `medium`, `high`, `urgent` (kanonisch).
- `task_source` (Herkunft): `manual`, `engine`, `automation`. `engine`/`automation` markieren von AI-Engines bzw. Automationen erzeugte Aufgaben.

### Wichtige Indizes
- Index auf `assigned_to` - "Meine Aufgaben"/"Mein Tag" (haeufigste Abfrage).
- Index auf `owner_id` - Verantwortungssicht und RLS.
- Index auf `project_id` - Aufgaben eines Projekts/Boards.
- Index auf `status` - Board-Spalten.
- Index auf `due_date` - Tagesliste und Ueberfaelligkeit.
- Composite Index `(assigned_to, status, due_date)` - exakt die "Mein Tag"-Abfrage.
- Composite Index `(project_id, status, order_index)` - Board-Rendering in Sortierreihenfolge.

### Sicherheitsregeln (RLS)
- **Lesen:** `assigned_to` und `owner_id`; alle Mitglieder des zugehoerigen Projekts (`project_members`); `project_manager` (alle Projekte unter seiner Verantwortung), `cso`, `ceo`, `super_admin`; `viewer` lesend auf freigegebene Boards.
- **Erstellen:** alle bearbeitenden Rollen (`project_manager`, `developer`, `creative`, `sales`) innerhalb ihrer Projekte; AI-Engines via Service-Account (`source = engine`).
- **Aendern:** `assigned_to` darf Status, Fortschritt und `subtasks` der eigenen Aufgabe pflegen; `owner_id` und der zustaendige `project_manager` duerfen alle Felder aendern (inkl. Neuzuweisung). Statuswechsel nach `done` setzt `completed_at`.
- **Loeschen:** Soft-Delete durch Owner/PM; harte Loeschung nur `super_admin`.

---

## 5.9 `subtasks`

### Zweck
Bildet Teilaufgaben bzw. Checklistenpunkte zu einer uebergeordneten Aufgabe ab. Erlaubt feingranulares Abhaken innerhalb einer `task`, ohne den Board-Status der Hauptaufgabe zu ueberladen.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `task_id` | uuid (FK → `tasks`) | uebergeordnete Aufgabe (NOT NULL) |
| `title` | text | Bezeichnung der Teilaufgabe/Checklistenpunkt |
| `status` | enum `task_status` | Status (siehe unten) |
| `assigned_to` | uuid (FK → `users`, nullable) | optional eigene ausfuehrende Person |
| `is_done` | boolean | schnelles Checklisten-Flag (Default `false`) |
| `order_index` | integer | Sortierung innerhalb der Checkliste |
| `due_date` | date (nullable) | optionale Teil-Faelligkeit |
| `completed_at` | timestamptz (nullable) | Abschlusszeitpunkt |
| `owner_id` | uuid (FK → `users`) | verantwortliche Person (erbt i.d.R. von `tasks`) |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

> `is_done` und `status` werden konsistent gehalten: `status = done` ⇔ `is_done = true` (Trigger). `is_done` dient der schnellen Checklisten-UI, `status` der einheitlichen Logik mit `tasks`.

### Beziehungen
- **`subtasks` n:1 `tasks`** (ueber `task_id`; harte Abhaengigkeit, beim Soft-Delete der Task kaskadiert der Soft-Delete fachlich mit).
- **`subtasks` n:1 `users`** ueber `assigned_to`/`owner_id`.
- Polymorph (optional): `comments`, `activity_logs`.

### Statusfelder / Enums
- `task_status`: `todo`, `in_progress`, `review`, `done`, `blocked` (kanonisch, geteilt mit `tasks`).

### Wichtige Indizes
- Index auf `task_id` - alle Subtasks einer Aufgabe (haeufigste Abfrage).
- Composite Index `(task_id, order_index)` - geordnete Checklisten-Anzeige.
- Index auf `assigned_to` - persoenliche Teilaufgaben.
- Partial Index `WHERE is_done = false AND deleted_at IS NULL` - offene Checklistenpunkte.

### Sicherheitsregeln (RLS)
- **Abgeleitet von der Eltern-Task:** Wer die zugehoerige `task` lesen/aendern darf (RLS-Join ueber `task_id`), darf auch deren Subtasks im selben Umfang sehen bzw. bearbeiten.
- **Erstellen / Aendern / Abhaken:** `assigned_to` der Eltern-Task, deren `owner_id` und der zustaendige `project_manager`; AI-Engines koennen Checklisten generieren (Service-Account).
- **Loeschen:** Soft-Delete durch Owner/PM der Eltern-Task; harte Loeschung nur `super_admin`. `viewer` rein lesend.

---

## 5.10 `contracts`

### Zweck
Haelt laufende Vertraege eines Kunden mit Laufzeit, vereinbarten Leistungen und Wert fest. `contracts` verbindet die Kunden-Domaene mit Finance (wiederkehrende Umsaetze) und Produktion (Projekte als Lieferung des Vertrags).

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `client_id` | uuid (FK → `clients`) | Vertragspartner (Kunde) |
| `offer_id` | uuid (FK → `offers`, nullable) | zugrunde liegendes angenommenes Angebot |
| `contract_number` | text (unique) | fortlaufende Vertragsnummer |
| `title` | text | Vertragsbezeichnung |
| `status` | enum `contract_status` | Vertragsstatus (siehe unten) |
| `billing_interval` | enum `billing_interval` | Abrechnungsrhythmus (siehe unten) |
| `value_amount` | bigint | Vertragswert in Rappen (pro Intervall bzw. Gesamtwert je `billing_interval`) |
| `mrr_amount` | bigint | normalisierter monatlicher Wert in Rappen (fuer MRR/ARR-Rollup) |
| `currency` | text | Waehrung (Default `CHF`) |
| `start_date` | date | Vertragsbeginn |
| `end_date` | date (nullable) | Vertragsende (leer = unbefristet) |
| `notice_period_days` | integer (nullable) | Kuendigungsfrist in Tagen |
| `auto_renew` | boolean | automatische Verlaengerung (Default `false`) |
| `signed_at` | timestamptz (nullable) | Zeitpunkt der Unterzeichnung |
| `cancelled_at` | timestamptz (nullable) | Kuendigungszeitpunkt |
| `owner_id` | uuid (FK → `users`) | verantwortliche Person (Account Manager/CSO) |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

### Beziehungen
- **`contracts` n:1 `clients`** (ueber `client_id`).
- **`contracts` n:1 `offers`** (ueber `offer_id`; das angenommene Angebot wird zum Vertrag).
- **`contracts` 1:n `projects`** (Vertrag liefert ueber ein oder mehrere Projekte).
- **`contracts` 1:n `invoices`** (Rechnungen referenzieren den Vertrag in der Finance-Domaene).
- Polymorph: `files`/`attachments` (Vertragsdokument-PDF), `comments`, `activity_logs`.

### Statusfelder / Enums
- `contract_status`: `draft`, `active`, `expired`, `cancelled` (kanonisch).
- `billing_interval` (Abrechnungsrhythmus): `monthly`, `quarterly`, `yearly`, `one_time`. Basis fuer die Normalisierung auf `mrr_amount`.

### Wichtige Indizes
- Index auf `client_id` - alle Vertraege eines Kunden.
- Index auf `status` - aktive vs. ausgelaufene/gekuendigte Vertraege.
- `UNIQUE (org_id, contract_number)` - eindeutige Vertragsnummer.
- Index auf `end_date` - Auslauf-/Verlaengerungs-Warnungen (Cron Job).
- Index auf `offer_id` (FK-Join).
- Index auf `mrr_amount` - schnelle MRR/ARR-Aggregation in Finance.

### Sicherheitsregeln (RLS)
- **Lesen:** betreuender `account_manager`/`owner_id` des Kunden; `finance` (vollumfaenglich, Finanzkontext); `cso`, `ceo`, `super_admin`. `project_manager` darf den verknuepften Vertrag seines Projekts lesen (Leistungsumfang), aber keine Konditionen aendern. `viewer` lesend auf freigegebene Sichten.
- **Erstellen:** entsteht regulaer aus angenommenem `offer`; manuell nur `cso`, betreuender Account Manager, `super_admin`.
- **Aendern:** `cso`, Account Manager (`owner_id`), `finance` (Werte/Intervall), `super_admin`. Statuswechsel nach `active` setzt `signed_at`; nach `cancelled` setzt `cancelled_at`. Aenderungen sind besonders streng audit-pflichtig.
- **Loeschen:** Soft-Delete nur `cso`/`super_admin`; harte Loeschung nur `super_admin`.

---

## 5.11 `offers`

### Zweck
Verwaltet Angebote/Proposals mit Positionen, Gesamtwert, Gueltigkeit und Status. `offers` ueberbrueckt Lead und Kunde: aus einem angenommenen Angebot entsteht ein Vertrag und damit ein Kunde.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `lead_id` | uuid (FK → `leads`, nullable) | Empfaenger-Lead |
| `client_id` | uuid (FK → `clients`, nullable) | Empfaenger-Kunde (bei Upsell an Bestandskunden) |
| `contact_id` | uuid (FK → `contacts`, nullable) | adressierte Ansprechperson |
| `offer_number` | text (unique) | fortlaufende Angebotsnummer |
| `title` | text | Angebotsbezeichnung |
| `status` | enum `offer_status` | Angebotsstatus (siehe unten) |
| `total_amount` | bigint | Angebotssumme in Rappen (Summe der Positionen) |
| `currency` | text | Waehrung (Default `CHF`) |
| `valid_until` | date (nullable) | Gueltigkeitsdatum |
| `line_items` | jsonb | strukturierte Positionsliste (Bezeichnung, Menge, Einzelpreis in Rappen) |
| `sent_at` | timestamptz (nullable) | Versandzeitpunkt |
| `accepted_at` | timestamptz (nullable) | Annahmezeitpunkt |
| `rejected_at` | timestamptz (nullable) | Ablehnungszeitpunkt |
| `source` | enum `offer_source` | manuell vs. vom Proposal Generator erzeugt |
| `owner_id` | uuid (FK → `users`) | verantwortlicher Sales-Mitarbeitender |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

> Geschaeftsregel: Genau eines von `lead_id` oder `client_id` ist gesetzt (CHECK), je nachdem ob Neukunden-Angebot oder Upsell.

### Beziehungen
- **`offers` n:1 `leads`** (ueber `lead_id`) bzw. **n:1 `clients`** (ueber `client_id`).
- **`offers` n:1 `contacts`** (ueber `contact_id`).
- **`offers` 1:1/1:n `contracts`** (angenommenes Angebot → Vertrag, ueber `contracts.offer_id`).
- Polymorph: `files`/`attachments` (Angebots-PDF), `comments`, `activity_logs`, `tags`/`taggables`.

### Statusfelder / Enums
- `offer_status`: `draft`, `sent`, `accepted`, `rejected`, `expired` (kanonisch).
- `offer_source` (Herkunft): `manual`, `engine` (`engine` = Proposal Generator).

### Wichtige Indizes
- Index auf `lead_id` und `client_id` - Angebote je Lead/Kunde.
- Index auf `status` - offene vs. angenommene/abgelehnte Angebote (Pipeline).
- `UNIQUE (org_id, offer_number)` - eindeutige Angebotsnummer.
- Index auf `owner_id` - "meine Angebote"/RLS.
- Index auf `valid_until` - Ablauf-Warnungen (Cron → Status `expired`).
- Index auf `created_at` - chronologische Sortierung.

### Sicherheitsregeln (RLS)
- **Lesen:** `owner_id`-Inhaber; alle `sales` (Team-Sicht); betreuender Account Manager bei Upsell-Angeboten an Bestandskunden; `cso`, `ceo`, `finance`, `super_admin`; `viewer` lesend.
- **Erstellen:** `sales`, `cso`, `super_admin`; der Proposal Generator via Service-Account (`source = engine`, Status `draft`).
- **Aendern:** Owner und `cso`/`super_admin`. Statuswechsel: `sent` setzt `sent_at`, `accepted` setzt `accepted_at` (loest Vertrags-/Kundenanlage aus), `rejected` setzt `rejected_at`. Hochpreisige Angebote koennen ein `approve`-Recht (`cso`/`ceo`) vor dem Versand erfordern.
- **Loeschen:** Soft-Delete durch Owner/`cso`; harte Loeschung nur `super_admin`.

---

## 5.12 `meetings`

### Zweck
Erfasst Termine und Gespraeche - sowohl Sales-Termine (zu Leads) als auch Kundentermine (zu Clients) - inklusive Teilnehmern, Zeitfenster und Ergebnis. `meetings` wird vom Meeting Assistant unterstuetzt, der Vorbereitung, Zusammenfassung und Folgeaufgaben erzeugt.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `lead_id` | uuid (FK → `leads`, nullable) | Bezug zu einem Lead (Sales-Termin) |
| `client_id` | uuid (FK → `clients`, nullable) | Bezug zu einem Kunden (Kundentermin) |
| `contact_id` | uuid (FK → `contacts`, nullable) | externe Hauptansprechperson |
| `title` | text | Terminbezeichnung |
| `type` | enum `meeting_type` | Terminart (siehe unten) |
| `status` | enum `meeting_status` | Terminstatus (siehe unten) |
| `location` | text | Ort bzw. Meeting-Link |
| `starts_at` | timestamptz | Beginn |
| `ends_at` | timestamptz | Ende |
| `summary` | text (nullable) | Zusammenfassung (oft vom Meeting Assistant) |
| `notes` | text (nullable) | manuelle Notizen |
| `owner_id` | uuid (FK → `users`) | organisierende/verantwortliche Person |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

### Beziehungen
- **`meetings` n:1 `leads`** bzw. **n:1 `clients`** (genau einer von beiden Bezuegen ist fachlich gesetzt).
- **`meetings` n:1 `contacts`** (externe Ansprechperson).
- **`meetings` n:m `users`** ueber die Hilfstabelle `meeting_participants` (interne Teilnehmer inkl. Zusage-Status).
- **`meetings` 1:n `tasks`** - der Meeting Assistant erzeugt Folge-Tasks (Verknuepfung via `task`-Quelle/Referenz).
- Polymorph: `files`/`attachments` (Transkript, Unterlagen), `comments`, `activity_logs`.

### Statusfelder / Enums
- `meeting_status`: `scheduled`, `completed`, `cancelled`, `no_show`.
- `meeting_type` (Art): `sales_call`, `discovery`, `pitch`, `onboarding`, `review`, `internal`. Reine `review`-Routine-Calls mit Kunden laufen ueber `reporting_calls` (siehe 5.13).

### Wichtige Indizes
- Index auf `owner_id` - "meine Termine"/RLS.
- Index auf `lead_id` und `client_id` - Termine je Lead/Kunde.
- Index auf `starts_at` - Kalender-/Tagessicht und kommende Termine.
- Index auf `status` - anstehende vs. erledigte Termine.
- Composite Index `(org_id, starts_at)` - chronologische Kalenderabfrage.

### Sicherheitsregeln (RLS)
- **Lesen:** `owner_id`-Organisator; alle ueber `meeting_participants` eingetragenen Teilnehmer; wer den verknuepften Lead/Kunden sehen darf; `cso`, `ceo`, `super_admin`; `viewer` lesend auf freigegebene Kalendersichten.
- **Erstellen:** `sales`, `project_manager`, betreuende Account Manager, `cso`, `super_admin`.
- **Aendern:** Organisator (`owner_id`) und `cso`/`super_admin`; Teilnehmer duerfen ihren eigenen Zusage-Status in `meeting_participants` pflegen. Statuswechsel `completed` erlaubt Erfassen von `summary`; `cancelled`/`no_show` dokumentiert das Nicht-Stattfinden.
- **Loeschen:** Soft-Delete durch Organisator; harte Loeschung nur `super_admin`.

---

## 5.13 `reporting_calls`

### Zweck
Bildet wiederkehrende Reporting-/Review-Calls mit Bestandskunden ab (z.B. monatliches Performance-Review). Stellt sicher, dass jeder betreute Kunde einen festen Reporting-Rhythmus hat und der naechste Termin operativ sichtbar bleibt.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `client_id` | uuid (FK → `clients`) | Kunde des Reporting-Calls (NOT NULL) |
| `contact_id` | uuid (FK → `contacts`, nullable) | kundenseitige Ansprechperson |
| `meeting_id` | uuid (FK → `meetings`, nullable) | konkreter Termin-Datensatz des aktuellen Calls |
| `title` | text | Bezeichnung (z.B. "Monatliches Performance-Review") |
| `cadence` | enum `report_cadence` | Wiederholungsrhythmus (siehe unten) |
| `status` | enum `reporting_call_status` | Status des aktuellen Zyklus (siehe unten) |
| `scheduled_at` | timestamptz (nullable) | geplanter Zeitpunkt des naechsten Calls |
| `last_held_at` | timestamptz (nullable) | Zeitpunkt des letzten durchgefuehrten Calls |
| `next_due_date` | date (nullable) | Faelligkeit des naechsten Calls (Cron erzeugt Aufgabe) |
| `summary` | text (nullable) | Ergebnis/Zusammenfassung des letzten Calls |
| `owner_id` | uuid (FK → `users`) | verantwortliche Person (Account Manager) |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

### Beziehungen
- **`reporting_calls` n:1 `clients`** (ueber `client_id`).
- **`reporting_calls` n:1 `contacts`** (ueber `contact_id`).
- **`reporting_calls` n:1 `meetings`** (ueber `meeting_id`; der aktuelle Zyklus ist als konkreter `meeting`-Termin abgebildet).
- **`reporting_calls` 1:n `tasks`** - faellige Calls erzeugen Vorbereitungs-/Folgeaufgaben.
- Polymorph: `files`/`attachments` (Report-PDFs), `comments`, `activity_logs`.

### Statusfelder / Enums
- `reporting_call_status`: `scheduled`, `held`, `skipped`, `overdue`.
  - `held` = durchgefuehrt; `skipped` = bewusst ausgelassen; `overdue` = ueberfaellig (von Cron gesetzt, wenn `next_due_date` ueberschritten).
- `report_cadence` (Rhythmus): `weekly`, `biweekly`, `monthly`, `quarterly`.

### Wichtige Indizes
- Index auf `client_id` - Reporting-Historie je Kunde.
- Index auf `owner_id` - "meine Reporting-Calls"/RLS.
- Index auf `next_due_date` - faellige/ueberfaellige Calls (Cron + Tagesliste).
- Index auf `status` - offene vs. erledigte Zyklen.
- Index auf `meeting_id` (FK-Join zum konkreten Termin).

### Sicherheitsregeln (RLS)
- **Lesen:** betreuender `account_manager`/`owner_id`; `cso`, `ceo`, `super_admin`; `viewer` lesend auf freigegebene Kundensichten. Sichtbarkeit folgt zusaetzlich der Sichtbarkeit des zugehoerigen Kunden (`client_id`).
- **Erstellen / Aendern:** verantwortlicher Account Manager (`owner_id`), `cso`, `super_admin`. Statuswechsel `held` setzt `last_held_at` und erlaubt `summary`; der Cron-Job setzt automatisch `overdue` und legt Vorbereitungs-Tasks an.
- **Loeschen:** Soft-Delete durch Owner/`cso`; harte Loeschung nur `super_admin`.

---

## 5.14 `content_items`

### Zweck
Repraesentiert einzelne Content-Stuecke (Posts, Reels, Captions, Skripte) als kleinste Lieferleistungs-Einheit im Produktions-Workflow. `content_items` durchlaeuft eine eigene Produktions-Pipeline vom Idee bis zur Veroeffentlichung und wird vom Content Script Generator unterstuetzt.

### Wichtigste Felder
| Feld | Typ | Zweck |
| --- | --- | --- |
| `id` | uuid (PK) | technischer Schluessel |
| `org_id` | uuid (FK → `organizations`) | Mandantenzuordnung |
| `project_id` | uuid (FK → `projects`, nullable) | zugehoeriges Produktionsprojekt |
| `client_id` | uuid (FK → `clients`) | Kunde, fuer den der Content produziert wird |
| `shoot_id` | uuid (FK → `shoots`, nullable) | zugehoeriger Dreh (falls aus einem Shoot stammend) |
| `title` | text | Arbeitstitel des Content-Stuecks |
| `format` | enum `content_format` | Format (siehe unten) |
| `channel` | enum `content_channel` | Zielplattform (siehe unten) |
| `status` | enum `content_status` | Produktionsstatus (siehe unten) |
| `script` | text (nullable) | Skript/Caption-Text (oft vom Content Script Generator) |
| `caption` | text (nullable) | finale Caption/Beschreibung |
| `assigned_to` | uuid (FK → `users`, nullable) | produzierende Person (Creative) |
| `owner_id` | uuid (FK → `users`) | verantwortliche Person |
| `due_date` | date (nullable) | Liefer-/Redaktionsdatum |
| `scheduled_at` | timestamptz (nullable) | geplanter Veroeffentlichungszeitpunkt |
| `published_at` | timestamptz (nullable) | tatsaechliche Veroeffentlichung |
| `source` | enum `content_source` | manuell vs. von Content Opportunity Engine angestossen |
| `created_by` / `updated_by` | uuid (FK → `users`) | Audit |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |
| `deleted_at` | timestamptz (nullable) | Soft-Delete |

### Beziehungen
- **`content_items` n:1 `projects`** (ueber `project_id`).
- **`content_items` n:1 `clients`** (ueber `client_id`).
- **`content_items` n:1 `shoots`** (ueber `shoot_id`; aus einem Dreh entstehen mehrere Content-Stuecke).
- **`content_items` n:1 `users`** ueber `assigned_to`/`owner_id`.
- Polymorph: `files`/`attachments` (Roh- und Schnitt-Assets in Storage), `comments`, `tags`/`taggables`, `activity_logs`.

### Statusfelder / Enums
- `content_status`: `idea`, `scripting`, `production`, `review`, `published` (kanonisch).
- `content_format` (Format): `post`, `reel`, `story`, `caption`, `script`, `carousel`, `video`.
- `content_channel` (Plattform): `instagram`, `tiktok`, `linkedin`, `youtube`, `facebook`, `other`.
- `content_source` (Herkunft): `manual`, `engine` (`engine` = Content Opportunity / Content Script Generator).

### Wichtige Indizes
- Index auf `client_id` - Content je Kunde (Redaktionsplan).
- Index auf `project_id` - Content je Projekt.
- Index auf `assigned_to` - persoenliche Produktionsliste (Creative).
- Index auf `status` - Content-Board-Spalten.
- Index auf `due_date` und `scheduled_at` - Redaktionskalender/Tagesliste.
- Index auf `shoot_id` (FK-Join).
- Composite Index `(client_id, status, due_date)` - haeufigste Redaktionsplan-Abfrage.

### Sicherheitsregeln (RLS)
- **Lesen:** `assigned_to` und `owner_id`; Mitglieder des zugehoerigen Projekts (`project_members`); betreuender Account Manager des Kunden; `project_manager`, `creative`, `cso`, `ceo`, `super_admin`; `viewer` lesend auf freigegebene Redaktionsplaene.
- **Erstellen:** `creative`, `project_manager`, `cso`, `super_admin`; die Content-Engines via Service-Account (`source = engine`, Status `idea`).
- **Aendern:** `assigned_to` (Skript, Caption, Status innerhalb der Produktions-Pipeline), `owner_id` und zustaendiger `project_manager` (alle Felder). Statuswechsel nach `published` setzt `published_at`. Freigabe vor Veroeffentlichung kann ein `approve`-Recht (PM/Account Manager) erfordern.
- **Loeschen:** Soft-Delete durch Owner/PM; harte Loeschung nur `super_admin`.

---

## 5.15 Querschnitts-Hinweise zu Teil 1

- **Konsistenz der Zuweisungsfelder:** `owner_id` = verantwortliche Person, `assigned_to` = ausfuehrende Person (nur dort, wo beide abweichen koennen: `tasks`, `subtasks`, `content_items`). `created_by`/`updated_by` sind reine Audit-Felder.
- **Engine-Herkunft einheitlich:** Tabellen, die von AI-Engines befuellt werden (`leads`, `offers`, `tasks`, `subtasks`, `content_items`), tragen ein `source`-Feld mit dem Wert `engine` (bzw. `automation`), damit maschinell erzeugte von manuellen Datensaetzen unterscheidbar bleiben.
- **Soft-Delete-Kaskade fachlich:** Beim Soft-Delete eines Elternobjekts (z.B. `tasks` → `subtasks`, `projects` → abhaengige Lieferleistungen) werden Kinder fachlich mit-deaktiviert; technisch geschieht dies ueber Server Actions/Trigger, nicht ueber harte DB-Kaskaden.
- **RLS-Konstante:** Jede Policy beginnt mit `org_id = aktuelle_org()`; erst danach greifen Ownership- und Rollenpruefungen. `viewer` bleibt ueberall schreibfrei, `super_admin` ist die einzige Rolle mit Recht auf harte Loeschung.
- **Audit & Activity:** Jede schreibende Aktion auf diesen 14 Tabellen erzeugt einen `audits`-Eintrag (wer/was/wann/alt-neu); jede sichtbare Statusaenderung zusaetzlich einen `activity_logs`-Eintrag fuer den objektbezogenen Verlauf.

> **Fortsetzung:** Die verbleibenden 13 Kern-Tabellen (`opportunities`, `outreach_emails`, `websites`, `ad_campaigns`, `crm_builds`, `creators`, `shoots`, `files`, `automations`, `expenses`, `invoices`, `audits`, `activity_logs`) sowie alle Hilfstabellen werden in Datenmodell - Teil 2 behandelt.
