# 8 AI Engines

> Verbindlicher Blueprint-Abschnitt fuer eCreator OS. Alle Namen (Tabellen, Rollen, Engines, Status-Enums, Routen) folgen exakt der kanonischen Referenz (`00-kanonische-referenz.md`). Bei Konflikten gilt jenes Dokument.

## 8.0 Einordnung und Grundverstaendnis

Die zwoelf AI Engines sind **kein** separates Analytics-Produkt, sondern der operative Co-Pilot von eCreator OS. Sie folgen dem Leitprinzip aus der kanonischen Referenz: **KI erzeugt konkrete Aufgaben, Chancen und Entwuerfe, nicht nur Berichte.** Jede Engine fuettert den Arbeitsfluss der Plattform, indem sie strukturierte Records in den 27 Kern-Tabellen erzeugt oder anreichert - und zwar so, dass auf jeder Seite die Kernfrage "Was muss heute gemacht werden?" beantwortbar bleibt.

Alle Engines teilen sich dasselbe technische Fundament (siehe Abschnitt 8.13) und unterliegen denselben drei nicht verhandelbaren Grenzen:

1. **Human-in-the-loop:** Eine Engine erzeugt Vorschlaege (`opportunities`), Entwuerfe (`offers` im Status `draft`, `outreach_emails` im Status `draft`) und Aufgaben (`tasks`). Sie schliesst **nie** selbststaendig einen Deal ab, sendet **nie** selbststaendig eine Akquise-Mail und veroeffentlicht **nie** selbststaendig Content. Der Mensch bestaetigt, bevor etwas die Plattform verlaesst.
2. **Schweizer Rechtsrahmen (UWG / revDSG):** Outreach- und E-Mail-bezogene Engines erzeugen **ausschliesslich Entwuerfe** fuer den **manuellen 1:1-Versand**. Ein automatisierter Werbe-Massenversand ist gesetzlich unzulaessig und in eCreator OS technisch ausgeschlossen (siehe Abschnitt 8.7 und 8.13.5).
3. **Auditierbarkeit & Rollenrechte:** Jeder Engine-Lauf, der schreibt, erzeugt einen Eintrag in `audits` (wer/was/wann/alt-neu - mit Akteur "system/engine" plus ausloesendem `created_by`) und sichtbare Statusaenderungen erzeugen einen Eintrag in `activity_logs`. Engines duerfen nur in Tabellen schreiben, fuer die die jeweilige fachliche Rolle Schreibrecht haette; RLS-Policies gelten auch fuer System-Schreibvorgaenge.

### 8.0.1 Gemeinsames Lauf- und Trigger-Modell

| Mechanismus | Beschreibung | Tabelle |
| --- | --- | --- |
| **Cron Job** | Zeitgesteuerter Lauf (z. B. naechtlich, woechentlich). Konfiguration und Lauf-Historie als Regel in `automations`. | `automations` |
| **Event-Trigger** | Reaktion auf einen Datensatz-Wechsel (z. B. Lead-Status auf `qualified`, Meeting `completed_at` gesetzt). | `automations`, ausloesende Kern-Tabelle |
| **Manuelle Ausloesung** | Nutzer startet eine Engine ueber `/operations/engines` fuer ein konkretes Objekt ("Audit jetzt laufen lassen"). | `automations` |
| **Webhook (eingehend)** | Drittsystem meldet ein Ereignis (z. B. neuer Formular-Lead). | `webhooks` -> Engine |

Jeder Engine-Lauf ist als Regel-Record in `automations` registriert (Feld `automation_status`: `active` / `paused` / `error`), sodass `/operations/automations` und `/operations/engines` jederzeit zeigen, welche Engine wann lief, was sie erzeugte und ob sie fehlerhaft war.

### 8.0.2 Zentrale gemeinsame Ausgabe-Objekte

Damit die Plattform konsistent bleibt, schreiben fast alle "Chancen-Engines" in dieselben zwei Sammel-Tabellen:

- **`opportunities`** (Status-Enum `opportunity_status`: `open`, `in_review`, `accepted`, `dismissed`, `expired`; Prioritaet via `priority`: `low`, `medium`, `high`, `urgent`) - der zentrale Vorschlags-Eingang. Ein Feld `source` (bzw. `engine`) markiert die erzeugende Engine, ein Feld `opportunity_type` die Kategorie (z. B. `website_audit`, `ads`, `content`, `recruiting`, `crm_automation`, `upsell`, `referral`).
- **`tasks`** (Status-Enum `task_status`; `priority`) - sobald eine Opportunity vom Menschen akzeptiert wird (`accepted`), entsteht der konkrete Folge-Task fuer die zustaendige Rolle.

Dieses Muster ("Engine -> `opportunities` -> Mensch prueft -> `accepted` -> `tasks`") ist der rote Faden durch fast alle zwoelf Engines.

---

## 8.1 Lead Engine

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Findet und qualifiziert neue potenzielle Kunden und speist kontinuierlich die Sales-Pipeline mit verwertbaren `leads`. |
| **Input** | Eingehende Webhooks (`webhooks`) aus Website-Formularen; konfigurierte Quell-Integrationen (`integrations`, z. B. Verzeichnis-/Branchen-Quellen); manuelle Such-Trigger ueber `/sales/leads`; bestehende `leads` zur Dublettenpruefung; `contacts` zur Personen-Zuordnung. |
| **Output** | Neue Records in `leads` (Status `new`), zugehoerige Ansprechpersonen in `contacts`, ein Qualifizierungs-Score und eine Quellenangabe (`source`) je Lead; bei klarer Eignung ein Folge-Task ("Lead pruefen / kontaktieren") in `tasks`. Optional eine erste Opportunity in `opportunities` (`opportunity_type` = `lead_qualification`). |
| **Verbundene Tabellen** | `leads`, `contacts`, `opportunities`, `tasks`, `webhooks`, `integrations`, `activity_logs`, `audits`. |
| **Automationslogik** | **Cron** (z. B. naechtlicher Quell-Scan) plus **Event/Webhook** (sofortige Verarbeitung neuer Formular-Eingaenge). Pro neuem Lead: Dublettencheck gegen `leads`/`contacts`, Score-Berechnung, Anlage des Leads mit `owner_id` = zustaendige Sales-Person (Round-Robin/Regel), Erzeugung eines "Lead qualifizieren"-Tasks. Statuswechsel `new` -> `contacted` bleibt **manuell** (durch `sales`). |
| **Sicherheitsgrenzen** | Sammelt nur geschaeftsbezogene Kontaktdaten und dokumentiert die **Datenherkunft** (`source`) revDSG-konform. **Kein** automatischer Erstkontakt - die Engine erzeugt nur einen Lead und einen Task; die Ansprache uebernimmt ein Mensch ueber die Outreach Engine (Entwurf). Lead-Anlage respektiert RLS (`org_id`); Loeschung ausschliesslich als Soft-Delete (`deleted_at`). Jeder Lauf protokolliert in `audits`. |

---

## 8.2 Website Audit Engine

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Analysiert Websites von Prospects und Bestandskunden und erzeugt konkrete Befunde sowie daraus abgeleitete Verkaufs-/Verbesserungs-Chancen. |
| **Input** | Website-URL aus `leads`, `clients` oder `websites`; manueller Trigger ueber `/operations/engines` oder `/production/websites`; technische Mess-/Crawl-Daten (Performance, SEO-Grundsignale, mobile Tauglichkeit, Sichtbarkeits-Indikatoren). |
| **Output** | Strukturierter Befundbericht (als `content`-Anhang/`files` + zusammengefasstes Feld am Objekt); ein oder mehrere `opportunities` (`opportunity_type` = `website_audit`) mit priorisierten Handlungsempfehlungen; bei Bestandskunden ggf. ein Vorschlag fuer einen `crm_builds`-/`websites`-Folgeauftrag. |
| **Verbundene Tabellen** | `websites`, `leads`, `clients`, `opportunities`, `files`, `attachments`, `tasks`, `activity_logs`, `audits`. |
| **Automationslogik** | Primaer **manuell/Event** (z. B. wenn ein Lead `qualified` wird, automatisch ein Audit anstossen) plus optionaler **Cron** fuer periodische Re-Audits aktiver Kundenwebsites. Erzeugt Befunde -> daraus `opportunities` (`open`). Wird eine Opportunity `accepted`, entsteht ein Produktions-Task (Rolle `developer`/`project_manager`) und ggf. ein `websites`-Eintrag. |
| **Sicherheitsgrenzen** | Liest nur oeffentlich zugaengliche Website-Daten; keine Authentifizierung gegen fremde Systeme ohne Mandat. Befunde sind **Empfehlungen**, kein automatischer Eingriff in Kundenwebsites. Berichte werden im `files`-Storage rollenbasiert abgelegt (RLS). Kein Versand an den Kunden ohne menschliche Freigabe. |

