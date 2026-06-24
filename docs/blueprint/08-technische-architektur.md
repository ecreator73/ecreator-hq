# 11 Technische Architektur

> Blueprint-Abschnitt 08 (Prompt 0 - Planung). Baut verbindlich auf der kanonischen Referenz (`00-kanonische-referenz.md`) auf und fuehrt die bisher nur verstreuten technischen Bausteine (Stack-Nennung in 01 §1.4, Namens-/Status-Konventionen in 00 §8, Engineering-Regeln in 09 §13.2, RLS pro Tabelle in 03/04) zu einem geschlossenen Architektur-Gesamtbild zusammen. Dieses Dokument schliesst die in der QA (`10-qa-konsistenzpruefung.md` §3.2, Anforderung 12) gemeldete Luecke. Es ist reine Planung: **kein** Code, **kein** TypeScript/SQL - alle Strukturen sind beschreibend dargestellt. Bei Konflikten gilt die kanonische Referenz.

---

## 11.0 Architektur-Leitlinien

Die technische Architektur folgt denselben fuenf Leitprinzipien wie das Produkt (00 §1) und uebersetzt sie in Engineering-Entscheidungen:

1. **Eine Plattform. Eine Datenbank. Ein Login. Alles verbunden.** Genau **eine** Next.js-Anwendung (App Router), **ein** Supabase/PostgreSQL-Schema, **eine** Identitaet pro Mitarbeitendem ueber Supabase Auth. Keine Sub-Apps, keine getrennten Datenbanken, keine parallelen Login-Systeme.
2. **Sicher by default.** Row Level Security ist auf jeder fachlichen Tabelle aktiv (09 Regel 12), Secrets liegen nur serverseitig, jede Mutation laeuft ueber validierte Server Actions / API Routes (09 Regel 14). Sicherheit wird nie nachgeruestet.
3. **Server-first.** Daten werden bevorzugt in Server Components geladen und ueber Server Actions mutiert; der Client erhaelt nur, was er sehen darf, und nie Geheimnisse oder Roh-Credentials.
4. **Wiederverwenden statt duplizieren** (09 Regel 21). Querschnittsmuster - RLS-Policy-Vorlage, Audit-Schreibhelfer, Fehlerbehandlung, Logging, Status-Badges, polymorphe Anhaenge/Kommentare/Tags - existieren genau einmal zentral und werden ueberall wiederverwendet.
5. **Nachvollziehbarkeit** (09 Regeln 13, 20). Drei Beobachtungsebenen sind sauber getrennt und ergaenzen sich: fachlicher Verlauf (`activity_logs`), revisionssicherer Audit-Trail (`audits`) und technisches Logging (Abschnitt 11.4).

### 11.0.1 Verbindlicher Technologie-Stack (zusammengefasst)

| Schicht | Technologie | Rolle in der Architektur |
| --- | --- | --- |
| Framework | Next.js (App Router) | Routing, Server Components, Server Actions, API Routes, Rendering |
| Sprache | TypeScript | typsichere Code-Basis, geteilte Typen Client/Server |
| Styling | Tailwind CSS | konsistentes, utility-first UI-System |
| Datenbank | Supabase (PostgreSQL) | Single Source of Truth, 27 Kern-Tabellen + Hilfstabellen |
| Authentifizierung | Supabase Auth | Login, Session, Passwort-Reset, Identitaet (`users`) |
| Autorisierung | Row Level Security + rollenbasierte Rechte | Durchsetzung auf Datenbankebene (`org_id` + Rolle) |
| Schreiblogik | Server Actions + API Routes | validierte Mutationen, Audit-/Activity-Schreibung |
| Zeitsteuerung | Cron Jobs | geplante Laeufe (Engines, Faelligkeiten) - ab Phase 10 |
| Datei-Ablage | Supabase Storage | `files`/`attachments`, signierte URLs |
| Beobachtung | Audit Logs + Activity Logs + technisches Logging | Sicherheit, Fachverlauf, Betrieb |

---

