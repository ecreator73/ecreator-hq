# eCreator OS - Rollen & Berechtigungsmatrix

> Blueprint-Abschnitt 02 (Prompt 0 - Planung). Schliesst die in der QA gemeldete Luecke zu Anforderung 4 (Rollen & Berechtigungsmatrix). Baut verbindlich auf der kanonischen Referenz (`00-kanonische-referenz.md`, Abschnitt 3, 4 und 8) sowie auf den Tabellen `roles`, `permissions` und `role_permissions` aus dem Datenmodell (`03-datenmodell-kern.md`, Abschnitte 5.2 und 5.3) auf. Alle Rollen-, Tabellen-, Aktions- und Status-Namen sind exakt von dort uebernommen. Bei Konflikten gilt immer die kanonische Referenz.
>
> Dieses Dokument fuehrt die heute pro Tabelle in Prosa verstreuten RLS-Regeln (`03`/`04`) in einer geschlossenen Matrix zusammen. Es ersetzt diese Regeln nicht, sondern verdichtet sie zu einer einheitlichen, pruefbaren Referenz. Die feldgenauen Sichtbarkeits- und Sonderregeln je Tabelle bleiben in `03`/`04` massgeblich.

---

## 1 Grundmodell der Rechtevergabe

### 1.1 Wie Rechte technisch entstehen

Berechtigungen in eCreator OS entstehen aus dem Zusammenspiel von drei kanonischen Tabellen:

- **`roles`** - die neun kanonischen Rollen (Abschnitt 3 der Referenz). Jeder `users`-Datensatz traegt genau eine primaere `role_id`.
- **`permissions`** - granulare Einzelrechte im Muster `resource.action` (z.B. `leads.create`, `invoices.approve`), mit `resource` (betroffene Tabelle) und `action` (Wert aus `permission_action`).
- **`role_permissions`** - die n:m-Hilfstabelle, die einer Rolle ihre Rechte zuordnet. Die hier dokumentierte Matrix ist die fachliche Vorlage fuer den Inhalt dieser Tabelle.

Die effektive Durchsetzung erfolgt **zweistufig**: Die Anwendungsschicht (Server Actions, API Routes) prueft die Rechte aus `role_permissions` fuer Sichtbarkeit und Aktions-Buttons; Row Level Security (RLS) auf jeder fachlichen Tabelle setzt dieselbe Logik datenbankseitig hart durch. Kein Recht existiert nur im UI - jedes Recht hat eine korrespondierende RLS-Policy.

### 1.2 Die sieben Aktionen (`permission_action`)

Die Matrix verwendet ausschliesslich die sieben kanonischen Werte des Enums `permission_action` (`03-datenmodell-kern.md`, 5.3):

| Aktion | Bedeutung | Typische Auspraegung |
| --- | --- | --- |
| `create` | Neuen Datensatz anlegen | INSERT (inkl. Engine-/Automation-Service-Accounts, wo vermerkt) |
| `read` | Datensatz lesen/anzeigen | SELECT, gefiltert nach `org_id` + Ownership/Rolle |
| `update` | Bestehenden Datensatz aendern | UPDATE einzelner oder aller Felder (feldgenau in `03`/`04`) |
| `delete` | Datensatz **soft**-loeschen (`deleted_at` setzen) | logische Loeschung; harte Loeschung ist **keine** `delete`-Aktion (siehe 4.2) |
| `manage` | Vollstaendige Verwaltung inkl. Konfiguration | umfasst create+read+update+delete plus Sonderbefugnisse (z.B. Rollen zuweisen, harte Loeschung, Integrationen schalten) |
| `export` | Daten exportieren (CSV/PDF/Berichte) | gesonderter Datenexport, getrennt von `read` |
| `approve` | Freigeben/Genehmigen | Statuswechsel mit Freigabecharakter (Angebote versenden/annehmen, Rechnungen freigeben, Content-Freigabe) |

> `manage` ist die staerkste Aktion und schliesst die vier CRUD-Aktionen fachlich ein. In der Matrix wird `manage` nur dort vergeben, wo eine Rolle die Ressource vollumfaenglich verantwortet; einzelne CRUD-Spalten werden dann der Lesbarkeit halber als `(M)` markiert (von `manage` abgedeckt), nicht doppelt vergeben.