---

## 8.3 Ads Opportunity Engine

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Erkennt ungenutztes bezahltes Werbe-Potenzial (Meta/Google/TikTok) bei Prospects und Bestandskunden und schlaegt konkrete Kampagnen-Chancen vor. |
| **Input** | Kunden-/Prospect-Kontext aus `clients`/`leads`; bestehende `ad_campaigns`; Branchen-/Marktsignale; optionale Werbe-Plattform-Integrationen (`integrations`); Befunde der Website Audit Engine. |
| **Output** | `opportunities` (`opportunity_type` = `ads`) mit Kampagnen-Idee, geschaetztem Potenzial und vorgeschlagenem Budgetrahmen; bei Annahme ein `ad_campaigns`-Entwurf (`campaign_status` = `draft`) und ein Produktions-Task. |
| **Verbundene Tabellen** | `ad_campaigns`, `clients`, `leads`, `opportunities`, `tasks`, `integrations`, `activity_logs`, `audits`. |
| **Automationslogik** | **Cron** (periodischer Potenzial-Scan ueber aktive Kunden ohne laufende Kampagnen) plus **Event** (z. B. neue Kampagne `completed` -> Vorschlag fuer Folgekampagne). Opportunity `accepted` -> `ad_campaigns` (`draft`) + Task fuer `project_manager`/`creative`. |
| **Sicherheitsgrenzen** | Schlaegt nur vor; **kein** automatisches Schalten oder Budgetieren von Kampagnen - das Aktivieren (`draft` -> `active`) bleibt menschliche Entscheidung mit entsprechender Rolle. Werbeplattform-Zugangsdaten liegen ausschliesslich verschluesselt in `integrations`. Jeder Vorschlag in `audits` nachvollziehbar. |

---

## 8.4 Content Opportunity Engine

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Identifiziert Content-Luecken und liefert konkrete Themen-, Format- und Kanal-Chancen fuer Kunden. |
| **Input** | `clients`-Kontext; bestehende `content_items` (was wurde bereits produziert/veroeffentlicht); Reporting-Signale aus `reporting_calls`; saisonale/branchenbezogene Themen; Befunde der Website Audit Engine. |
| **Output** | `opportunities` (`opportunity_type` = `content`) mit Themen-/Format-Vorschlaegen und Begruendung; bei Annahme neue `content_items` (Status `idea`) und ein Produktions-Task fuer `creative`. |
| **Verbundene Tabellen** | `content_items`, `clients`, `opportunities`, `reporting_calls`, `tasks`, `shoots`, `activity_logs`, `audits`. |
| **Automationslogik** | **Cron** (z. B. woechentlicher Content-Luecken-Scan je aktivem Kunden) plus **Event** (nach Reporting-Call neue Themen ableiten). Opportunity `accepted` -> `content_items` (`idea`) + Task; bei Video-Bedarf Verknuepfung zu einem geplanten `shoots`-Eintrag. |
| **Sicherheitsgrenzen** | Erzeugt nur Ideen/Entwuerfe (`idea`), **keine** automatische Veroeffentlichung. Der Uebergang `idea` -> ... -> `published` durchlaeuft den menschlichen Produktions- und Freigabe-Workflow. Kundendaten bleiben innerhalb der RLS-Grenzen des jeweiligen Kunden. |

---

