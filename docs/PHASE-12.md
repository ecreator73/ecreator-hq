# Phase 12 - Website Audit Engine & Opportunity Reports

Analysiert Webseiten (Struktur, kein Live-Fetch / keine tiefe AI), erkennt
Schwachstellen und Opportunities und erzeugt Sales-Material, das Fabian direkt
fuer Verkaufsgespraeche nutzen kann.

## Datenbank (Migration `supabase/migrations/0012_website_audit.sql`)

| Tabelle | Zweck |
| --- | --- |
| `website_audits` | Audit je URL/Firma: 8 Kategorie-Scores + Gesamt + AI-Summary-Felder |
| `audit_findings` | Befunde je Kategorie (Severity, Titel, Beschreibung, Empfehlung) |
| `audit_opportunities` | Erkannte Chancen (Typ, Score, Begruendung, Empfehlung) |

`website_audits.lead_company_id` verknuepft optional mit der Lead Engine
(Phase 10) - das Audit nutzt deren `website_scan`. Nur `super_admin/ceo/cso/
sales` (RLS).

## Audit-Engine (`src/lib/website-audit.ts`)
Regelbasiert aus dem Website-Scan. **8 Kategorie-Scores** (Design, Conversion,
SEO, Trust, Performance, Mobile, Content, Tracking, 0-100, hoch = gut) + Gesamt.
`buildFindings` (Severity nach Score), `buildAuditOpportunities` (Neue Website /
Relaunch / SEO / Meta-/Google-Ads / CRM / Content), `buildSummary`
(Executive Summary, Top-Probleme, Quick Wins, Sales-Opportunity).
Score-Stufen: 90+ Exzellent · 75+ Gut · 60+ Verbesserbar · 40+ Schwach ·
<40 Kritisch (`auditScoreLevel`).

## Service-Layer (`websiteAuditsService`)
- `create({url?, lead_company_id?})`: laedt den Scan der verknuepften Firma,
  berechnet Scores, Findings, Opportunities und die Summary - in einem Schritt.
- `generate(id)`: neu generieren (Scan erneut auswerten).
- `getDetail(id)`: Audit + Findings + Opportunities + Firma.
- `dashboard()`: neue Audits, Durchschnitts-Score, schwache Seiten, heisse
  Chancen, Top-Opportunities (schwaechste Seiten zuerst).

## Module / Navigation (`/sales/audits`, nur super_admin/ceo/cso/sales)
| Route | Inhalt |
| --- | --- |
| `/sales/audits` | **Dashboard** (neue Audits, Durchschnitts-Score, schwache Seiten, heisse Chancen, Top-Opportunities) |
| `/sales/audits/list` | Audit-Liste (Filter Score/Suche) |
| `/sales/audits/[id]` | **Audit-Report** (Tabs: Uebersicht/Scores · Findings · Opportunities · AI-Zusammenfassung · Verlauf) |
| `/sales/audits/[id]/report` | Druckbarer Report (eCreator-Branding, "Als PDF drucken") |
| `/sales/audits/[id]/sales` | **Sales-Version** (Probleme · Chancen · Gespraechsaufhaenger) fuer Fabian |

PDF = browserseitiger Druck der Report-Seite (kein PDF-Lib). CRM-Integration ueber
die verknuepfte Lead-Engine-Firma.

## Setup
Migrationen der Reihe nach: `0001 → … → 0012`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## NICHT gebaut (kommt spaeter)
Proposal-Generator, vollautomatische Website-Erstellung, Outreach-Versand,
echter Website-Fetch/Crawl (als AI-Engine geplant).

## Naechster Schritt
**Phase 13 - Proposal Engine** (Offerten, Praesentationen, Vertragsentwuerfe,
Rechnungsentwuerfe, Preislogik).