### 1.3 RLS-Grundmuster (Wiederholung aus `03`)

Jede RLS-Policy beginnt mit `org_id = aktuelle_org()` (Mandantengrenze, zukunftssicher fuer Multi-Tenancy). Erst danach greifen zwei kombinierbare Zugriffsmodelle:

- **Ownership-basiert** - Zugriff, weil der Datensatz der Person gehoert (`owner_id = auth.uid()`), ihr zugewiesen ist (`assigned_to = auth.uid()`) oder sie ueber eine Hilfstabelle (`project_members`, `meeting_participants`) verbunden ist.
- **Rollenbasiert** - Zugriff, weil die Rolle bereichsweiten Zugriff hat (z.B. `cso` auf alle Sales-Tabellen, `ceo`/`super_admin` lesend auf alles).

Die nachstehende Matrix beschreibt die **rollenbasierte Obergrenze** je Ressource. Ownership-Einschraenkungen (z.B. "`sales` darf nur eigene Leads aendern") sind in Abschnitt 5 und in `03`/`04` feldgenau ausgefuehrt.

---

## 2 Die neun Rollen - Zweck in einem Satz

| Rolle | Schluessel (`roles.key`) | Zweck (1 Satz) |
| --- | --- | --- |
| Super Admin | `super_admin` | Technischer Vollzugriff inkl. Organisation, Rollen, Integrationen und Audit Logs; verwaltet die Plattform selbst und ist die einzige Rolle mit Recht auf harte Loeschung. |
| CEO | `ceo` | Geschaeftsfuehrung mit lesendem Vollblick auf alle Bereiche plus strategische Steuerung von Zielen, Genehmigungen und Hochpreis-Freigaben. |
| CSO | `cso` | Verantwortet Vertrieb und Wachstum end-to-end: steuert Pipeline, Opportunities, Angebote und das Sales-Team vollumfaenglich. |
| Sales | `sales` | Bearbeitet Leads, Angebote und Outreach und treibt Deals bis zum Abschluss - im Rahmen der eigenen bzw. zugewiesenen Datensaetze. |
| Project Manager | `project_manager` | Plant und koordiniert Projekte, Aufgaben und Liefertermine ueber alle Produktionsgewerke hinweg und verantwortet die Lieferung. |
| Developer | `developer` | Setzt Website- und CRM-Builds technisch um und pflegt die zugehoerigen Aufgaben innerhalb der ihm zugeordneten Projekte. |
| Creative | `creative` | Produziert Content, Skripte und Drehs (Video/Foto/Design) und arbeitet eng mit dem Creator-Pool zusammen. |
| Finance | `finance` | Verwaltet Rechnungen, Ausgaben, wiederkehrende Umsaetze und finanzielle Berichte und ist alleinige Rolle mit voller Sicht auf Geldfelder. |
| Viewer | `viewer` | Reiner Lesezugriff auf freigegebene Bereiche, ohne jegliches Bearbeitungs-, Freigabe- oder Loeschrecht. |

---

## 3 Berechtigungsmatrix (Rolle x Kern-Ressource x Aktion)

### 3.1 Legende

- Ein Eintrag nennt die fuer diese Rolle auf dieser Ressource erlaubten `permission_action`-Werte.
- **`manage`** schliesst `create`/`read`/`update`/`delete` ein; abgedeckte CRUD-Aktionen werden nicht zusaetzlich aufgefuehrt.
- **`read*`** = eingeschraenktes Lesen (nur eigene bzw. ueber Ownership/Projektzugehoerigkeit verbundene Datensaetze; rollenbasierte Bereichssicht greift nicht).
- **`read (frei)`** = Lesen nur auf ausdruecklich freigegebene Sichten (gilt fuer `viewer`).
- **`update*`** = eingeschraenktes Aendern (nur eigene/zugewiesene Datensaetze bzw. nur bestimmte Felder; Details in `03`/`04`).
- **`-`** = kein Recht.
- Geldfelder (`*_amount`, `mrr_amount`, `value_amount`, `total_amount`, `budget_amount`): Sichtbarkeit zusaetzlich nach Abschnitt 4.3 eingeschraenkt; `read` auf der Ressource bedeutet nicht automatisch Sicht auf alle Geldfelder.

