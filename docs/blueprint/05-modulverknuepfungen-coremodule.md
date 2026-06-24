# 6 Modul-Verknuepfungen

Dieser Abschnitt beschreibt, wie Daten und Prozesse durch eCreator OS fliessen. Leitprinzip ist **"Eine Plattform. Eine Datenbank. Ein Login. Alles verbunden."** Jedes Objekt existiert genau einmal; Statusuebergaenge und Events erzeugen Folgeobjekte, Aufgaben und Eintraege in `activity_logs` sowie `audits`. Die nachfolgenden Fluss-Ketten sind die verbindlichen End-to-End-Pfade des Systems.

Allgemeine Querschnitts-Regeln fuer alle Ketten:

- **Jede schreibende Aktion** erzeugt einen Eintrag in `audits` (wer, was, wann, alt/neu).
- **Jede sichtbare Statusaenderung** erzeugt einen Eintrag in `activity_logs` am betroffenen Objekt.
- **Relevante Statusuebergaenge** erzeugen Aufgaben in `tasks` und/oder Benachrichtigungen in `notifications`, damit der naechste Schritt auf der "Heute"-Ansicht sichtbar wird.
- **Soft-Delete** (`deleted_at`) bricht eine Kette nie hart ab; geloeschte Objekte verschwinden aus Standard-Abfragen, bleiben aber im Audit-Trail referenzierbar.
- **AI-Engines** sind Ausloeser am Anfang vieler Ketten: sie schreiben in `leads`, `opportunities`, `outreach_emails` oder erzeugen Entwuerfe (`offers`, `content_items`), ersetzen aber nie die menschliche Freigabe.

---

## 6.1 Kette A: Lead -> Angebot -> Vertrag -> Kunde -> Projekt -> Aufgaben -> Reporting

Dies ist die zentrale Wertschoepfungs-Kette des Unternehmens: vom anonymen Interessenten bis zur laufenden, berichteten Lieferung.

### Flussdiagramm

```
[Lead Engine / manuell]
        |
        v
   +---------+      qualify       +----------------+     win      +----------------+
   |  leads  | -----------------> |     offers     | -----------> |   contracts    |
   | new     |   (proposal)       | draft -> sent  |  (accepted)  | draft -> active|
   +---------+                    +----------------+              +----------------+
        |                                                                  |
        | (Kontakt)                                                        | (active)
        v                                                                  v
   +----------+                                                      +-----------+
   | contacts |  <--------- uebernommen ----------------------------> |  clients  |
   +----------+                                                      | active    |
                                                                     +-----------+
                                                                           |
                                                                           | Projekt-Setup
                                                                           v
                                                                     +-----------+      +-----------+
                                                                     | projects  | ---> |   tasks   |
                                                                     | planned   |      | todo ...  |
                                                                     | -> active |      | -> done   |
                                                                     +-----------+      +-----------+
                                                                           |                  |
                                                                           |                  v
                                                                           |            +-----------+
                                                                           |            | subtasks  |
                                                                           |            +-----------+
                                                                           v
                                                                  +------------------+
                                                                  | reporting_calls  |
                                                                  | (wiederkehrend)  |
                                                                  +------------------+
                                                                           |
                                                                           v
                                                                  Reporting an Kunde
                                                                  (liest projects/tasks/
                                                                   ad_campaigns/invoices)
```

### Ausloesende Events und Statusuebergaenge

| Schritt | Ausloeser (Event) | Tabelle(n) | Statusuebergang | Folgewirkung |
| --- | --- | --- | --- | --- |
| 1. Lead-Erfassung | Lead Engine findet Interessenten oder Sales legt manuell an | `leads`, `contacts` | `leads.status = new` | Aufgabe "Lead kontaktieren" in `tasks`, Owner = `sales` |
| 2. Kontaktaufnahme | Sales kontaktiert Lead (ggf. ueber `outreach_emails`) | `leads` | `new -> contacted` | Eintrag in `activity_logs` |
| 3. Qualifizierung | Bedarf bestaetigt, Termin gehalten (`meetings`) | `leads`, `meetings` | `contacted -> qualified` | Meeting Assistant erzeugt Folgeaufgaben |
| 4. Angebot | Proposal Generator erstellt Entwurf, Sales finalisiert | `offers` | `offers.status = draft`; `leads.status -> proposal` | Aufgabe "Angebot versenden" |
| 5. Angebot raus | Angebot versendet | `offers` | `draft -> sent` | Wiedervorlage-Aufgabe, `sent_at` gesetzt |
| 6. Abschluss | Kunde nimmt an | `offers`, `leads` | `offers: sent -> accepted`; `leads: proposal -> won` | Trigger: Vertrag und Kunde anlegen |
| 7. Vertrag | Vertrag entsteht aus Angebot | `contracts` | `draft -> active` | MRR/ARR fliesst in `/finance/recurring` |
| 8. Kundenanlage | Lead wird zu Kunde befoerdert | `clients`, `contacts` | `clients.status = active` | `contacts` werden an `client_id` umgehaengt |
| 9. Projekt-Setup | PM legt Lieferprojekt an | `projects`, `project_members` | `planned -> active` | Team-Zuweisung, erste `tasks` |
| 10. Aufgaben | Arbeitspakete entstehen | `tasks`, `subtasks` | `todo -> in_progress -> review -> done` | Auslastung in `/operations/team` |
| 11. Reporting | Wiederkehrender Review faellig | `reporting_calls` | Call `geplant -> gehalten` | Reporting liest `projects`, `tasks`, `ad_campaigns`, `invoices`; Meeting Assistant erzeugt Folgeaufgaben |