## 11.1 Ordnerstruktur (Next.js App Router)

Die Anwendung ist ein **einzelnes Next.js-Projekt** (Single-App, kein verteiltes Monorepo) mit klarer, domaenenorientierter Gliederung. Die Verzeichnisstruktur spiegelt die sieben Hauptbereiche aus 00 §2 und trennt strikt zwischen Routing (Praesentation), wiederverwendbarer Logik und Infrastruktur. Pfade in englisch/kebab-case, passend zu den kanonischen Routen.

### 11.1.1 Wurzelstruktur

| Verzeichnis (Wurzel) | Zweck |
| --- | --- |
| `src/app/` | App-Router-Baum: Routen, Layouts, Server Actions, Route Handler (API). Praesentations- und Eintrittsschicht. |
| `src/components/` | wiederverwendbare UI-Komponenten (bereichsuebergreifend), inkl. Command-Center-Widget, Status-Badges, Tabellen, Formulare. |
| `src/features/` | fachliche Module gebuendelt nach Domaene (sales, clients, production, ...): bereichsspezifische Komponenten, Hooks und Action-Aufrufe. |
| `src/lib/` | Querschnitts-Logik ohne UI: Supabase-Clients, Audit-/Activity-Helfer, Logging, Fehlerklassen, Validierungsschemata, Berechtigungspruefung. |
| `src/server/` | rein serverseitige Bausteine: Datenzugriff (Repositories/Queries), Engine-Anbindung, Cron-Handler, Secret-Zugriff. Nie an den Client gebuendelt. |
| `src/types/` | geteilte TypeScript-Typen, abgeleitete DB-Typen, Enum-Typen (gespiegelt aus den kanonischen Status-Enums 00 §8). |
| `src/styles/` | globale Tailwind-Konfiguration und Basis-Styles. |
| `supabase/` | Datenbank-Artefakte: Migrationen, RLS-Policies, DB-Funktionen/Trigger, Seed der Stammdaten (Rollen, Tags). |
| `public/` | statische Assets (Logos, Icons), keine schuetzenswerten Daten. |
| `tests/` | automatisierte Tests (Unit, Integration, RLS-/Policy-Tests, E2E). |

### 11.1.2 Aufbau unter `src/app/` (App Router)

Die Routensegmente folgen exakt den kanonischen Pfaden aus 00 §2. Geschuetzte Bereiche liegen in einer authentifizierten Gruppe; oeffentliche Auth-Seiten (Login/Reset) liegen getrennt.

| Segment | Inhalt / Entsprechung |
| --- | --- |
| `app/(auth)/` | oeffentliche Auth-Routen: Login, Passwort-Reset (Supabase Auth), kein App-Shell. |
| `app/(app)/` | authentifizierte Gruppe mit globalem App-Shell (Navigation der 7 Bereiche), Session-Pflicht. |
| `app/(app)/page` | Home / "Mein Tag" (`/`). |
| `app/(app)/my-tasks`, `notifications`, `activity` | restliche Home-Unterseiten. |
| `app/(app)/sales/...` | Pipeline, Leads, Opportunities, Angebote (`offers`), Outreach, Termine (`meetings`). |
| `app/(app)/clients/...` | Kundenuebersicht, `clients/[id]` (Kundenprofil), Kontakte, Vertraege, Reporting-Calls, Growth. |
| `app/(app)/production/...` | Projekte, Board, Content, Websites, Ad-Kampagnen, CRM-Builds, Drehs. |
| `app/(app)/operations/...` | Creator-Pool, Team, Automationen, Dateien, AI-Engines. |
| `app/(app)/finance/...` | Finanzuebersicht, Rechnungen, Ausgaben, Vertragswerte (recurring), Berichte. |
| `app/(app)/settings/...` | Organisation, Benutzer, Rollen, Integrationen, Audit, Profil. |
| `app/api/...` | Route Handler fuer API Routes, Webhooks und Cron-Eintrittspunkte (Abschnitt 11.2.2). |

### 11.1.3 Konventionen je Routensegment