## 8.5 Recruiting Opportunity Engine

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Findet passende interne/externe Creator und Talente fuer den Creator-Pool, abgestimmt auf konkreten Produktionsbedarf. |
| **Input** | Bedarf aus `shoots`/`content_items`/`projects` (welche Skills/Profile fehlen); bestehender `creators`-Pool (Dublettencheck, Auslastung); manueller Trigger ueber `/operations/creators`. |
| **Output** | `opportunities` (`opportunity_type` = `recruiting`) mit Kandidaten-/Profilvorschlaegen; bei Annahme ein neuer Eintrag in `creators` (Status: Kandidat/onboarding) und ein Task ("Creator kontaktieren / onboarden"). |
| **Verbundene Tabellen** | `creators`, `shoots`, `content_items`, `projects`, `opportunities`, `tasks`, `contacts`, `activity_logs`, `audits`. |
| **Automationslogik** | Primaer **Event** (offener Drehbedarf ohne passenden Creator -> Vorschlag) plus **manuell**. Opportunity `accepted` -> `creators`-Anlage + Onboarding-Task fuer `creative`/`project_manager`. |
| **Sicherheitsgrenzen** | Verarbeitet Personendaten von Talenten revDSG-konform mit dokumentierter Herkunft; **kein** automatischer Erstkontakt und **keine** automatische Vertragsbindung - Ansprache und Aufnahme erfolgen manuell. Datenminimierung: nur produktionsrelevante Profilfelder. Soft-Delete und Audit-Pflicht gelten. |

---

## 8.6 CRM Automation Opportunity Engine

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Deckt automatisierbare Kundenprozesse auf und schlaegt konkrete CRM-/Automations-Aufbauten als verkaufbare Lieferleistung vor. |
| **Input** | Kundenkontext aus `clients`, `contracts` und bestehenden `crm_builds`; Prozesssignale aus `meetings`/`reporting_calls`; Befunde anderer Engines. |
| **Output** | `opportunities` (`opportunity_type` = `crm_automation`) mit Automatisierungs-Idee und Nutzenargument; bei Annahme ein `crm_builds`-Entwurf und ein Produktions-Task fuer `developer`/`project_manager`. |
| **Verbundene Tabellen** | `crm_builds`, `clients`, `contracts`, `meetings`, `reporting_calls`, `opportunities`, `tasks`, `activity_logs`, `audits`. |
| **Automationslogik** | **Cron** (periodischer Scan aktiver Kunden auf Automatisierungslucken) plus **Event** (nach Reporting-Call oder Meeting Folgechance ableiten). Opportunity `accepted` -> `crm_builds` + Task. |
| **Sicherheitsgrenzen** | Reine Vorschlaege; **kein** automatischer Eingriff in Kunden-CRM-Systeme. Aufbauten werden vom Team umgesetzt, nicht von der Engine. Zugriff auf Kundenintegrationen nur ueber `integrations` (verschluesselt) und nur mit Mandat. Audit-Pflicht. |

---

## 8.7 Outreach Engine  ⚠️ rechtssensibel

> **Schweizer Rechtsrahmen (UWG / revDSG) - verbindlich:** Diese Engine erzeugt **ausschliesslich Entwuerfe** fuer den **manuellen 1:1-Versand**. Ein **automatisierter Werbe-Massenversand ist unzulaessig** und in eCreator OS technisch ausgeschlossen. "Massenwerbung" im Sinne des UWG bemisst sich an der **Automatisierung des Versands**, nicht an der Stueckzahl - deshalb darf die Engine **niemals selbst senden**.

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Erstellt personalisierte 1:1-Akquise-Entwuerfe fuer einzelne Leads als Vorbereitung des manuellen Versands durch eine Sales-Person. |
| **Input** | Einzelner Lead aus `leads` (typischerweise `qualified`); zugehoerige `contacts`; Kontext aus Website-Audit-/Ads-/Content-Befunden; gewaehlte Prompt-Vorlage aus der Prompt Library; manueller Trigger durch `sales`. |
| **Output** | Ein Entwurf in `outreach_emails` mit `outreach_status` = **`draft`** (Betreff, personalisierter Text, Bezug zum Lead); ein Task "Outreach pruefen & manuell senden" fuer den `owner_id`. **Kein** automatischer Wechsel auf `sent`. |
| **Verbundene Tabellen** | `outreach_emails`, `leads`, `contacts`, `opportunities`, `tasks`, `activity_logs`, `audits`. |
| **Automationslogik** | **Event/manuell** je Einzel-Lead. Die Engine generiert **einen Entwurf pro Lead** - **keine** Batch-Generierung ganzer Empfaengerlisten, **keine** Sende-Automation, **kein** Sequencer. Der Statuswechsel `draft` -> `sent` wird ausschliesslich durch eine **menschliche Handlung** ausgeloest (manueller Versand 1:1), die danach in `outreach_emails` und `activity_logs` protokolliert wird. |
| **Sicherheitsgrenzen** | **NICHT erlaubt (technisch gesperrt):** automatischer Versand, Massen-/Listenversand, automatische Drip-/Follow-up-Sequenzen, Versand ohne menschliche Freigabe. **Erlaubt:** Entwurf erstellen, dem Menschen zur Pruefung vorlegen. Jeder Entwurf dokumentiert Datenherkunft und Bezug (revDSG); Abmelde-/Widerspruchsmoeglichkeit ist Pflichtbestandteil jeder Vorlage. Vollstaendige Protokollierung in `audits`. |