**Verlust-Pfad:** Wird der Lead in Schritt 2 bis 5 abgelehnt, wechselt `leads.status -> lost` und ein offenes Angebot geht auf `offers.status -> rejected` oder `expired`. Die Kette endet; ein `activity_logs`-Eintrag haelt den Verlustgrund fest, und die Upsell-/Referral-Engines koennen den Kontakt spaeter erneut aufgreifen.

---

## 6.2 Kette B: Creator -> Shoot -> Content Item -> Kunde -> Kampagne

Diese Kette bildet die kreative Produktion ab: vom Talent ueber den Dreh bis zum ausgespielten, beworbenen Content beim Kunden.

### Flussdiagramm

```
[Recruiting Opportunity Engine]
            |
            v
      +-----------+      Booking      +-----------+      Output      +----------------+
      | creators  | ----------------> |  shoots   | ---------------> | content_items  |
      | (Pool)    |   (planned)       | planned   |   (production)   | idea -> ...     |
      +-----------+                   | -> shot   |                  | -> published   |
            ^                         | -> deliv. |                  +----------------+
            |                         +-----------+                          |
            | Auslastung                    |                                | gehoert zu
            |                               | files/attachments              v
      +---------------+                     v                          +-----------+
      | operations/   |               +---------+                      | clients   |
      | team          |               |  files  |                      | (active)  |
      +---------------+               +---------+                      +-----------+
                                                                             |
                                                                             | wird beworben
                                                                             v
                                                                      +----------------+
                                                                      | ad_campaigns   |
                                                                      | draft -> active|
                                                                      +----------------+
```

### Ausloesende Events und Statusuebergaenge

| Schritt | Ausloeser (Event) | Tabelle(n) | Statusuebergang | Folgewirkung |
| --- | --- | --- | --- | --- |
| 1. Creator im Pool | Recruiting Opportunity Engine schlaegt Talent vor oder manuelle Aufnahme | `creators` | `is_active = true` | Sichtbar im Creator-Pool `/operations/creators` |
| 2. Dreh-Buchung | PM/Creative bucht Creator fuer Kundenprojekt | `shoots`, `projects` | `shoot_status = planned` | Termin in `meetings`/Kalender, Aufgaben fuer Vorbereitung |
| 3. Bestaetigung | Creator bestaetigt Verfuegbarkeit | `shoots` | `planned -> confirmed` | Content Script Generator erzeugt Skript-Entwurf |
| 4. Dreh durchgefuehrt | Material abgedreht | `shoots`, `files`, `attachments` | `confirmed -> shot` | Rohmaterial landet in `files`, verknuepft per `attachments` |
| 5. Content-Erstellung | Schnitt/Design zu einzelnen Stuecken | `content_items` | `idea -> scripting -> production -> review` | Review-Aufgaben fuer Creative/PM |
| 6. Lieferung | Content freigegeben und uebergeben | `shoots`, `content_items` | `shot -> delivered`; `content: review -> published` | Verknuepfung zu `client_id`; Eintrag in `activity_logs` |
| 7. Bewerbung | Content wird Teil einer Kampagne | `ad_campaigns`, `content_items` | `campaign_status: draft -> active` | Ads Opportunity Engine kann Budget-Chancen vorschlagen |

**Verknuepfung zur Kundenkette:** Das `content_item` ist ueber `client_id` fest mit dem Kunden aus Kette A verbunden und kann in `ad_campaigns` als beworbenes Asset wiederverwendet werden. Performance der Kampagne fliesst spaeter ins Reporting (Kette C).

---

## 6.3 Kette C: Kunde -> Vertrag -> Reporting Call -> Aufgabe -> Follow-up

Diese Kette sichert die laufende Betreuung und das Wachstum von Bestandskunden ueber den gesamten Vertragslebenszyklus.

### Flussdiagramm

```
   +-----------+       hat        +----------------+    erzeugt    +------------------+
   |  clients  | ---------------> |   contracts    | ------------> | reporting_calls  |
   | active    |                  | active         |  (Rhythmus)   | (geplant)        |
   +-----------+                  +----------------+               +------------------+
        ^                                                                   |
        |                                                                   | Call gehalten
        | Upsell/Referral                                                   v
        |                                                            +--------------+
   +----------------+                                                |  meetings    |
   | clients/growth |  <--- Upsell Engine / Referral Engine          | (Protokoll)  |
   +----------------+                  ^                             +--------------+
                                       |                                    |
                                       |                                    | Meeting Assistant
                                       |                                    v
                                       |                              +-----------+
                                       +----- speist Chancen -------- |   tasks   |
                                                                      | (Follow-up)|
                                                                      +-----------+
                                                                            |
                                                                            v
                                                                   +----------------+
                                                                   | opportunities  |
                                                                   | (open)         |
                                                                   +----------------+
```