Innerhalb eines Routensegments gilt ein einheitliches Datei-Schema (App-Router-Standarddateien), damit jede Seite gleich aufgebaut ist:

- **Seite** - rendert die Route, laedt Daten server-seitig, prueft Sichtbarkeit (Rolle/RLS).
- **Layout** - bereichsweiter Rahmen (Header, Bereichs-Navigation, Deadline-Leiste / Command-Center-Widget aus 01 §3.2).
- **Lade- und Fehlerzustand** - dedizierter Loading-State und ein Segment-Fehlerzustand (Error Boundary, Abschnitt 11.3).
- **Server Actions** - bereichsspezifische schreibende Aktionen, klar getrennt von der Darstellung.
- **Nicht-gefunden-Zustand** - fuer Detailrouten (z. B. `clients/[id]`).

> Grundsatz: **In `app/` lebt Praesentation und Orchestrierung, nicht die Domaenenlogik.** Fachliche Regeln, Datenzugriff und Validierung liegen in `src/features`, `src/lib` und `src/server` und werden von den Routen nur aufgerufen.

---

## 11.2 Naming der Code-Artefakte

Erweitert die kanonischen Konventionen aus 00 §8 (die fuer Tabellen, Felder, API-Routen und Server Actions gelten) auf alle uebrigen Code-Artefakte. Datenbank-Naming bleibt unveraendert verbindlich; dieser Abschnitt regelt den Anwendungscode.

### 11.2.1 Uebersicht der Namenskonventionen

| Artefakt | Konvention | Beispielmuster (beschreibend) |
| --- | --- | --- |
| React-Komponente (Datei + Symbol) | `PascalCase` | `LeadPipelineBoard`, `CommandCenterWidget`, `StatusBadge` |
| Hook | `camelCase` mit `use`-Praefix | `useCurrentUser`, `useTaskFilters` |
| Server Action | `camelCase`, Verb + Ressource (00 §8) | `createLead`, `updateProjectStatus`, `assignTask` |
| API-Route (Pfad) | `kebab-case`, Plural (00 §8) | `/api/outreach-emails`, `/api/ad-campaigns` |
| Route Handler / Cron-Handler | `camelCase`, Verb-orientiert | `handleStripeWebhook`, `runDailyEngineSweep` |
| Datenzugriff (Repository/Query) | `camelCase`, Ressource + Operation | `getClientById`, `listOverdueInvoices` |
| Validierungsschema | `PascalCase` + `Schema`-Suffix | `CreateLeadSchema`, `UpdateOfferSchema` |
| TypeScript-Typ / Interface | `PascalCase`, singular | `Lead`, `Project`, `OpportunityCategory` |
| Enum-Typ (gespiegelt aus 00 §8) | `PascalCase`, Werte = DB-Werte (snake_case) | `TaskStatus` mit `todo`/`in_progress`/... |
| Konstante | `UPPER_SNAKE_CASE` | `DEFAULT_CURRENCY` (`CHF`), `MAX_PAGE_SIZE` |
| Hilfsfunktion (`lib`) | `camelCase`, sprechend | `writeAudit`, `logServerError`, `assertPermission` |
| Verzeichnis / Routensegment | `kebab-case` | `reporting-calls`, `crm-builds` |
| Feature-Ordner | `kebab-case`, Domaene singular/plural wie Bereich | `sales`, `clients`, `production` |

### 11.2.2 Server Actions vs. API Routes - Abgrenzung

Beide sind schreibende Eintrittspunkte; die Wahl ist verbindlich geregelt, damit keine parallelen Pfade entstehen:

| Kriterium | Server Action | API Route (Route Handler) |
| --- | --- | --- |
| Primaerer Einsatz | interne UI-Mutationen aus der eigenen App (Formulare, Statuswechsel) | externe/maschinelle Aufrufe: Webhooks (eingehend), Cron-Eintritt, Integrationen, Exporte |
| Aufrufer | angemeldeter Benutzer im Browser | Drittsystem (`integrations`/`webhooks`), Scheduler (Cron), Download-Client |
| Authentifizierung | Supabase-Session des Benutzers | Signaturpruefung / Service-Token (kein Endbenutzer-Login) |
| Namensschema | `verbResource` (`createLead`) | `kebab-case` Plural-Pfad (`/api/leads`) + `camelCase` Handler |