---

## 8.8 Proposal Generator

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Generiert massgeschneiderte Angebote/Proposals aus Lead- und Bedarfsdaten als Entwurf zur menschlichen Pruefung. |
| **Input** | Lead/Opportunity-Kontext aus `leads`/`opportunities`; erkannte Bedarfe aus Audit-/Ads-/Content-/CRM-Befunden; Leistungs-/Preisbausteine (Org-Konfiguration); manueller Trigger durch `sales`/`cso`. |
| **Output** | Ein Angebot in `offers` mit `offer_status` = **`draft`** (Positionen, Werte in Rappen via `_amount`+`currency`, Begruendung); ein Task "Angebot pruefen & freigeben". |
| **Verbundene Tabellen** | `offers`, `leads`, `opportunities`, `clients`, `contacts`, `tasks`, `files`, `activity_logs`, `audits`. |
| **Automationslogik** | **Event/manuell** (z. B. Lead erreicht `proposal` oder Opportunity wird `accepted`). Erzeugt `offers` (`draft`). Der Wechsel `draft` -> `sent` erfolgt **manuell** durch eine berechtigte Person; ein angenommenes Angebot (`accepted`) treibt die Konversion Lead -> `clients`/`contracts`. |
| **Sicherheitsgrenzen** | Preise/Positionen sind Vorschlaege; **keine** automatische Versendung oder rechtsverbindliche Zusage ohne menschliche Freigabe. Geldbetraege strikt als Ganzzahl in Rappen. Rollenrecht: nur `sales`/`cso`/`ceo` duerfen freigeben. Audit-Trail je Aenderung. |

---

## 8.9 Content Script Generator

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Erzeugt Skripte und Captions fuer Content-Stuecke und Drehs auf Basis bestehender Content-Ideen. |
| **Input** | `content_items` (typischerweise im Status `idea`/`scripting`); Kunden-/Markenkontext aus `clients`; geplante `shoots`; gewaehlte Prompt-Vorlage. |
| **Output** | Skript-/Caption-Text am `content_items`-Record (Statusfortschritt `idea` -> `scripting`); optional verknuepfte `files`; ein Review-Task fuer `creative`. |
| **Verbundene Tabellen** | `content_items`, `clients`, `shoots`, `files`, `attachments`, `tasks`, `activity_logs`, `audits`. |
| **Automationslogik** | **Event/manuell** (Content-Item wechselt in `scripting` oder Nutzer fordert Skript an). Erzeugt Entwurfstext, setzt Status auf `scripting`, legt Review-Task an. Veroeffentlichung (`published`) bleibt menschlich. |
| **Sicherheitsgrenzen** | Reiner Entwurf; **keine** automatische Veroeffentlichung. Markenrichtlinien/Tonalitaet werden ueber die Prompt-Vorlage gesteuert, der Mensch prueft Faktentreue und Compliance. Kundendaten innerhalb der RLS-Grenzen. |

---