### Ausloesende Events und Statusuebergaenge

| Schritt | Ausloeser (Event) | Tabelle(n) | Statusuebergang | Folgewirkung |
| --- | --- | --- | --- | --- |
| 1. Aktiver Kunde | Kunde aus Kette A | `clients`, `contracts` | `clients: active`, `contracts: active` | Reporting-Rhythmus konfiguriert |
| 2. Call-Planung | Cron Job / `automations` planen naechsten Termin gemaess Vertrag | `reporting_calls`, `meetings` | Call `geplant` | Aufgabe "Reporting vorbereiten" fuer Owner |
| 3. Vorbereitung | Meeting Assistant aggregiert Kundendaten | `reporting_calls` | bleibt `geplant` | liest `projects`, `tasks`, `ad_campaigns`, `invoices` |
| 4. Call durchgefuehrt | Reporting-Call gehalten | `reporting_calls`, `meetings` | Call `gehalten` | Transkript/Zusammenfassung gespeichert |
| 5. Folgeaufgaben | Meeting Assistant erzeugt To-dos | `tasks` | neue `tasks`: `todo` | Auf "Heute"-Ansicht der Verantwortlichen |
| 6. Chancen-Erkennung | Upsell Engine / Referral Engine analysieren Kundenkontext | `opportunities` | `opportunity_status = open` | Erscheint unter `/clients/growth` und in der Sales-Pipeline |
| 7. Follow-up | Owner bearbeitet Aufgabe / nimmt Chance an | `tasks`, `opportunities` | `tasks: -> done`; `opportunity: open -> in_review -> accepted` | Angenommene Chance startet erneut Kette A (neues `offer`) |

**Churn-Pfad:** Bleiben Reporting-Calls und Follow-ups wiederholt unbearbeitet oder kuendigt der Kunde, wechselt `clients.status -> paused` oder `churned` und `contracts.status -> cancelled`/`expired`. Eine Eskalations-Aufgabe geht an CSO/CEO; MRR/ARR in `/finance/recurring` wird automatisch reduziert.

---

## 6.4 Kette D: Website Lead -> Audit -> Outreach Mail -> Sales Pipeline

Diese Kette ist der AI-getriebene Akquise-Einstieg: aus einer analysierten Website wird ein konkreter, qualifizierter Pipeline-Eintrag.

### Flussdiagramm

```
[Lead Engine]                 [Website Audit Engine]
      |                                |
      v                                v
 +---------+      Audit-Befund    +----------------+   Mail-Entwurf   +------------------+
 |  leads  | -------------------> | opportunities  | ---------------> | outreach_emails  |
 | new     |   (Befund/Chance)    | open           |  (Outreach Eng.) | draft            |
 +---------+                      +----------------+                  +------------------+
      |                                                                        |
      |                                                                        | manueller Versand
      |                                                                        v
      |                                                                  +-----------+
      |                                                                  | (sent)    |
      |                                                                  +-----------+
      |                                                                        |
      |                                       Antwort (replied)               |
      |                                                                        v
      |                                                                  +-----------+
      +------------- zurueck in Pipeline --------------------------------|  meetings |
                                                                         | (Termin)  |
                                                                         +-----------+
                                                                               |
                                                                               v
                                                                    Sales Pipeline /sales/pipeline
                                                                    (leads: new -> contacted -> ...)
```

### Ausloesende Events und Statusuebergaenge

| Schritt | Ausloeser (Event) | Tabelle(n) | Statusuebergang | Folgewirkung |
| --- | --- | --- | --- | --- |
| 1. Website-Lead | Lead Engine identifiziert Prospect mit Website | `leads` | `lead_status = new`, `source = website_audit` | Kandidat fuer Audit |
| 2. Audit | Website Audit Engine analysiert die Site | `opportunities` | `opportunity_status = open` | Befund + Score; verknuepft mit `lead_id` |
| 3. Mail-Entwurf | Outreach Engine erstellt personalisierten 1:1-Entwurf | `outreach_emails` | `outreach_status = draft` | Aufgabe "Outreach pruefen & senden" fuer `sales` |
| 4. Versand | Sales prueft und versendet manuell (DSG/UWG-konform) | `outreach_emails`, `leads` | `draft -> sent`; `leads: new -> contacted` | `sent_at` gesetzt; Wiedervorlage-Aufgabe |
| 5. Reaktion | Empfaenger antwortet oder Mail prallt ab | `outreach_emails` | `sent -> replied` bzw. `bounced` | Bei `replied`: Termin-Aufgabe; bei `bounced`: Lead pruefen |
| 6. Termin | Gespraech vereinbart | `meetings`, `leads` | `leads: contacted -> qualified` | Lead ist nun voll in `/sales/pipeline` |
| 7. Uebergang | Qualifizierter Lead | `leads` | `qualified -> proposal` | Mündet in **Kette A** (Angebot -> Vertrag -> Kunde) |

**Compliance-Hinweis:** Schritt 4 ist bewusst manuell. eCreator OS erstellt nur Entwuerfe; der automatische Massen-Versand ist nach UWG unzulaessig. Jeder Versand ist im `outreach_emails`-Datensatz und in `audits` nachvollziehbar.

---