**Gemeinsame Pflicht beider Pfade:** serverseitige Validierung des Inputs (09 Regel 14), Berechtigungspruefung (Rolle + RLS), Audit-Schreibung bei Mutation (09 Regel 13), `activity_logs`-Eintrag bei sichtbarer Statusaenderung. Es gibt keinen Schreibpfad, der diese vier Schritte umgeht.

### 11.2.3 Enum-Spiegelung

Die kanonischen Status-Enums (00 §8) sind die Quelle. Im Code werden sie als TypeScript-Typen gespiegelt, deren **Werte exakt den DB-Werten** (englisch, snake_case) entsprechen. Die deutsche Beschriftung erfolgt ausschliesslich in der Praesentationsschicht ueber eine zentrale Uebersetzungs-Zuordnung (ein Ort pro Enum), nie verstreut. Keine ad hoc erfundenen Werte (09 Regel 15).

---

## 11.3 Error-Handling-Strategie

Fehlerbehandlung ist mehrschichtig, einheitlich und nie still. Ziel: kein unbehandelter Schreibfehler, keine Roh-Fehlermeldung an den Endnutzer, jeder relevante Fehler ist im technischen Log (11.4) auffindbar.

### 11.3.1 Fehlerklassen (fachliche Kategorisierung)

Eine zentrale Taxonomie ordnet jeden Fehler einer Kategorie zu; daraus leiten sich HTTP-/Anzeigeverhalten und Log-Schwere ab.

| Kategorie | Bedeutung | Nutzer-Anzeige | Technisches Log |
| --- | --- | --- | --- |
| Validierungsfehler | Eingabe verletzt Schema/Geschaeftsregel | praezise Feldhinweise, kein Abbruch | `warn` |
| Autorisierungsfehler | Rolle/RLS verbietet die Aktion | neutraler "keine Berechtigung"-Hinweis (keine Detail-Preisgabe) | `warn` |
| Authentifizierungsfehler | keine/abgelaufene Session | Weiterleitung zum Login | `info` |
| Nicht-gefunden | Objekt fehlt oder ist soft-deleted (`deleted_at`) | "nicht gefunden"-Zustand | `info` |
| Konflikt | gleichzeitige Aenderung / Statuskollision | Hinweis "bitte neu laden" | `warn` |
| Integrationsfehler | Drittsystem antwortet fehlerhaft/timeout | freundlicher Hinweis + Retry-Option | `error` |
| Systemfehler | unerwarteter interner Fehler | generische Fehlerseite, keine Stacktrace-Preisgabe | `error` |

### 11.3.2 Behandlung je Schicht

- **UI / Routensegment:** Jedes Segment hat einen Fehlerzustand (Error Boundary). Lade- und Fehlerzustaende sind explizit; ein "weisser Bildschirm" ist kein gueltiger Zustand.
- **Server Actions:** geben ein einheitliches, typisiertes Ergebnis zurueck (Erfolg vs. kategorisierter Fehler), nie eine rohe Exception an den Client. Validierung zuerst, dann Berechtigung, dann Mutation, dann Audit/Activity.
- **API Routes:** liefern konsistente Fehler-Antworten mit passendem HTTP-Status je Kategorie (11.3.1); externe Aufrufer erhalten keine internen Details.
- **Datenbank:** Constraints, Fremdschluessel und RLS sind die letzte Verteidigungslinie. Ein durch RLS abgewiesener Zugriff ist ein erwarteter Autorisierungsfehler, kein Systemfehler.

### 11.3.3 Grundsaetze

