# Phase 7 - Creator Pool, Talent Management & Shooting Staffing

Internes **Creator-CRM** (kein Marktplatz): zentrale Verwaltung aller Models, UGC-
Creator und Micro-Influencer, mit Qualifizierung, Bewertung, Verfuegbarkeiten,
Preisen und einer Matching-Engine, die zu jedem Shooting passende Creator
vorschlaegt.

## Datenbank (Migration `supabase/migrations/0007_creator_pool.sql`)

| Tabelle | Zweck |
| --- | --- |
| `creators` | Talent-Profil (Stammdaten, Region, Social, Creator-Typen, Erfahrung, Preise, Score, Status, DSG-Einwilligung, WhatsApp-Gruppen-Status, Tags) |
| `creator_assets` | Portfolio (Fotos/Videos/UGC/Werbungen/Referenzen) |
| `creator_availability` | Verfuegbarkeiten (verfuegbar/eingeschraenkt/nicht verfuegbar je Zeitraum) |
| `creator_ratings` | Interne Bewertungen (5 Kriterien 1-5 Sterne + Durchschnitt) |
| `shoot_assignments` | Besetzung: Creator ↔ Shooting (angefragt/bestaetigt/abgelehnt/durchgefuehrt + vereinbarter Satz) |

Eigene Status-Saetze in der Registry: `creator` (Neu/Kontaktiert/Interesse/
Qualifiziert/Creator Pool/Aktiv/Inaktiv/Nicht geeignet) und `shoot_assignment`.
Preise als Rappen. `creator_types`/`languages`/`tags` als `text[]` (GIN-Index).
RLS auf allen 5 Tabellen; Stempel-/Validierungs-Trigger wie gehabt.

## Matching-Engine (`src/lib/creator-match.ts`)
Regelbasiert (kein AI/Scraping - das kommt spaeter als eigene AI-Engine).
`computeMatchScore(creator, criteria, { availabilityType })` → 0-100, gewichtet:
Kategorie 25 · Region 20 · Preis 20 · Verfuegbarkeit 15 · Score 10 · Erfahrung 5
· Sprache 5. `creatorsService.match(criteria)` laedt den buchbaren Pool
(qualified/pool/active), loest die Verfuegbarkeit zum Zieldatum auf, bewertet und
sortiert nach Relevanz.

## Service-Layer
- `creatorsService`: list/listWithStats (Stats: rating_avg, rating_count,
  shoot_count, last_booked), getWithStats, create/update/setStatus/move/remove,
  bulkCreate (CSV-Import), dashboard, reporting, **match**.
- `creatorAssetsService`, `creatorAvailabilityService`, `creatorRatingsService`
  (berechnet `overall` aus den 5 Kriterien), `shootAssignmentsService`
  (listByShoot/listByCreator, setStatus, Embeds Creator+Shoot).

## Module / Navigation (`/production/creators`, unter Production)
| Route | Inhalt |
| --- | --- |
| `/production/creators` | **Dashboard**: aktive/neue/Pool-Creator, Durchschnittspreis, nach Region, nach Kategorie, Top Creator, zuletzt gebucht |
| `/production/creators/list` | **Creators** (Filter Status/Region/Kategorie/Score/Suche, Quick-Create, CSV-Import, CSV/JSON-Export) |
| `/production/creators/pipeline` | **Pipeline** (Kanban Drag&Drop: Neu→Aktiv) |
| `/production/creators/matching` | **Shooting-Matching** (Kriterien → Vorschlaege mit Relevanz-Score → "Anfragen" erstellt Besetzung) |
| `/production/creators/reporting` | **Reporting** (Anzahl, Durchschnittspreis, Top Performer, haeufig gebucht) |
| `/production/creators/[id]` | **Detail** (Tabs: Uebersicht · Social Media · Shootings · Bewertungen · Verfuegbarkeit · Dateien · Aktivitaet) |

## Datenschutz (DSG)
`consent_given` + `consent_date` + `consent_note` dokumentieren die Einwilligung;
Kontaktstatus wird gespeichert; Soft-Delete (`deleted_at`) ermoeglicht Loeschung.

## WhatsApp-Gruppen-Status
KEINE Automatik - nur Statusfeld `creator_group_status`
(Nicht eingeladen / Einladung empfohlen / Eingeladen / Mitglied).

## Import / Export
CSV-Import (Paste, Header-Mapping → `creatorsService.bulkCreate`). Export als
CSV (Excel-kompatibel) und JSON, clientseitig aus der geladenen Liste.

## Setup
Migrationen der Reihe nach: `0001 → … → 0007`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## NICHT gebaut (kommt spaeter als AI-Engines)
Creator-Outreach-Automation, Instagram-Scraping, WhatsApp-Automationen,
AI-Creator-Finder.

## Naechster Schritt
**Phase 8 - Finance** (Rechnungen, Ausgaben, MRR/ARR, Reports).