## 6.5 Querschnitts-Kette: Finanzen als durchgehender Faden

Finanzdaten haengen an mehreren Ketten und werden nicht separat gepflegt:

```
contracts (active) --> invoices (draft -> sent -> paid) --> /finance/reports
        |                        ^                                  ^
        | MRR/ARR                | aus Projekt-Meilensteinen        | Reporting-Call (Kette C)
        v                        |                                  |
/finance/recurring        projects/tasks (done) --------------------+
        ^
        | expenses (z.B. Creator-Honorare aus shoots) --> Margenberechnung
```

| Ausloeser | Tabelle(n) | Statusuebergang | Folgewirkung |
| --- | --- | --- | --- |
| Vertrag aktiv | `contracts`, `invoices` | `invoice: draft` | Wiederkehrende Rechnung gemaess Laufzeit |
| Meilenstein erreicht | `tasks`, `invoices` | `task: done -> invoice: sent` | Zahlungsziel ueberwacht |
| Zahlung erfasst | `invoices` | `sent -> paid` (oder `overdue`) | Mahn-Aufgabe bei `overdue` |
| Creator-Honorar | `shoots`, `expenses` | `expense` erfasst | Projektmarge in `/finance/reports` |

---

# 7 Core Module (Detail)

Sieben Module bilden die Hauptnavigation. Jedes Modul folgt der UX-Kernregel **"Was muss heute gemacht werden?"**: jede Einstiegsseite zeigt zuerst die operativen "Heute"-Elemente, danach erst Analytics. Alle Module teilen sich eine Datenbank; Tabellen werden moduluebergreifend gelesen und geschrieben, sind aber durch Row Level Security und die 9 Rollen abgesichert.

Lese-/Schreib-Konvention in den folgenden Tabellen: **L** = lesend, **S** = schreibend.

---

## 7.1 Home - `/`

**Aufgabe:** Persoenlicher operativer Einstieg jedes Mitarbeitenden. Beantwortet sofort "Was muss ich heute tun?" und buendelt alle persoenlich relevanten Aufgaben, Termine, Benachrichtigungen und den Aktivitaetsverlauf.

### Funktionen / Unterseiten

| Unterseite | Pfad | Zweck |
| --- | --- | --- |
| Mein Tag (Dashboard) | `/` | Aggregierte Tagesansicht: faellige Aufgaben, heutige Termine, offene Chancen, Eskalationen |
| Meine Aufgaben | `/my-tasks` | Persoenliche Aufgabenliste (alle `tasks` mit `assigned_to = aktueller User`) |
| Benachrichtigungen | `/notifications` | In-App-Benachrichtigungen mit Lese-Status |
| Aktivitaetsverlauf | `/activity` | Chronologischer Feed relevanter `activity_logs`-Eintraege |

### Zentrale Workflows

- **Tagesplanung:** Beim Login sieht der Nutzer die nach Prioritaet (`priority`) und Faelligkeit (`due_date`) sortierten Aufgaben. Erledigung setzt `tasks.status -> done` und aktualisiert sofort die Auslastung in Operations.
- **Benachrichtigung -> Aktion:** Jede Benachrichtigung verlinkt direkt auf das Quell-Objekt (Lead, Projekt, Rechnung). Lesen setzt den Lese-Status; Bearbeiten erzeugt `activity_logs`.
- **Rollen-Adaption:** Das Dashboard ist rollensensitiv - ein `sales`-Nutzer sieht Pipeline-Aufgaben, ein `finance`-Nutzer offene/ueberfaellige Rechnungen, ein `creative`-Nutzer anstehende Drehs und Content-Reviews.

### Gelesene / geschriebene Tabellen

| Tabelle | L/S | Verwendung |
| --- | --- | --- |
| `tasks` | L/S | Aufgaben anzeigen und abschliessen |
| `subtasks` | L/S | Checklistenpunkte abhaken |
| `notifications` | L/S | Benachrichtigungen anzeigen, als gelesen markieren |
| `activity_logs` | L | Aktivitaets-Feed |
| `meetings` | L | Heutige Termine |
| `opportunities` | L | Offene Chancen des Nutzers |

### "Heute"-Elemente

- Heute faellige und ueberfaellige Aufgaben (`due_date <= heute`, `status != done`)
- Termine des Tages aus `meetings`
- Ungelesene, handlungsrelevante Benachrichtigungen
- Eskalationen (blockierte Aufgaben `status = blocked`, ueberfaellige Rechnungen fuer `finance`)

### Verknuepfungen zu anderen Modulen

Home ist der Aggregator aller Module. Aufgaben stammen aus **Production**, Termine aus **Sales** und **Clients**, Benachrichtigungen aus allen Modulen inkl. **Finance** und **Operations** (AI-Engines).

---

## 7.2 Sales - `/sales`

**Aufgabe:** Akquise und Verkauf von Lead bis Abschluss. Bildet Ketten A und D ab und ist der Eingang fast aller Neukunden.

### Funktionen / Unterseiten

