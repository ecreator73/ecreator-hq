# Phase 16 - Upsell, Referral & Renewal Engine (Revenue Expansion)

Mehr Umsatz aus bestehenden Kunden - automatisch erkannt, strukturiert
verfolgt, messbar. Customer-Success-Fokus.

## Datenbank (Migration `supabase/migrations/0016_growth.sql`)

| Tabelle | Zweck |
| --- | --- |
| `upsell_opportunities` | Upsell-Chancen (Typ, Score, Begruendung, geschaetzter Wert) |
| `referral_opportunities` | Empfehlungs-Chancen |
| `review_requests` | Bewertungsanfragen (Google etc.) |
| `renewals` | Vertragsverlaengerungen (Score, Wahrscheinlichkeit) |
| `churn_risks` | Churn-Risiken (Score, Gruende) |
| `testimonials` | Testimonials (Text/Video/Fallstudie) |

Nur `super_admin/ceo/cso/sales` (RLS). Erkennung/Scoring laufen zur Laufzeit aus
Projekten, Vertraegen und Kundenstatus.

## Engines (`growthService` + Teilservices)
- **generateForClient(clientId)** / **scanAll()**: erkennt je Kunde
  - **Upsell**: was fehlt (hat Website, keine Ads -> Meta Ads; hat Ads, kein CRM
    -> CRM; hat CRM -> Automationen; hat Content, keine Ads -> Google Ads). Score
    aus Laufzeit/MRR/Zufriedenheit/Aktivitaet. **Bei Score > 80: automatischer
    Task** + Dedup gegen offene Chancen.
  - **Referral**: aktiv > 90 Tage, keine Probleme -> Empfehlungschance.
  - **Review**: aktiv > 60 Tage, keine Eskalation -> Bewertungsanfrage.
  - **Churn**: Score aus den Customer-Success-Warnungen (kein Kontakt, kein
    Reporting, Vertrag laeuft aus ...).
- **renewalsService.scan()**: Vertraege mit Ende in <= 90 Tagen erfassen +
  Verlaengerungswahrscheinlichkeit (aus Kunden-Health).
- **timeline(clientId)**: Growth-Verlauf je Kunde (Upsells/Referrals/Reviews/
  Verlaengerungen/Churn/Testimonials).
- `testimonialsService` (CRUD), `reviewService` (Anfragen), Status-Setter je
  Engine. Customer-Success-Playbooks (`CS_PLAYBOOKS`).

## Module / Navigation (`/clients/growth`, nur super_admin/ceo/cso/sales)
| Route | Inhalt |
| --- | --- |
| `/clients/growth` | **Dashboard** (Upsell/Referral/Renewal/Churn/Reviews/Testimonials + Top-Listen + Playbooks) |
| `/clients/growth/upsell` | Upsell-Chancen |
| `/clients/growth/renewals` | Vertragsverlaengerungen |
| `/clients/growth/churn` | Churn-Risiken |
| `/clients/growth/reviews` | Bewertungsanfragen + Empfehlungschancen |
| `/clients/growth/testimonials` | Testimonials |

"Wachstumschancen scannen" generiert die Chancen; Status-Aenderungen ueber den
geteilten `<StatusSelect>`.

## Setup
Migrationen der Reihe nach: `0001 → … → 0016`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## Abschluss
Damit ist die **Prompt-Serie 0-16 vollstaendig** umgesetzt: vom Fundament
(Auth/Rollen/Layout) ueber Sales-, Client- und Production-Module, Creator Pool,
Finance, AI-Fundament und die Engines (Lead, Outreach, Audit, Proposal,
Knowledge, Executive, Growth) - ein zusammenhaengendes, getyptes, RLS-
gesichertes Betriebssystem fuer eCreator.