> Die Matrix ist nach den Domaenen der kanonischen Tabellenliste (`00`, Abschnitt 4) gegliedert. `super_admin` hat auf **jede** Ressource `manage` und ist die einzige Rolle mit harter Loeschung; zur besseren Lesbarkeit ist `super_admin` als eigene Spalte ganz rechts gefuehrt.

### 3.2 Domaene A - Identitaet & Zugriff

| Ressource | viewer | sales | creative | developer | project_manager | finance | cso | ceo | super_admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | read (frei, Basisprofil) | read (Basisprofil) | read (Basisprofil) | read (Basisprofil) | read (Basisprofil) | read (Basisprofil) | read | read | manage |
| `roles` | read | read | read | read | read | read | read | read | manage |
| `permissions` | read | read | read | read | read | read | read | read | manage |

> Jede Rolle darf ihr **eigenes** Profil (`users` mit `id = auth.uid()`) im definierten Umfang aendern (`update*`: `full_name`, `display_name`, `avatar_url`, `phone`) - unabhaengig von der obigen Zeile. Rollen zuweisen, einladen, sperren, deaktivieren sowie `role_permissions` pflegen kann ausschliesslich `super_admin` (Teil von `manage`).

### 3.3 Domaene B - Sales & Akquise

| Ressource | viewer | sales | creative | developer | project_manager | finance | cso | ceo | super_admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `leads` | read (frei) | create, read, update*, delete*, export | - | - | read* | read | manage, export | read, export | manage |
| `opportunities` | read (frei) | create, read, update*, approve* | read* (eigene Domaene) | read* (eigene Domaene) | read* | - | manage, approve | read, approve | manage |
| `offers` | read (frei) | create, read, update*, delete*, export | - | - | read* | read, export | manage, approve, export | read, approve, export | manage |
| `outreach_emails` | read (frei) | create, read, update*, delete* | - | - | - | - | manage | read | manage |

> `approve` auf `opportunities` = angenommene Chance verbindlich machen (`accepted`), die Folgeaufgaben/Angebote ausloest. `approve` auf `offers` = Hochpreis-Angebot vor dem Versand freigeben bzw. Annahme bestaetigen (siehe 4.4).

### 3.4 Domaene C - Kunden & Beziehung

| Ressource | viewer | sales | creative | developer | project_manager | finance | cso | ceo | super_admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `clients` | read (frei) | create, read, update* | read* (ueber Projekt) | read* (ueber Projekt) | read, update* | read | manage, export | read, export | manage |
| `contacts` | read (frei) | create, read, update* | read* (ueber Projekt) | read* (ueber Projekt) | create, read, update* | read | manage | read | manage |
| `contracts` | read (frei) | read* | - | read* (Leistungsumfang) | read* (Leistungsumfang) | read, update (Werte), export | manage, approve, export | read, approve, export | manage |
| `meetings` | read (frei) | create, read, update* | read* (Teilnehmer) | read* (Teilnehmer) | create, read, update* | - | manage | read | manage |
| `reporting_calls` | read (frei) | read* | - | - | create, read, update* | read | manage | read | manage |

> `consent_status` auf `contacts` (DSG/UWG-relevant) darf nur die verantwortliche Person bzw. `cso`/`super_admin` setzen - audit-pflichtig (siehe `03`, 5.6). `update (Werte)` auf `contracts` fuer `finance` = ausschliesslich wert-/intervallbezogene Felder (`value_amount`, `mrr_amount`, `billing_interval`), nicht die Vertragskonditionen.

### 3.5 Domaene D - Produktion & Lieferung