1. **Fail closed.** Im Zweifel verweigern: Eine nicht eindeutig erlaubte Aktion wird abgelehnt, nicht durchgelassen.
2. **Keine Detail-Preisgabe.** Endnutzer und externe Systeme sehen nie Stacktraces, SQL, interne IDs von Geheimnissen oder Secret-Werte.
3. **Transaktionale Integritaet.** Mutation und zugehoeriger Audit-/Activity-Eintrag gehoeren zusammen; schlaegt die Mutation fehl, entstehen keine verwaisten Log-Eintraege.
4. **Idempotenz bei Wiederholung.** Eingehende Webhooks und Cron-Laeufe sind so gestaltet, dass eine Wiederholung keinen Doppeleffekt erzeugt (Schluessel-/Status-Pruefung vor Wirkung).
5. **Sichtbarkeit von Automations-Fehlern.** Eine fehlgeschlagene Automation wechselt nachvollziehbar in `automation_status = error` (00 §8) und ist im UI sichtbar (vgl. 01 §3.3 Operations-Alerts).

---

## 11.4 Logging-Konzept

Es existieren **drei klar getrennte Beobachtungsebenen**. Sie haben unterschiedliche Zwecke, Adressaten und Aufbewahrung und duerfen nicht vermischt werden. Die fachlichen Ebenen (`audits`, `activity_logs`) sind bereits im Datenmodell verankert; dieses Dokument ergaenzt die **technische** Ebene.

### 11.4.1 Die drei Ebenen im Vergleich

| Ebene | Speicherort | Zweck | Adressat | Beispielinhalt |
| --- | --- | --- | --- | --- |
| **Audit-Trail** | Tabelle `audits` | revisionssichere Sicht auf sicherheitsrelevante Mutationen (wer/was/wann/alt/neu) | Compliance, Super Admin, Settings → Audit Logs | "Benutzer X hat Rechnung Y von `sent` auf `paid` geaendert" |
| **Aktivitaets-Feed** | Tabelle `activity_logs` | fachlicher Verlauf je Objekt fuer den operativen Nutzer | alle Rollen im Kontext eines Objekts | "Lead in Status `qualified` verschoben" |
| **Technisches Logging** | Log-Stream (strukturierte Logs, ausserhalb der Fachtabellen) | Betrieb, Diagnose, Performance, Fehlerverfolgung | Entwicklung / Betrieb (Super Admin) | "Server Action `createOffer` fehlgeschlagen: Integrationstimeout, request-id ..." |

> Abgrenzung (verbindlich): `audits` und `activity_logs` sind **fachlich** und Teil des Produkts; das technische Logging ist **betrieblich** und kein Ersatz fuer den Audit-Trail. Eine sicherheitsrelevante Mutation muss in `audits` stehen - auch wenn das technische Log sie ebenfalls erfasst.

### 11.4.2 Eigenschaften des technischen Loggings

- **Strukturiert.** Logs sind maschinenlesbar (Schluessel/Wert), nicht freier Fliesstext, damit sie filter- und auswertbar sind.
- **Korrelierbar.** Jeder Request/Action-Lauf traegt eine eindeutige Korrelations-/Request-Kennung, ueber die zusammengehoerige Eintraege (UI → Action → DB → Integration) verbunden werden.
- **Schweregrade.** Einheitliche Stufen `debug` / `info` / `warn` / `error` (Zuordnung siehe 11.3.1); Produktionsbetrieb ab `info`.
- **Kontext ohne Geheimnisse.** Logs enthalten Objekt-IDs, Aktion, Rolle und Ergebnis - **niemals** Secret-Werte, Roh-Tokens, vollstaendige Credentials oder unnoetige Personendaten (revDSG-Datenminimierung).
- **Zentrale Helfer.** Logging laeuft ueber einen zentralen Helfer (`src/lib`, vgl. 11.0 Prinzip 4), nicht ueber verstreute Ad-hoc-Ausgaben.
- **Sinnvolle Ereignisse.** Geloggt werden: Start/Ende relevanter Server Actions und API Routes, alle `error`/`warn`-Faelle, Cron-Lauf-Beginn/-Ende mit Ergebnis, Engine-Laeufe (mit Bezug zur Datenherkunft, 09 Regel 20), eingehende/ausgehende Webhooks.

