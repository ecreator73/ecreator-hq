# Phase 19 — LinkedIn Sales

Systematische LinkedIn-Akquise fuer Fabian: hochwertige Unternehmer, Geschaeftsfuehrer
und Entscheidungstraeger identifizieren, persoenlich ansprechen und strukturiert in
Kunden verwandeln. **Kein automatischer Versand, keine LinkedIn-Automatisierung** —
das System unterstuetzt Recherche, Personalisierung, Organisation und Follow-ups;
die Kontaktaufnahme bleibt bewusst persoenlich ueber LinkedIn.

## Architektur-Grundsatz

Prospects sind **NICHT** Leads. Klare Trennung entlang des Funnels:

```
Prospect → Kontakt → Gespraech → [In Lead umwandeln] → Lead → Angebot → Kunde
```

Konvertierung via Button „In Lead umwandeln": alle Daten werden uebernommen
(Quelle: `linkedin`), der Prospect bleibt **archiviert** erhalten (`archived_at`
+ `converted_lead_id`).

## Migration `0021_linkedin_sales.sql` (im Supabase SQL-Editor ausfuehren!)

- **Registry**: 12 Prospect-Status (`entity_type='linkedin_prospect'`):
  neu, zu_recherchieren, kontaktanfrage_gesendet, verbunden,
  erste_nachricht_gesendet, antwort_erhalten, termin_vereinbart, angebot,
  gewonnen, verloren, nicht_interessiert, spaeter_kontaktieren.
  Terminal: gewonnen/verloren/nicht_interessiert.
- **`linkedin_campaigns`** — Kampagnen (Broker Schweiz, Spitex, Treuhaender, ...),
  Status active/paused/archived.
- **`linkedin_prospects`** — Stammdaten (Name, Firma, Position, Branche,
  Unternehmensgroesse, Standort, LinkedIn-URL, Website, Telefon, E-Mail),
  Prozess (status TEXT + validate_status-Trigger, campaign_id, owner_id,
  priority low/medium/high, lead_score 0-100, last_activity_at,
  next_followup_date), **Recherche-Felder** (company_description, services,
  social_links, google_reviews, possible_problems, potential_marketing/crm/
  seo/ads/website — KI ergaenzt spaeter), notes_md (Markdown),
  converted_lead_id, archived_at, Soft-Delete + Audit-Spalten.
- **`linkedin_activities`** — Timeline (kontaktanfrage/nachricht/antwort/
  telefonat/meeting/angebot/notiz/vertrag/status/system).
- **`linkedin_message_templates`** — Vorlagen in 6 Kategorien (Erste
  Kontaktanfrage, Nach Annahme, Follow-up, Nach Gespraech, Nach Angebot,
  Reaktivierung) mit {{variablen}}; 6 Standard-Vorlagen geseedet.
- **`linkedin_messages`** — Entwuerfe + manuell gesendete/erhaltene Nachrichten
  (direction out/in, status draft/sent/received). KEIN Versand-Mechanismus.
- **`tasks.linkedin_prospect_id`** — Follow-up-Aufgaben je Prospect.
- RLS auf allen Tabellen: nur super_admin/ceo/cso/sales.

## Fachlogik `src/lib/linkedin.ts`

- **`computeProspectScore`** (0-100, regelbasiert): Prozessfortschritt (60%)
  + Datenqualitaet (E-Mail/Telefon/URL/Beschreibung) + Potenzial-Felder +
  Prioritaet. Hot ab 70.
- **`LINKEDIN_FOLLOWUP_RULES`**: Statuswechsel setzt automatisch
  next_followup_date + Aufgabe — 3 Tage nach Kontaktanfrage, 1 Tag nach
  Verbindung, 7 Tage nach erster Nachricht, 5 Tage nach Angebot,
  30 Tage Reaktivierung bei „spaeter kontaktieren".
- **`buildProspectInsights`** (KI-Insights, REGELBASIERT, keine Halluzination):
  passende eCreator-Dienstleistungen aus gefuellten Potenzial-Feldern,
  dokumentierte Schwachstellen, fehlende Website, Branchen-Einstieg,
  Inaktivitaets-/Ueberfaelligkeits-Warnungen. Fehlt Recherche, sagt das
  System das ehrlich.
- **`prospectTemplateVariables`**: {{vorname}}, {{name}}, {{firma}},
  {{position}}, {{branche}}, {{standort}}, {{website}} aus echten Daten.

## Services `src/server/services/linkedin.service.ts`

`linkedinProspectsService` (list/board/getById/create/update/**move** mit
Follow-up-Automatik/remove/**convertToLead**/**bulkImport** CSV mit Dedup
per LinkedIn-URL bzw. Name+Firma/tasks), `linkedinCampaignsService`
(CRUD + stats), `linkedinTemplatesService` (CRUD, Variablen auto-extrahiert),
`linkedinMessagesService` (listByProspect/**personalize** = Vorlage + echte
Prospect-Daten → Entwurf/create/update/remove), `linkedinActivitiesService`,
`linkedinDashboardService` (dashboard/followups/stats — nutzt request-weiten
`cache()` fuer die Prospect-Liste).

Historie: Updates/Statuswechsel/Konvertierung via `recordAudit` revisionssicher.

## UI `/sales/linkedin` (Nav: Leads-Gruppe → „LinkedIn Sales")

Eigene Sub-Nav: **Dashboard** (Heute kontaktieren, Follow-ups, neue Antworten,
neue Prospects, Pipeline, Top-Kampagnen) · **Prospects** (Filter Branche/
Region/Groesse/Status/Verantwortlicher/Score/Kampagne, Suche, Inline-Status,
CSV-Import mit Auto-Mapping) · **Prospect-Detail** (Tabs Uebersicht mit
Recherche + KI-Insights, Aktivitaeten-Timeline mit Schnell-Logger,
Nachrichten mit Personalisierung + Kopieren, Notizen Markdown inkl.
Checklisten, Aufgaben, Dateien-Platzhalter; „In Lead umwandeln") ·
**Pipeline** (Kanban, 12 Spalten, Drag&Drop) · **Kampagnen** (CRUD + Kennzahlen)
· **Vorlagen** (6 Kategorien) · **Follow-ups** (Ueberfaellig/Heute/Woche) ·
**Statistiken** (KPIs + Funnel + pro Kampagne).

## Nebenbei gefixt

`LEAD_SOURCES` um `linkedin` + `meta_ads` ergaenzt (die 167 importierten
Meta-Leads zeigten bisher den rohen Key statt eines Labels; `linkedin` ist
Voraussetzung fuer die Konvertierung, da `leadsService.create` die Quelle
gegen `LEAD_SOURCE_KEYS` validiert).

## Bewusst NICHT gebaut (Spec-konform)

- Kein automatischer LinkedIn-Versand, kein Scraping, keine LinkedIn-API.
- KI-Felder (Zusammenfassung, Gespraechsvorbereitung, Nachricht-Vorschlag)
  sind als Recherche-Felder + regelbasierte Insights vorbereitet; echte
  LLM-Calls folgen mit der AI-Engine-Anbindung (Phase 9-Infrastruktur).
- Datei-Upload je Prospect folgt mit der Storage-Integration (app-weit offen).