| Ressource | viewer | sales | creative | developer | project_manager | finance | cso | ceo | super_admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `projects` | read (frei) | read* | read* (Mitglied) | read* (Mitglied) | create, read, update, delete, export | read (Budget) | read, export | read, export | manage |
| `tasks` | read (frei) | create*, read*, update* | create*, read*, update* | create*, read*, update* | manage (eigene Projekte) | - | read | read | manage |
| `subtasks` | read (frei) | create*, read*, update* | create*, read*, update* | create*, read*, update* | manage (eigene Projekte) | - | read | read | manage |
| `content_items` | read (frei) | read* | create, read, update*, approve* | read* | manage, approve | - | read | read | manage |
| `websites` | read (frei) | - | read* | create, read, update* | manage | - | read | read | manage |
| `ad_campaigns` | read (frei) | read* | read* | read* | manage | read (Budget) | read | read | manage |
| `crm_builds` | read (frei) | - | - | create, read, update* | manage | - | read | read | manage |
| `shoots` | read (frei) | - | create, read, update* | - | manage | - | read | read | manage |

> `manage` fuer `project_manager` ist auf Projekte unter seiner Verantwortung (`owner_id`) bzw. mit ihm als Mitglied (`project_members`) begrenzt. `create*`/`update*` fuer `creative`/`developer`/`sales` auf `tasks`/`subtasks` greift nur innerhalb von Projekten, denen sie zugeordnet sind. `approve*` auf `content_items` = Freigabe vor Veroeffentlichung (PM/Account Manager; Creative nur fuer eigene Stuecke, wo delegiert).

### 3.6 Domaene E - Operations & Dateien

| Ressource | viewer | sales | creative | developer | project_manager | finance | cso | ceo | super_admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `creators` | read (frei) | - | read, update* | - | read, update* | - | read | read | manage |
| `automations` | - | - | - | read* | read, update* | - | read | read | manage |
| `files` | read (frei) | create*, read* | create*, read*, update* | create*, read*, update* | create, read, update, delete | read* (Belege) | read | read | manage |

> `creators` werden i.d.R. durch `project_manager`/`creative` gepflegt; die Recruiting Opportunity Engine schlaegt neue Talente per Service-Account vor. `automations` konfiguriert primaer `super_admin`/`project_manager`; `developer` darf technische Laeufe einsehen. `files`-Vollverwaltung liegt beim verantwortlichen PM; harte Loeschung auch hier nur `super_admin`.

### 3.7 Domaene F - Finanzen

| Ressource | viewer | sales | creative | developer | project_manager | finance | cso | ceo | super_admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `invoices` | - | - | - | - | - | manage, approve, export | read | read, approve, export | manage |
| `expenses` | - | - | - | - | read* (eigene) | manage, export | read | read, export | manage |

> Finanzressourcen sind **nicht** Teil der `viewer`-Freigabesichten. `approve` auf `invoices` = Rechnung vor Versand freigeben bzw. als bezahlt bestaetigen (`finance`; `ceo` zusaetzlich fuer Hochbetrags-Freigaben, siehe 4.4). Geldfelder folgen Abschnitt 4.3.

### 3.8 Domaene G - Audit & Aktivitaet

| Ressource | viewer | sales | creative | developer | project_manager | finance | cso | ceo | super_admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `audits` | - | - | - | - | - | - | - | read, export | read, export, manage |
| `activity_logs` | read* (eigene Objekte) | read* | read* | read* | read* | read* | read* | read | manage |

> `audits` ist revisionssicher: **niemand** darf Eintraege aendern oder loeschen (`update`/`delete` existieren faktisch nicht); `super_admin.manage` umfasst hier ausschliesslich Konfiguration/Aufbewahrung, nicht das Veraendern bestehender Eintraege. `audits` selbst werden ausschliesslich systemseitig (durch jede schreibende Aktion) erzeugt, nicht manuell per `create`.

### 3.9 Hilfstabellen (Kurzregel)

Die acht Hilfstabellen (`notifications`, `tags`, `taggables`, `comments`, `project_members`, `attachments`, `integrations`, `webhooks`) erben ihre Rechte vom verknuepften Hauptobjekt, mit folgenden Praezisierungen:

| Hilfstabelle | Grundregel |
| --- | --- |
| `notifications` | jede Rolle `read`/`update*` (abhaken) **nur** der eigenen Benachrichtigungen (`user_id = auth.uid()`); System erzeugt sie. |
| `tags` / `taggables` | `read` fuer alle; `create`/`update`/`delete` von Tags durch jede bearbeitende Rolle im Rahmen ihrer Objektrechte; `viewer` nur `read`. |
| `comments` | `create`/`read` fuer jede Rolle, die das Zielobjekt sehen darf; `update`/`delete` nur am eigenen Kommentar (bzw. `super_admin`). |
| `project_members` | gepflegt durch `project_manager` (eigene Projekte) und `super_admin`. |
| `attachments` | erbt Rechte des verknuepften Objekts; harte Loeschung der Datei nur `super_admin`. |
| `integrations` / `webhooks` | ausschliesslich `super_admin` (`manage`); `ceo` `read`. Alle anderen Rollen `-`. |

---

## 4 Sonderregeln (verbindlich)

### 4.1 Viewer = strikt lesend

Die Rolle `viewer` erhaelt **niemals** `create`, `update`, `delete`, `manage`, `approve` oder `export` auf irgendeiner Ressource. Ihr einziges Recht ist `read`, und zwar ausschliesslich auf **ausdruecklich freigegebene Sichten** (Pipeline-, Kunden-, Projekt- und Board-Sichten). Finanz- und Audit-Ressourcen (`invoices`, `expenses`, `audits`) sowie Integrationen/Webhooks sind fuer `viewer` vollstaendig unsichtbar. Auf Datenbankebene besitzt `viewer` keine INSERT/UPDATE/DELETE-Policy auf fachlichen Tabellen.

### 4.2 Harte Loeschung ausschliesslich Super Admin

In eCreator OS bedeutet `delete` (CRUD) immer **Soft-Delete**: das Setzen von `deleted_at`; der Datensatz bleibt revisionssicher erhalten und wird in Standardabfragen (`deleted_at IS NULL`) ausgeblendet. Die **harte Loeschung** (physisches Entfernen aus der Datenbank) ist keiner Rolle ueber eine `delete`-Permission zugaenglich, sondern ausschliesslich `super_admin` vorbehalten und Bestandteil von dessen `manage`-Recht. Sie ist zusaetzlich audit-pflichtig (Eintrag in `audits`) und im UI nur ueber `/settings` erreichbar. Damit gilt durchgaengig: **`super_admin` ist die einzige Rolle, die Daten physisch loeschen darf.**

### 4.3 Finance-Sichtbarkeit fuer Geldfelder

Geldfelder (alle Felder auf `_amount`, insbesondere `mrr_amount`, `value_amount`, `total_amount`, `budget_amount`, `estimated_value_amount`) unterliegen einer zusaetzlichen, feldbasierten Sichtbarkeitsregel, die ueber die Tabellen-Lesesicht hinausgeht:

- **Volle Sicht** auf alle Geldfelder haben `finance`, `cso`, `ceo` und `super_admin`.
- **Eingeschraenkte Sicht:** `project_manager` sieht das `budget_amount` der eigenen Projekte; `sales` sieht Werte der eigenen `leads`/`offers`. `developer`, `creative` und `viewer` sehen **keine** Geldfelder, auch wenn sie den umgebenden Datensatz lesen duerfen (z.B. ein Projekt ohne Budgetbetrag).
- **Aenderung von Werten:** Wertaenderungen an `contracts` (`value_amount`, `mrr_amount`, `billing_interval`) und alle `invoices`-/`expenses`-Betraege darf nur `finance` (bzw. `super_admin`) vornehmen; `cso`/Account Manager aendern Vertragskonditionen, aber nicht die normalisierten Finanzwerte.

Technisch wird dies ueber spaltenbezogene RLS bzw. getrennte Lese-Views (Geldfelder ausgeblendet) umgesetzt; die Anwendungsschicht blendet Geldfelder fuer nicht berechtigte Rollen zusaetzlich aus.

### 4.4 Approve-Recht fuer Angebote und Rechnungen

Das `approve`-Recht ist ein eigenstaendiges Freigaberecht, das von `update` getrennt gefuehrt wird, weil es einen Geschaeftsentscheid statt einer reinen Datenaenderung darstellt:

- **`offers`** - Der Wechsel eines Angebots von `draft`/`sent` in einen verbindlichen Zustand bzw. der Versand eines Hochpreis-Angebots erfordert `approve`. Berechtigt sind `cso` und `ceo` (sowie `super_admin`). `sales` darf Angebote erstellen und bearbeiten, aber Angebote oberhalb einer definierten Wertgrenze nicht ohne `approve` durch `cso`/`ceo` versenden.
- **`invoices`** - Eine Rechnung darf erst nach `approve` versendet bzw. als bezahlt bestaetigt werden. Berechtigt ist `finance`; `ceo` haelt zusaetzlich das `approve`-Recht fuer Rechnungen oberhalb einer definierten Betragsschwelle.
- **`opportunities`** - `approve` (= Annahme einer Chance, Statuswechsel `accepted`) liegt bei `sales` (eigene), `cso` und `ceo`.
- **`content_items`** - `approve` (= Freigabe vor Veroeffentlichung) liegt bei `project_manager` und dem betreuenden Account Manager.

Jede `approve`-Aktion erzeugt einen `audits`-Eintrag (wer/was/wann) und einen `activity_logs`-Eintrag am betroffenen Objekt.

### 4.5 CEO vs. Super Admin - Lesen vs. Verwalten

`ceo` hat lesenden Vollblick (`read`/`export`) auf alle fachlichen Bereiche plus strategische `approve`-Rechte (Angebote, Rechnungen, Opportunities), aber **keine** technische Plattformverwaltung: Benutzer anlegen, Rollen/`role_permissions` aendern, Integrationen/Webhooks schalten, `audits`-Aufbewahrung und harte Loeschung bleiben allein bei `super_admin`. `ceo` darf Rollenwechsel beantragen, aber nicht technisch erzwingen (siehe `03`, 5.1).

### 4.6 Service-Accounts der AI-Engines und Automationen

AI-Engines und Automationen schreiben ueber dedizierte Service-Accounts mit eng begrenzten `create`-Rechten und gesetztem Herkunftsfeld (`source = engine` bzw. `source = automation`): die Lead Engine in `leads`, der Proposal Generator in `offers` (Status `draft`), die Content-Engines in `content_items` (Status `idea`), der Meeting Assistant und Automationen in `tasks`/`subtasks`. Diese Service-Accounts besitzen **kein** `delete`-, `approve`- oder `manage`-Recht; jede maschinelle Erzeugung ist anhand des `source`-Feldes nachvollziehbar und audit-pflichtig.

---

## 5 Lesehilfe & Verhaeltnis zu den Datenmodell-Abschnitten

- Diese Matrix ist die **rollenbasierte Obergrenze** je Ressource. Die **feldgenauen** Regeln (welche Spalten eine Rolle sehen/aendern darf, welche Statuswechsel Pflichtfelder setzen) stehen je Tabelle in `03-datenmodell-kern.md` (Abschnitte 5.1-5.14) und `04-datenmodell-erweitert.md`.
- **Ownership schraenkt ein, Rolle erweitert:** Ein `*`-Eintrag (`read*`, `update*`, `create*`) bedeutet, dass die Rolle das Recht nur auf eigene/zugewiesene/projektverbundene Datensaetze hat. Ein Eintrag ohne `*` bedeutet bereichsweiten Zugriff im Rahmen der `org_id`.
- **`manage` ist die Ausnahme, nicht die Regel:** Es wird nur dort vergeben, wo eine Rolle eine Ressource vollumfaenglich verantwortet (z.B. `finance` auf `invoices`, `project_manager` auf eigene `projects`, `super_admin` auf alles).
- **Audit & Activity gelten ausnahmslos:** Jede schreibende Aktion (`create`/`update`/`delete`/`approve`/`manage`) erzeugt einen `audits`-Eintrag; jede sichtbare Statusaenderung zusaetzlich einen `activity_logs`-Eintrag. Dies ist keine Rolle-spezifische Sonderregel, sondern Systemkonstante (siehe `00`, Leitprinzip 3 und 5; `01`, 1.4).

> **Pflegehinweis:** Aenderungen an dieser Matrix muessen synchron in den Tabellen `permissions`/`role_permissions` (Seed-Daten) und in den RLS-Policies nachgezogen werden. Die Matrix ist die fachliche Quelle der Wahrheit fuer beide.