### 11.4.3 Aufbewahrung

| Ebene | Aufbewahrung (Richtwert) | Loeschung |
| --- | --- | --- |
| `audits` | langfristig (revisionssicher) | nur durch `super_admin`, dokumentiert |
| `activity_logs` | mittelfristig, an Objekt-Lebenszyklus gebunden | folgt Soft-Delete des Objekts |
| Technisches Logging | kurz-/mittelfristig (Betriebsfenster) | automatische Rotation/Ablauf |

---

## 11.5 Security-Gesamtbild

Fuehrt die ueber das Blueprint verteilten Sicherheitsbausteine (RLS pro Tabelle in 03/04; `integrations.credentials` verschluesselt at rest, 04 §5.5; serverseitige Secrets, 07 §10; Engineering-Regeln 09 §13.2) zu einem geschlossenen Bild zusammen. Sicherheit gilt **by default**, auf jeder Ebene.

### 11.5.1 Verteidigung in der Tiefe (Ebenen)

| Ebene | Mechanismus | Verbindlicher Grundsatz |
| --- | --- | --- |
| Identitaet | Supabase Auth (`users`) | eine Identitaet pro Mitarbeitendem; deaktivierbar ueber `is_active` |
| Sitzung | Supabase-Session, serverseitig geprueft | jede `(app)`-Route erfordert gueltige Session |
| Autorisierung (App) | Berechtigungspruefung vor jeder Mutation | UI-Sichtbarkeit ist Komfort, nicht Schutz |
| Autorisierung (DB) | Row Level Security auf `org_id` + Rolle | letzte, massgebliche Verteidigungslinie; RLS-aus ist kein gueltiger Zustand (09 Regel 12) |
| Datenfluss | Server-first; nur erlaubte Daten zum Client | Geheimnisse/Roh-Credentials verlassen den Server nie |
| Drittsysteme | `integrations`/`webhooks` mit Signatur/Scopes | minimale Rechte (least privilege), Status ueberwachbar |

### 11.5.2 Auth-Flow (Anmeldung & Autorisierung)

1. **Anmeldung.** Der Benutzer authentifiziert sich ueber Supabase Auth (Login bzw. Passwort-Reset in `app/(auth)`). Erfolgreiche Anmeldung erzeugt eine serverseitig pruefbare Session und verweist auf den `users`-Datensatz.
2. **Rollenermittlung.** Aus `users` → `roles` (die 9 kanonischen Rollen, 00 §3) und `permissions` (granulare Rechte) ergibt sich, was die Person darf. Die Rolle ist der Anker aller Folgepruefungen.
3. **Routen-Schutz.** Jede authentifizierte Route prueft serverseitig die Session; fehlende/abgelaufene Session fuehrt zur Login-Weiterleitung (Authentifizierungsfehler, 11.3.1).
4. **Aktions-Schutz.** Vor jeder Server Action / API Route wird die Berechtigung geprueft (Rolle + Objektzugehoerigkeit). Verboten = Autorisierungsfehler ohne Detail-Preisgabe.
5. **DB-Durchsetzung.** Unabhaengig von der App-Pruefung erzwingt RLS auf `org_id` + Rolle die Sichtbarkeit/Schreibbarkeit. Selbst bei einem App-Fehler bleibt der Datenzugriff auf DB-Ebene geschuetzt.
6. **Protokollierung.** Sicherheitsrelevante Aktionen (Login, Rollenwechsel, Rechteaenderung, harte Loeschung) erzeugen `audits`-Eintraege und technische Logs.

### 11.5.3 Secrets-Management