| Unterseite | Pfad | Zweck |
| --- | --- | --- |
| Pipeline | `/sales/pipeline` | Kanban der Leads ueber `lead_status` (`new` -> `won`/`lost`) |
| Leads | `/sales/leads` | Lead-Liste und Detailprofile inkl. Quelle |
| Opportunities | `/sales/opportunities` | AI-/manuell erzeugte Chancen, Annahme/Ablehnung |
| Angebote | `/sales/offers` | Angebote erstellen, versenden, Status verfolgen |
| Outreach | `/sales/outreach` | 1:1-Outreach-Entwuerfe pruefen und manuell versenden |
| Termine | `/sales/meetings` | Sales-Termine planen und nachbereiten |

### Zentrale Workflows

- **Pipeline-Pflege:** Leads wandern per Drag-and-Drop ueber `lead_status`. Jeder Uebergang erzeugt `activity_logs` und ggf. Folgeaufgaben.
- **Angebotsprozess:** Proposal Generator erzeugt einen Entwurf (`offers.status = draft`); nach Freigabe Versand (`-> sent`); Annahme (`-> accepted`) triggert automatisch Vertrag und Kundenanlage (Uebergabe an Clients).
- **Outreach (DSG/UWG-konform):** Outreach Engine liefert Entwuerfe; Versand stets manuell und nachvollziehbar (`outreach_status: draft -> sent`).
- **Chancen-Triage:** Opportunities aus den AI-Engines werden geprueft (`open -> in_review`) und angenommen (`accepted`) oder verworfen (`dismissed`).

### Gelesene / geschriebene Tabellen

| Tabelle | L/S | Verwendung |
| --- | --- | --- |
| `leads` | L/S | Kernobjekt der Pipeline |
| `opportunities` | L/S | Chancen-Verwaltung |
| `offers` | L/S | Angebotsverwaltung |
| `outreach_emails` | L/S | Outreach-Entwuerfe und Versand |
| `meetings` | L/S | Sales-Termine |
| `contacts` | L/S | Ansprechpersonen zu Leads |
| `contracts` | S | Vertragsanlage bei Abschluss |
| `clients` | S | Kundenanlage bei Abschluss |
| `tasks` | L/S | Sales-Aufgaben (Wiedervorlagen) |

### "Heute"-Elemente

- Leads mit faelliger Wiedervorlage und ueberfaellige Follow-ups
- Versendete Angebote nahe Ablauf (`offers.status = sent`)
- Neue, ungesichtete Opportunities (`status = open`)
- Outreach-Entwuerfe zur Freigabe (`outreach_status = draft`)
- Heutige Sales-Termine

### Verknuepfungen zu anderen Modulen

- **Clients:** Gewonnener Lead (`won`) wird zu `clients` + `contracts`.
- **Operations / AI-Engines:** Lead Engine, Website Audit Engine, Proposal Generator, Outreach Engine speisen Sales.
- **Finance:** Vertragswert fliesst nach Abschluss in MRR/ARR.
- **Home:** Sales-Aufgaben und Termine erscheinen auf "Mein Tag".

---

## 7.3 Clients - `/clients`

**Aufgabe:** Betreuung, Vertraege und Wachstum von Bestandskunden. Bildet Kette C ab und sichert Retention sowie Upsell/Referral.

### Funktionen / Unterseiten

| Unterseite | Pfad | Zweck |
| --- | --- | --- |
| Kundenuebersicht | `/clients` | Alle aktiven Kunden mit Status und Health |
| Kundenprofil | `/clients/[id]` | 360-Grad-Sicht: Vertraege, Projekte, Kontakte, Reporting, Finanzen |
| Kontakte | `/clients/contacts` | Ansprechpersonen je Kunde |
| Vertraege | `/clients/contracts` | Laufzeiten, Leistungen, Werte, Verlaengerungen |
| Reporting-Calls | `/clients/reporting-calls` | Wiederkehrende Review-Calls planen und protokollieren |
| Upsell & Empfehlungen | `/clients/growth` | Chancen aus Upsell Engine und Referral Engine |

### Zentrale Workflows

- **Kundenlebenszyklus:** Kunde wird `active`, bei Pausen `paused`, bei Verlust `churned`. Jede Aenderung wirkt auf Finanzkennzahlen.
- **Vertragsmanagement:** Vertraege laufen `draft -> active -> expired/cancelled`; nahende Ablaeufe erzeugen Verlaengerungs-Aufgaben.
- **Reporting-Zyklus:** Cron/`automations` planen Calls; Meeting Assistant bereitet vor und erzeugt Folgeaufgaben (Kette C).
- **Wachstum:** Upsell-/Referral-Chancen erscheinen unter Growth und koennen als neue Opportunities in die Sales-Pipeline ueberfuehrt werden.

### Gelesene / geschriebene Tabellen

| Tabelle | L/S | Verwendung |
| --- | --- | --- |
| `clients` | L/S | Kundenstamm und Status |
| `contacts` | L/S | Ansprechpersonen |
| `contracts` | L/S | Vertragsverwaltung |
| `reporting_calls` | L/S | Review-Calls |
| `meetings` | L/S | Kundentermine/Protokolle |
| `opportunities` | L/S | Upsell-/Referral-Chancen |
| `projects` | L | Lieferstatus fuer Reporting |
| `invoices` | L | Zahlungsstatus im Kundenprofil |
| `tasks` | L/S | Betreuungs-/Follow-up-Aufgaben |

