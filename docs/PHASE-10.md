# Phase 10 - Lead Engine & Opportunity Discovery

Die erste echte Revenue-Engine: findet Unternehmen, analysiert sie (Struktur,
keine tiefe AI), erkennt Opportunities, bewertet sie und speist hochwertige
Leads direkt in die Sales-Pipeline (Phase 4) ein.

## Datenbank (Migration `supabase/migrations/0010_lead_engine.sql`)

| Tabelle | Zweck |
| --- | --- |
| `lead_sources` | Modulare Discovery-Quellen (manuell/CSV/OSM/Google Places) |
| `lead_discovery_runs` | Lauf-Protokoll je Quelle (Architektur vorbereitet) |
| `lead_companies` | Gefundene Firmen (Staging vor der Sales-Pipeline) inkl. Website-Scan + Scores + Watchlist |
| `lead_opportunities` | Erkannte Chancen je Firma (Typ, Score, Findings, Empfehlung) |

`lead_companies` ist die zentrale Staging-Entitaet - **nicht** identisch mit dem
Sales-`leads`. Erst die Uebergabe erzeugt einen echten Lead. Nur
`super_admin/ceo/cso/sales` (RLS).

## Scoring-Engine (`src/lib/lead-opportunity-score.ts`)
Regelbasiert aus dem Website-Scan (kein Live-Fetch, keine tiefe AI - das kommt
spaeter): Website/Ads/Content/Recruiting/CRM-Score + Gesamt-Score (0-100). Hoher
Score = grosse Chance (z.B. fehlende/schlechte Website -> hoher Website-Score).
`buildOpportunities` erzeugt pro Typ ab Schwelle Findings + Empfehlung.
Score-Stufen: 90+ Sehr heiss · 75+ Hohe Prioritaet · 60+ Interessant · 40+ Mittel
· <40 Niedrig (`leadScoreLevel`).

## Dublettenerkennung
`findDuplicate` prueft **Domain / E-Mail / Telefon / Firmenname** vor jedem
Insert (auch beim CSV-Import - Dubletten werden uebersprungen, nicht erstellt).
Domain wird normalisiert (`normalizeDomain`).

## Sales-Uebergabe
`leadCompaniesService.handover(id)` erzeugt einen Sales-Lead (Phase 4) mit
Status **Neu**, verknuepft ihn (`handed_over_lead_id`) und setzt die Firma auf
"Aktiv bearbeiten". Doppelte Uebergabe wird verhindert.

## Service-Layer
- `leadCompaniesService`: list (Filter Region/Branche/Score/Opportunity-Typ/
  Watchlist/Suche), getWithStats, create (Scan->Scores->Opportunities, Dedup),
  update, recompute, setWatchlistStatus, remove, **handover**, **bulkImport**
  (CSV), dashboard.
- `leadOpportunitiesService.listByCompany`. `leadSourcesService` (CRUD),
  `leadDiscoveryRunsService` (recent/log).

## Module / Navigation (`/sales/lead-engine`, nur super_admin/ceo/cso/sales)
| Route | Inhalt |
| --- | --- |
| `/sales/lead-engine` | **Dashboard**: neue Leads heute/Woche, heisse Opportunities, Branchen/Regionen, Website/Ads/CRM-Opps, Top Opportunities |
| `/sales/lead-engine/companies` | Firmenliste (Filter Region/Branche/Score/Opp-Typ/Watchlist/Suche, Quick-Create, CSV-Import) |
| `/sales/lead-engine/[id]` | Firmen-Detail (Tabs: Uebersicht · Website-Analyse · Opportunities · Empfehlungen · Aktivitaeten · **Sales-Uebergabe**) |
| `/sales/lead-engine/sources` | Discovery-Quellen + Lauf-Protokolle |

Watchlist-Status (Beobachten/Aktiv bearbeiten/Nicht relevant) ueber den geteilten
`<StatusSelect>`.

## Setup
Migrationen der Reihe nach: `0001 → … → 0010`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## NICHT gebaut (kommt spaeter)
E-Mail-Outreach, Follow-up-Sequenzen, Website-Audit-PDFs, Proposal-Generator,
echtes Web-Scraping/Live-Discovery (als AI-Engine geplant).

## Naechster Schritt
**Phase 11 - Outreach Engine** (Kampagnen, Templates, Follow-up-Sequenzen,
Sales Inbox, Terminbuchung).