- **Anwendungs-Secrets** (Service-Keys, API-Schluessel zu Drittsystemen, Signatur-Geheimnisse) liegen ausschliesslich serverseitig in der Umgebungs-/Secret-Verwaltung (Supabase-Secrets bzw. Hosting-Umgebungsvariablen), **nie** im Client-Bundle und **nie** im Repository.
- **Integrations-Credentials** je Drittsystem liegen in `integrations.credentials` (jsonb, **verschluesselt at rest**, 04 §5.5). Sie werden **nie** an den Client ausgeliefert; Entschluesselung erfolgt nur serverseitig zum Zeitpunkt der Nutzung. RLS: Lesen/Schreiben nur `super_admin`, `ceo` lesend **ohne** Secrets.
- **Trennung oeffentlich/geheim.** Nur ausdruecklich oeffentliche Konfiguration (z. B. die oeffentliche Supabase-URL/der Anon-Key fuer den Browser) erreicht den Client; alles andere ist serverseitig.
- **Rotation.** Secrets sind rotierbar, ohne Datenmodell-Aenderung; ein rotiertes Drittsystem-Token wird in `integrations` ersetzt, der Vorgang wird auditiert.

### 11.5.4 Verschluesselung & Datenschutz

| Aspekt | Regel |
| --- | --- |
| Verschluesselung in Transit | jede Verbindung (Browser ↔ App, App ↔ Supabase, App ↔ Drittsysteme) ist transportverschluesselt (TLS). |
| Verschluesselung at rest | die Supabase/PostgreSQL-Datenhaltung und Storage liegen verschluesselt; besonders sensible Felder (`integrations.credentials`) zusaetzlich feldverschluesselt. |
| Datei-Zugriff | Storage-Dateien sind nicht oeffentlich; Zugriff ueber zeitlich begrenzte, signierte URLs gemaess Rolle. |
| Datenminimierung (revDSG) | nur notwendige Personendaten werden gespeichert/geloggt; keine ueberfluessige Personenkontextualisierung in technischen Logs. |
| Mandantentrennung | `org_id` auf jeder fachlichen Tabelle (09 Regel 18); auch im Single-Tenant-Betrieb ist die Trennung vorbereitet und durch RLS erzwungen. |

---

## 11.6 Backup- & Restore-Strategie

Ziel ist ein definierter, getesteter Wiederherstellungsweg fuer **Datenbank** und **Storage**, sodass im Ernstfall (Datenverlust, Fehlbedienung, Korruption) ein bekannter, jüngst möglicher Stand wiederhergestellt werden kann.

### 11.6.1 Schutzziele

| Kennzahl | Bedeutung | Zielsetzung |
| --- | --- | --- |
| RPO (Recovery Point Objective) | maximal tolerierter Datenverlust (Zeitfenster) | klein halten - kontinuierliche bzw. taegliche Sicherung der DB |
| RTO (Recovery Time Objective) | maximal tolerierte Wiederherstellungsdauer | innerhalb eines Arbeitstages wiederherstellbar |
| Abdeckung | was gesichert wird | gesamtes PostgreSQL-Schema **und** Storage **und** Stammdaten-Seed |

### 11.6.2 Was gesichert wird

- **Datenbank (PostgreSQL).** Vollstaendige, regelmaessige Sicherung des gesamten Schemas inkl. aller 27 Kern-Tabellen, Hilfstabellen, `audits` und `activity_logs`. Bevorzugt mit Point-in-Time-Faehigkeit (Wiederherstellung auf einen Zeitpunkt), sodass auch eine versehentliche Massenmutation rueckholbar ist.
- **Storage.** Sicherung der in Supabase Storage abgelegten `files`/`attachments`, damit DB-Verweise nach einer Wiederherstellung nicht ins Leere zeigen (DB und Storage werden gemeinsam betrachtet).
- **Schema & Migrationen.** Der Datenbank-Aufbau (Migrationen, RLS-Policies, Trigger, Funktionen) liegt versioniert im Repository (`supabase/`) und ist damit reproduzierbar - die Struktur ist jederzeit aus dem Code wiederherstellbar, unabhaengig vom Datenstand.
- **Secrets.** Geheimnisse werden **nicht** in regulaeren Backups mitgespeichert; sie liegen in der Secret-Verwaltung und sind separat, kontrolliert reproduzierbar (Rotation statt Backup von Klartext).