### "Heute"-Elemente

- Heute/diese Woche faellige Reporting-Calls
- Vertraege nahe Ablauf (Verlaengerung noetig)
- Kunden mit Risiko-Signal (Health niedrig, `paused`)
- Offene Upsell-/Referral-Chancen
- Offene Follow-up-Aufgaben aus letzten Calls

### Verknuepfungen zu anderen Modulen

- **Sales:** Wachstumschancen werden zu Opportunities/Angeboten.
- **Production:** Projekte und deren Status liefern Reporting-Inhalte.
- **Finance:** Vertraege und Rechnungen pro Kunde.
- **Operations / AI-Engines:** Upsell Engine, Referral Engine, Meeting Assistant.

---

## 7.4 Production - `/production`

**Aufgabe:** Lieferung aller Leistungen - Content, Websites, Ads, CRM-Builds und Drehs - gebuendelt unter Projekten und Aufgaben. Production ist das produktive Herz und verknuepft Kette A (Projekte/Aufgaben) mit Kette B (Creator/Content).

### Funktionen / Unterseiten

| Unterseite | Pfad | Zweck |
| --- | --- | --- |
| Projekte | `/production/projects` | Zentrale Lieferklammer je Kunde |
| Aufgaben-Board | `/production/board` | Kanban aller `tasks` ueber `task_status` |
| Content | `/production/content` | Content-Items von Idee bis Veroeffentlichung |
| Websites | `/production/websites` | Website-Builds pro Kunde |
| Ad-Kampagnen | `/production/ad-campaigns` | Bezahlte Kampagnen (Meta/Google/TikTok) |
| CRM-Builds | `/production/crm-builds` | CRM-/Automations-Aufbauten als Lieferleistung |
| Drehs | `/production/shoots` | Foto-/Video-Drehs mit Creator-Bezug |

### Produktionsgewerke im Detail

- **Content Production (`content_items`):** Einzelne Stuecke (Posts, Reels, Captions, Skripte) durchlaufen `idea -> scripting -> production -> review -> published`. Content Script Generator liefert Entwuerfe; Creative produziert und gibt frei.
- **Creator Pool (`creators`, gelesen aus Operations):** Talente werden fuer Drehs gebucht; Auslastung und Verfuegbarkeit kommen aus Operations.
- **Website Production (`websites`):** Developer setzt Builds um, gepflegt ueber zugehoerige `tasks`; Website Audit Engine kann Verbesserungs-Chancen einspielen.
- **Ads Production (`ad_campaigns`):** Kampagnen durchlaufen `draft -> active -> paused -> completed`; Ads Opportunity Engine schlaegt neue Kampagnen vor.
- **CRM Builds (`crm_builds`):** Automatisierungs-/CRM-Lieferungen je Kunde; CRM Automation Opportunity Engine deckt Potenzial auf.
- **Shootings (`shoots`):** Drehs `planned -> confirmed -> shot -> delivered`; erzeugen Rohmaterial in `files`.
- **Assets (`files`, `attachments`):** Alle Liefer- und Rohdateien liegen im Storage und sind polymorph an Projekte, Content-Items, Drehs und Websites geknuepft.

### Zentrale Workflows

- **Projekt-Setup:** Aus gewonnenem Deal entsteht ein `project` (`planned -> active`), Team via `project_members`, erste Aufgaben angelegt.
- **Aufgabenfluss:** `tasks`/`subtasks` wandern `todo -> in_progress -> review -> done`; blockierte Aufgaben (`blocked`) eskalieren an den PM.
- **Liefer-Uebergabe:** Abgeschlossene Content-Items/Builds werden dem Kunden zugeordnet und fliessen ins Reporting.

### Gelesene / geschriebene Tabellen

| Tabelle | L/S | Verwendung |
| --- | --- | --- |
| `projects` | L/S | Projektklammer |
| `tasks` | L/S | Arbeitspakete |
| `subtasks` | L/S | Teilaufgaben/Checklisten |
| `content_items` | L/S | Content-Produktion |
| `websites` | L/S | Website-Builds |
| `ad_campaigns` | L/S | Kampagnen |
| `crm_builds` | L/S | CRM-/Automations-Lieferungen |
| `shoots` | L/S | Drehs |
| `creators` | L | Booking aus dem Pool |
| `files` / `attachments` | L/S | Assets |
| `project_members` | L/S | Team-Zuordnung |
| `clients` | L | Kundenkontext |
| `comments` | L/S | Abstimmung am Objekt |

### "Heute"-Elemente

- Heute faellige Aufgaben des Teams (`due_date <= heute`)
- Blockierte Aufgaben (`status = blocked`) zur Eskalation
- Content-Items im Review (`status = review`)
- Heutige/anstehende Drehs (`shoot_status = confirmed`)
- Kampagnen mit Handlungsbedarf (Start/Budget/Ende)
- Projekte mit Risiko (`on_hold`, ueberfaellige Meilensteine)

### Verknuepfungen zu anderen Modulen

- **Clients:** Projekte und Lieferungen je Kunde; Status speist Reporting.
- **Operations:** Creator-Pool, Auslastung, Dateien, AI-Engines.
- **Finance:** Meilensteine loesen Rechnungen aus; Creator-Honorare als `expenses`.
- **Home:** Produktionsaufgaben erscheinen auf "Mein Tag".

