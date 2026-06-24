# Phase 15 - Executive Command Center & CEO Dashboard

Kaylou und Fabian loggen morgens 1x ein und sehen sofort: wo Geld liegt, wo
Probleme entstehen, welche Deals/Projekte/Kunden Aufmerksamkeit brauchen, wie
das Team ausgelastet ist. Management-Fokus, keine operativen Details.

## Datenbank (Migration `supabase/migrations/0015_executive.sql`)

| Tabelle | Zweck |
| --- | --- |
| `executive_alerts` | Gespeicherte Management-Alerts (Kategorie, Severity, erledigt) |
| `company_goals` | KPI-/Ziel-Tracking (Ziel-/Ist-Wert, Faelligkeit, Owner) |

Das **meiste wird zur Laufzeit aggregiert** (nichts dupliziert) - aus Finance,
Sales, Clients und Production. Nur `super_admin/ceo/cso` (RLS).

## Engine (`executiveService`)
- **dashboard()**: aggregiert Umsatz (MRR/ARR/Forecast aus Finance), Sales
  (Pipeline/Quote/heisse Leads), Kunden (aktiv/ohne Kontakt/Churn-Risiko),
  Produktion (Risiko/ueberfaellig/Freigaben/Shootings) und Team (offene Aufgaben/
  Ueberlastung) + **berechnete Alerts** (nach Severity sortiert).
- **projectHealth() / clientHealth()**: Gesund/Achtung/Risiko/Kritisch je
  Projekt bzw. Kunde (aus Meilensteinen/Deadlines bzw. Customer-Success-
  Warnungen).
- **morningBriefing()**: Tagesbriefing (wichtigste Zahlen, Risiken, heisse Leads,
  Probleme). **weeklyReport()**: Wochenrueckblick.
- `executiveAlertsService` (erstellen/erledigen/loeschen), `companyGoalsService`
  (KPI-Ziele).

Hinweis: Revenue-Zahlen (bezahlte Rechnungen) sehen nur Rollen mit Finance-
Zugriff (RLS); MRR/ARR aus Vertraegen ist fuer alle Executive-Rollen sichtbar.

## Module / Navigation (`/executive`, nur super_admin/ceo/cso)
| Route | Inhalt |
| --- | --- |
| `/executive` | **CEO-Dashboard** (Umsatz · Sales · Kunden · Produktion · Team + Alerts) |
| `/executive/health` | **Project-Health** + **Client-Health** |
| `/executive/goals` | **Company Goals** (KPI-Tracking mit Fortschritt) |
| `/executive/briefing` | **Tagesbriefing** + **Wochen-CEO-Report** (druckbar) |

Erreichbar ueber den "Executive View"-Button auf der Startseite (role-gated).

## Setup
Migrationen der Reihe nach: `0001 → … → 0015`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## Naechster Schritt
**Phase 16 - Growth Engine** (Upsell, Referral, Review, Renewal, Churn,
Testimonials) - die letzte Phase.