### 11.6.3 Aufbewahrung & Rhythmus (Richtwerte)

| Sicherungstyp | Rhythmus | Aufbewahrung |
| --- | --- | --- |
| Kontinuierlich / Point-in-Time (DB) | laufend | rollierendes Fenster (jüngste Tage) |
| Taegliche Vollsicherung (DB + Storage) | taeglich | mehrere Wochen |
| Periodische Langzeitsicherung | woechentlich/monatlich | laenger, fuer Stichtags-Wiederherstellung |

### 11.6.4 Restore-Vorgehen (Grundsaetze)

1. **Definierter Ablauf.** Wiederherstellung folgt einem dokumentierten Runbook: Auswahl des Wiederherstellungspunkts → Einspielen der DB → Abgleich des Storage → Neuverbindung der Integrationen (Secrets aus der Secret-Verwaltung) → Funktionspruefung.
2. **Reihenfolge.** Erst Schema/Struktur sicherstellen (aus Migrationen reproduzierbar), dann Daten einspielen, dann Storage-Konsistenz pruefen, zuletzt Integrationen reaktivieren.
3. **Konsistenz DB ↔ Storage.** Nach dem Restore wird geprueft, dass `files`-Verweise auf vorhandene Storage-Objekte zeigen (keine toten Verweise).
4. **Integritaet von Audit/Activity.** `audits` und `activity_logs` werden mit wiederhergestellt; der Restore-Vorgang selbst wird ebenfalls auditiert (wer hat wann welchen Stand wiederhergestellt).
5. **Regelmaessiger Test.** Die Wiederherstellung wird periodisch geuebt (Probe-Restore), damit RTO realistisch bleibt; ein nie getestetes Backup gilt als nicht verlaesslich.
6. **Berechtigung.** Restore und harte Loeschungen sind ausschliesslich `super_admin` vorbehalten (konsistent zu 00 §8 Soft-Delete und 09 Regel 16).

---

## 11.7 Zusammenfassung & Einordnung

Dieses Dokument fuehrt die technische Architektur von eCreator OS erstmals geschlossen zusammen und schliesst die kritische QA-Luecke (Anforderung 12):

- **Ordnerstruktur** - eine einzelne Next.js-App (App Router) mit klarer Trennung von Praesentation (`app/`), wiederverwendbarer UI (`components/`), Domaene (`features/`), Querschnitt (`lib/`), Server-Logik (`server/`) und DB-Artefakten (`supabase/`).
- **Code-Naming** - erweitert 00 §8 auf Komponenten, Hooks, Actions, Routen, Repositories, Schemata und Enum-Spiegelung; klare Abgrenzung Server Actions ↔ API Routes.
- **Error-Handling** - einheitliche Fehler-Taxonomie, schichtweise Behandlung, "fail closed", keine Detail-Preisgabe, Idempotenz bei Wiederholung.
- **Logging** - drei getrennte Ebenen (`audits` fachlich-revisionssicher, `activity_logs` fachlich-operativ, technisches Logging betrieblich) ohne Vermischung.
- **Security-Gesamtbild** - Verteidigung in der Tiefe, expliziter Auth-Flow, serverseitiges Secrets-Management, Verschluesselung in Transit und at rest, RLS auf `org_id` + Rolle als massgebliche Durchsetzung.
- **Backup/Restore** - definierte RPO/RTO-Ziele, gemeinsame Sicherung von DB und Storage, reproduzierbares Schema aus dem Repository, getesteter Restore-Weg.

Alle Festlegungen sind konsistent mit der kanonischen Referenz (00), der Vision/Navigation (01), dem Datenmodell (03/04), den Engines (06), den Automationen/Integrationen (07) sowie dem Phasenplan und den Entwicklungsregeln (09). Die Architektur ist die technische Grundlage, auf der die Folge-Prompts (Implementierungs-Phasen 1-10) aufsetzen.