---

## 7.5 Operations - `/operations`

**Aufgabe:** Interne Steuerung - Creator-Pool, Team-Auslastung, Automationen, Dateien und die 12 AI-Engines. Operations versorgt vor allem Production und Sales mit Ressourcen und Intelligenz.

### Funktionen / Unterseiten

| Unterseite | Pfad | Zweck |
| --- | --- | --- |
| Creator-Pool | `/operations/creators` | Talente verwalten, Skills, Verfuegbarkeit |
| Team & Auslastung | `/operations/team` | Kapazitaet, Zuweisung, Workload je `user` |
| Automationen | `/operations/automations` | Interne Regeln und ihre Laeufe |
| Dateien | `/operations/files` | Zentrale Dateiverwaltung (Storage) |
| AI-Engines | `/operations/engines` | Steuerung/Monitoring der 12 Engines |

### Zentrale Workflows

- **Creator-Management:** Aufnahme (auch via Recruiting Opportunity Engine), Pflege von Skills/Verfuegbarkeit; Buchung erfolgt in Production (`shoots`).
- **Auslastungssteuerung:** Aggregiert `tasks.assigned_to` je User zu Workload; PM verteilt um. Ueberlast erzeugt Warnungen.
- **Automationen:** Regeln (`automation_status: active/paused/error`) laufen ueber Cron Jobs/Webhooks und erzeugen Aufgaben/Benachrichtigungen. Fehlerzustand (`error`) eskaliert.
- **AI-Engines-Betrieb:** Die 12 Engines (Lead, Website Audit, Ads Opportunity, Content Opportunity, Recruiting Opportunity, CRM Automation Opportunity, Outreach, Proposal Generator, Content Script Generator, Meeting Assistant, Upsell, Referral) erzeugen `leads`, `opportunities`, Entwuerfe und Aufgaben; hier werden sie ueberwacht und konfiguriert.

### Gelesene / geschriebene Tabellen

| Tabelle | L/S | Verwendung |
| --- | --- | --- |
| `creators` | L/S | Creator-Pool |
| `automations` | L/S | Automationsregeln und Laeufe |
| `files` | L/S | Dateiverwaltung |
| `integrations` | L/S | Drittsysteme |
| `webhooks` | L/S | Ein-/ausgehende Webhooks |
| `users` | L | Auslastung/Team |
| `tasks` | L | Workload-Aggregation |
| `opportunities` | S | Engine-Output |
| `leads` | S | Engine-Output (Lead Engine) |
| `notifications` | S | Automations-/Engine-Hinweise |

### "Heute"-Elemente

- Automationen im Fehlerzustand (`automation_status = error`)
- Ueberlastete Teammitglieder (Workload ueber Schwelle)
- Neue Engine-Outputs zur Triage (Opportunities, Entwuerfe)
- Verfuegbare Creator fuer offene Drehs
- Integrationen mit Verbindungsproblemen

### Verknuepfungen zu anderen Modulen

- **Production:** Creator-Booking, Dateien/Assets, Workload.
- **Sales / Clients:** Engine-Output (Leads, Opportunities, Outreach, Upsell, Referral).
- **Settings:** Integrationen/Webhooks (technische Hoheit beim `super_admin`).
- **Home:** Engine- und Automations-Benachrichtigungen.

---

## 7.6 Finance - `/finance`

**Aufgabe:** Rechnungen, Ausgaben, wiederkehrende Umsaetze und finanzielle Berichte. Finance ist der durchgehende Geld-Faden ueber alle Ketten.

### Funktionen / Unterseiten

| Unterseite | Pfad | Zweck |
| --- | --- | --- |
| Finanzuebersicht | `/finance` | KPIs: Umsatz, offene Posten, MRR/ARR, Marge |
| Rechnungen | `/finance/invoices` | Ausgehende Rechnungen mit Status |
| Ausgaben | `/finance/expenses` | Betriebliche Ausgaben inkl. Belege |
| Vertragswerte (MRR/ARR) | `/finance/recurring` | Wiederkehrende Umsaetze aus Vertraegen |
| Berichte | `/finance/reports` | Auswertungen, Margen, Cashflow |

### Zentrale Workflows

- **Rechnungslauf:** Rechnungen entstehen aus Vertraegen/Meilensteinen (`draft -> sent -> paid`); ueberfaellige (`overdue`) erzeugen Mahn-Aufgaben.
- **Ausgabenerfassung:** `expenses` mit Kategorie/Beleg, u.a. Creator-Honorare aus Drehs; fliesst in Margenberechnung.
- **MRR/ARR-Pflege:** Aktive Vertraege summieren zu wiederkehrendem Umsatz; Churn/Pausen reduzieren automatisch.
- **Berichtswesen:** Aggregiert ueber `invoices`, `expenses`, `contracts`; liefert auch Reporting-Calls Finanzkennzahlen.

Geldbetraege stets als Ganzzahl in Rappen (`*_amount`) mit `currency` (Default `CHF`).

### Gelesene / geschriebene Tabellen