## 8.10 Meeting Assistant

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Bereitet Termine vor, fasst sie zusammen (Transkript/Summary) und erzeugt nachvollziehbare Folgeaufgaben. |
| **Input** | `meetings`-Record (Teilnehmer, Kontext) und/oder `reporting_calls`; vorbereitende Daten aus `leads`/`clients`/`opportunities`; nach dem Termin: Transkript/Notizen (manuell hochgeladen oder via Integration). |
| **Output** | **Vor dem Termin:** Briefing/Agenda (am `meetings`-Record oder als `files`). **Nach dem Termin:** Zusammenfassung, Entscheidungen, und daraus **Folge-`tasks`** (mit `assigned_to`/`due_date`); ggf. neue `opportunities`. |
| **Verbundene Tabellen** | `meetings`, `reporting_calls`, `tasks`, `opportunities`, `clients`, `leads`, `files`, `contacts`, `activity_logs`, `audits`. |
| **Automationslogik** | **Event** (Termin steht bevor -> Briefing; `completed_at` gesetzt -> Zusammenfassung + Folge-Tasks) plus **manuell**. Erzeugte Tasks landen direkt in "Mein Tag" der zustaendigen Person. |
| **Sicherheitsgrenzen** | Transkription/Aufzeichnung nur mit **Einwilligung aller Teilnehmenden** (revDSG); Aufnahmen werden rollenbasiert in `files` abgelegt. Zusammenfassungen sind Entwuerfe, Folge-Tasks werden vom Menschen bestaetigt/zugewiesen. Keine Weitergabe ausserhalb der RLS-Grenzen. |

---

## 8.11 Upsell Engine

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Erkennt Upsell-/Cross-Sell-Potenzial bei Bestandskunden und macht daraus konkrete Wachstumschancen. |
| **Input** | `clients`, `contracts` (Laufzeit/Leistungsumfang), Produktions-/Reporting-Signale aus `projects`/`reporting_calls`; Befunde anderer Engines (Ads, Content, CRM, Website). |
| **Output** | `opportunities` (`opportunity_type` = `upsell`) mit Angebot-Idee und Begruendung; bei Annahme ein Folge-Task fuer `sales`/`cso` und ggf. Anstoss des Proposal Generators. Sichtbar unter `/clients/growth`. |
| **Verbundene Tabellen** | `clients`, `contracts`, `opportunities`, `offers`, `projects`, `reporting_calls`, `tasks`, `activity_logs`, `audits`. |
| **Automationslogik** | **Cron** (periodischer Scan aktiver Kunden, z. B. vor Vertragsverlaengerung oder nach erfolgreichem Projekt). Opportunity `accepted` -> Task + optional `offers`-Entwurf. |
| **Sicherheitsgrenzen** | Reine interne Chance; **keine** automatische Kundenansprache und **keine** automatische Vertragsaenderung. Ansprache erfolgt menschlich, Angebote durchlaufen die Proposal-Freigabe. Nur kundenbezogene Daten innerhalb der RLS-Grenzen. Audit-Pflicht. |

---

## 8.12 Referral Engine

| Aspekt | Beschreibung |
| --- | --- |
| **Zweck** | Identifiziert Empfehlungs-Chancen bei zufriedenen Bestandskunden und steuert strukturierte Referral-Anfragen. |
| **Input** | `clients` (Zufriedenheits-/Erfolgssignale aus `reporting_calls`, abgeschlossene `projects`, NPS-/Feedback-Indikatoren); `contacts`. |
| **Output** | `opportunities` (`opportunity_type` = `referral`) mit Empfehlungs-Anlass; bei Annahme ein Task "Empfehlung anfragen" und ggf. ein 1:1-Outreach-**Entwurf** (ueber die Outreach Engine, `draft`). Sichtbar unter `/clients/growth`. |
| **Verbundene Tabellen** | `clients`, `contacts`, `opportunities`, `outreach_emails`, `tasks`, `reporting_calls`, `projects`, `activity_logs`, `audits`. |
| **Automationslogik** | **Event** (positives Reporting-Call-Ergebnis / erfolgreich abgeschlossenes Projekt -> Referral-Chance) plus **Cron**. Opportunity `accepted` -> Task + optional Outreach-Entwurf. |
| **Sicherheitsgrenzen** | **Keine** automatische Empfehlungs-Mail und **kein** automatischer Versand - jede Anfrage geht ueber den menschlich freigegebenen 1:1-Outreach (siehe 8.7). revDSG-konforme Datenverarbeitung, RLS-Grenzen, Audit-Pflicht. |

