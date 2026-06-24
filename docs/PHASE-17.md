# Phase 17 - Autonomous Growth Engine (Orchestrierungsschicht)

Die uebergeordnete Schicht des eCreator OS. Sie verbindet alle bestehenden
Module zu EINEM Funnel und macht aus dem System einen aktiven Mitspieler: es
schlaegt vor, priorisiert und erzeugt Aufgaben - **es entscheidet nicht**.

```
Lead -> Opportunity -> Audit -> Outreach -> Termin -> Proposal -> Vertrag
     -> Kunde -> Reporting -> Upsell -> Referral -> Verlaengerung
```

> **Grundsatz:** Die Engine erzeugt Aufgaben, Erinnerungen und Alerts. Sie
> versendet **nie** ungefragt E-Mails, Vertraege oder Rechnungen. Der Mensch
> bleibt Entscheider.

## Datenbank (Migration `supabase/migrations/0017_growth_engine.sql`)

| Tabelle | Zweck |
| --- | --- |
| `revenue_journeys` | Weg eines Lead/Kunden durch den Funnel (Stage, naechster Schritt, Wert) |
| `growth_recommendations` | Konkrete naechste-beste-Aktion je Entitaet (Prioritaet, Wert, Status) |
| `automation_orchestrations` | Deklarative Trigger -> Aktion-Regeln (Vorschlaege) |
| `growth_alerts` | Gespeicherte Engine-Warnungen (resolved-Flag) |

RLS: nur `super_admin/ceo/cso`. Vier Standard-Orchestrierungsregeln werden
idempotent geseedet (Lead -> Audit, Proposal -> Onboarding, Kunde -> Review,
Vertrag -> Renewal).

## Logik (`src/lib/growth-engine.ts`, rein/testbar)
- **Growth Score (0-100)**: `computeLeadGrowthScore` (Opportunity, Interesse,
  Budget, Branche) und `computeClientGrowthScore` (Zufriedenheit, Laufzeit,
  Umsatz, Potenzial).
- **Stage-Mapping**: `stageFromLeadStatus`, `stageFromClient`.
- **Next Best Action**: `leadNextBestAction` spiegelt den Funnel (kein Audit ->
  Audit; Audit -> Outreach; positiver Kontakt -> Termin; Termin -> Proposal;
  Angebot offen -> Follow-Up).

## Engine (`growthEngineService` + Teilservices)
- **dashboard()**: aggregiert offene Posten je Funnel-Stufe (neue Leads, heisse
  Opportunities, offene Audits, Outreach-Entwuerfe, faellige Follow-Ups, offene
  Angebote/Vertraege, Kunden ohne Kontakt, Upsell-Chancen, ausstehende Reviews)
  + 6 KPI-Widgets (Pipeline-Wert, Forecast, Upsell-Wert, Referral-Potenzial,
  Renewal-Potenzial, Churn-Risiko) + Pipeline-Wert-Aufschluesselung. Komponiert
  bestehende Aggregate (sales/clients/finance/executive/growth) - keine
  Doppelstrukturen.
- **pipelineSteps()**: die elf Funnel-Schritte mit Anzahl (Leads gefunden ...
  Empfehlung erhalten).
- **commandCenter(limit=10)**: die maximal 10 wichtigsten offenen Empfehlungen.
- **generateRecommendations()**: scannt den gesamten Funnel, berechnet die
  naechste beste Aktion je Entitaet und schreibt priorisierte Empfehlungen
  (dedupliziert). Bei **kritischer** Prioritaet zusaetzlich eine Aufgabe
  (urgent) und ein Growth-Alert. KEIN Versand.
- **dailyBriefing()** / **weeklyReport()**: Tages- und Wochenuebersicht.
- **assistant(query)**: datenbasierte Antworten auf kanonische Fragen
  (Leads anrufen, Upsell-Potenzial, auslaufende Vertraege, kritische Projekte).
- `revenueJourneysService` (list/create/update/setStage/setStatus/remove +
  **sync()** aus dem Funnel), `growthRecommendationsService`,
  `orchestrationsService`, `growthAlertsService`.

## Module / Navigation (`/operations/growth`, nur super_admin/ceo/cso)
Neues Sub-Modul unter **Operations**. Eigene Sekundaer-Navigation; Rollen-Guard
im `layout.tsx` (`requireRole`).

| Route | Inhalt |
| --- | --- |
| `/operations/growth` | **Command Center** - KPIs, offene Posten, Top-10-Empfehlungen, Alerts |
| `/operations/growth/pipeline` | Funnel-Visualisierung (11 Schritte) + Pipeline-Wert |
| `/operations/growth/recommendations` | Alle Empfehlungen (Next Best Actions) |
| `/operations/growth/journeys` | Revenue Journeys mit Stage/Status |
| `/operations/growth/briefing` | Taegliches Growth-Briefing |
| `/operations/growth/report` | Woechentlicher Executive/Growth-Report |
| `/operations/growth/orchestrations` | Automation Orchestrator (Regeln) |
| `/operations/growth/assistant` | AI-Assistant-Panel |

## Home-Integration
Die Startseite wird zum **Executive Command Center**: fuer `super_admin/ceo/cso`
erscheint oben ein Growth-Command-Center-Band (6 KPI-Widgets + Top-5-Empfehlungen
+ Link in die Growth Engine).

## Setup
Migrationen der Reihe nach: `0001 -> ... -> 0017`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## Abschluss
Mit Phase 17 ist das eCreator OS nicht mehr nur ein Datenspeicher, sondern eine
aktive Orchestrierungsschicht, die Umsatz generieren, Kunden entwickeln und das
Unternehmen operativ steuern hilft.