| Tabelle | L/S | Verwendung |
| --- | --- | --- |
| `invoices` | L/S | Rechnungsstellung |
| `expenses` | L/S | Ausgabenerfassung |
| `contracts` | L | MRR/ARR-Basis |
| `clients` | L | Rechnungsempfaenger-Kontext |
| `projects` | L | Meilenstein-Bezug |
| `shoots` | L | Honorar-Bezug |
| `tasks` | S | Mahn-/Folgeaufgaben |

### "Heute"-Elemente

- Ueberfaellige Rechnungen (`invoice_status = overdue`)
- Faellige Rechnungslaeufe (Vertragszyklus)
- Offene/zu pruefende Ausgaben
- MRR/ARR-Aenderungen (neue/gekuendigte Vertraege)
- Cashflow-Warnungen

### Verknuepfungen zu anderen Modulen

- **Clients:** Vertraege und Rechnungsempfaenger.
- **Production:** Meilensteine loesen Rechnungen aus; Honorare als Ausgaben.
- **Sales:** Abgeschlossene Deals erzeugen Vertragswerte.
- **Home:** Ueberfaellige Rechnungen fuer `finance` auf "Mein Tag".

---

## 7.7 Settings - `/settings`

**Aufgabe:** Organisation, Benutzer, Rollen/Rechte, Integrationen und Audit. Settings stellt die Sicherheit, Konfiguration und Nachvollziehbarkeit der gesamten Plattform sicher ("Rollenbasiert & sicher by default").

### Funktionen / Unterseiten

| Unterseite | Pfad | Zweck |
| --- | --- | --- |
| Organisation | `/settings/organization` | Org-Stammdaten (`org_id`, eCreator GmbH) |
| Benutzer | `/settings/users` | Mitarbeitenden-Konten verwalten |
| Rollen & Rechte | `/settings/roles` | Die 9 Rollen und ihre Permissions |
| Integrationen | `/settings/integrations` | Drittsysteme verbinden/konfigurieren |
| Audit Logs | `/settings/audit` | Revisionssicherer Audit-Trail |
| Mein Profil | `/settings/profile` | Persoenliche Einstellungen jedes Nutzers |

### Zentrale Workflows

- **Benutzer-Lifecycle:** Anlage, Rollenzuweisung, Deaktivierung (`is_active`); jede Aenderung in `audits`.
- **Rollen & Rechte:** Zuordnung von `permissions` zu `roles`; bildet die Basis aller RLS-Policies (`org_id` + Rolle).
- **Integrationen:** Verbindungen mit Status; technische Hoheit beim `super_admin`; eng mit Operations-Webhooks verzahnt.
- **Audit-Einsicht:** Revisionssichere Pruefung aller sicherheitsrelevanten Aktionen (wer, was, wann, alt/neu).

### Gelesene / geschriebene Tabellen

| Tabelle | L/S | Verwendung |
| --- | --- | --- |
| `users` | L/S | Benutzerverwaltung |
| `roles` | L/S | Rollendefinitionen |
| `permissions` | L/S | Rechte je Rolle |
| `integrations` | L/S | Drittsysteme |
| `webhooks` | L/S | Webhook-Endpunkte |
| `audits` | L | Audit-Trail (nur lesend in UI) |
| `organizations` | L/S | Org-Stammdaten |
| `notifications` | L | System-/Sicherheitshinweise |

### "Heute"-Elemente

- Sicherheitsrelevante Audit-Ereignisse zur Pruefung
- Integrationen mit Fehler-/Ablaufstatus
- Neue/zu aktivierende Benutzerkonten
- Auffaellige Berechtigungsaenderungen

### Verknuepfungen zu anderen Modulen

- **Alle Module:** Rollen/Rechte steuern Sichtbarkeit ueberall (RLS).
- **Operations:** Integrationen/Webhooks technisch geteilt.
- **Home:** Sicherheits-Benachrichtigungen.
- **Querschnitt:** `audits` und `activity_logs` werden von jeder schreibenden Aktion gespeist.

---

## 7.8 Modul-Verknuepfungs-Matrix (Zusammenfassung)

| Von \ Nach | Home | Sales | Clients | Production | Operations | Finance | Settings |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Home** | - | Aufgaben/Termine | Aufgaben/Termine | Aufgaben | Hinweise | Mahnungen | Sicherheit |
| **Sales** | Tasks | - | Kunde/Vertrag | (via Kunde) | nutzt Engines | Vertragswert | RLS |
| **Clients** | Tasks | Wachstumschancen | - | Projekte/Reporting | nutzt Engines | Vertraege/Rechnungen | RLS |
| **Production** | Tasks | - | Lieferstatus | - | Creator/Assets | Meilensteine/Honorare | RLS |
| **Operations** | Hinweise | Leads/Opps/Outreach | Upsell/Referral | Creator/Auslastung | - | - | Integrationen |
| **Finance** | Mahnungen | - | Zahlungsstatus | Rechnungsausloeser | - | - | RLS |
| **Settings** | Sicherheit | RLS | RLS | RLS | Integrationen | RLS | - |

Diese Matrix bestaetigt das Leitprinzip: kein Modul steht isoliert; jede Zelle ist ein konkreter, in den Ketten 6.1-6.5 beschriebener Datenfluss.