---

## 8.13 Gemeinsames AI-Fundament

Alle zwoelf Engines bauen auf einer einzigen, zentral gepflegten KI-Schicht auf. Dieses Fundament garantiert Konsistenz, Kostenkontrolle und Rechtssicherheit unabhaengig von der einzelnen Engine.

### 8.13.1 LLM-Abstraktion
Eine einheitliche interne Abstraktionsschicht kapselt den jeweiligen Sprachmodell-Anbieter. Engines rufen nie direkt ein Anbieter-SDK auf, sondern eine gemeinsame Schnittstelle (Aufgabe rein, strukturiertes Ergebnis raus). Anbieter, Modell und Schluessel sind in `integrations` konfiguriert und austauschbar, ohne dass Engine-Logik geaendert werden muss.

### 8.13.2 Deterministische Fallbacks ohne API-Key
Ist kein API-Schluessel hinterlegt oder der Anbieter nicht erreichbar, faellt jede Engine auf **deterministische, regelbasierte Logik** zurueck (Templates, Heuristiken, vorgefertigte Vorschlaege). So bleibt eCreator OS auch ohne aktive KI-Anbindung voll funktionsfaehig: Opportunities, Entwuerfe und Tasks entstehen weiterhin - nur regelbasiert statt generativ. Der Modus (`ai` vs. `fallback`) wird je Lauf in `automations`/`audits` vermerkt.

### 8.13.3 Prompt Library
Alle Prompts werden zentral, versioniert und rollen-/anwendungsbezogen verwaltet (nicht im Engine-Code verstreut). Jede Engine referenziert benannte, getestete Vorlagen; Aenderungen sind nachvollziehbar. Outreach-/Content-Vorlagen enthalten verbindliche Compliance-Bausteine (z. B. Pflicht-Abmeldehinweis, Tonalitaets- und Markenvorgaben).

### 8.13.4 Kostengrenzen & Guardrails
- **Budget-Limits** pro Engine und global (Tages-/Monats-Cap); bei Ueberschreitung schaltet die Engine auf den deterministischen Fallback und meldet `automation_status` = `error`/`paused`.
- **Rate-Limits & Batch-Schutz** verhindern Lastspitzen und versehentliche Massen-Laeufe.
- **Output-Validierung** (Schema-/Plausibilitaetspruefung) vor dem Schreiben in Kern-Tabellen; ungueltige Ergebnisse werden verworfen, nicht gespeichert.
- **Vollstaendige Telemetrie** je Lauf (Modus, Token-/Kostenverbrauch, Ergebnis) in `automations`, sicherheitsrelevante Schreibvorgaenge in `audits`.

### 8.13.5 Quer liegende, nicht verhandelbare Grenzen
1. **Human-in-the-loop ueberall:** Engines erzeugen Vorschlaege/Entwuerfe/Tasks - der Mensch entscheidet und gibt frei. Kein autonomer Abschluss, kein autonomer Versand, keine autonome Veroeffentlichung.
2. **UWG/revDSG by design:** Outreach-, Referral- und alle E-Mail-bezogenen Funktionen erzeugen **nur Entwuerfe** (`draft`) fuer **manuellen 1:1-Versand**. Automatisierter Werbe-Massenversand ist **technisch ausgeschlossen**. Datenherkunft wird dokumentiert, Abmelde-/Widerspruchsoptionen sind Pflichtbestandteil.
3. **RLS & Audit ausnahmslos:** Jeder Engine-Schreibvorgang respektiert `org_id`/Rolle und erzeugt Eintraege in `audits` (sicherheitsrelevant) bzw. `activity_logs` (fachlich sichtbar). Loeschungen sind Soft-Deletes (`deleted_at`); harte Loeschung nur durch `super_admin`.
