# Phase 6 - Production Hub

Das operative Liefer-Modul: ueber den Production Hub steuert eCreator saemtliche
Kundenprojekte - Websites, Ads, CRM-Builds, Content, Shootings, Assets und
Freigaben. Jede Leistung wird hier produziert, verantwortet und nachverfolgt.

## Datenbank (Migration `supabase/migrations/0006_production_hub.sql`)

| Tabelle | Zweck |
| --- | --- |
| `website_projects` | Website-Builds (domain, cms, hosting, seo_status, tracking_status, launch_date, owner, status) |
| `ad_projects` | Ad-Kampagnen (platform, budget [Rappen], objective, owner, status) |
| `crm_projects` | CRM-Builds (crm_type, go_live_date, owner, status) |
| `content_projects` | Content-Produktionen (content_type, platform, owner, status) |
| `shoots` | Shootings/Drehs (content_project, shooting_date, location, videographer, status) |
| `assets` | Asset-Bibliothek (category, file_url, tags, uploaded_by) |
| `approvals` | Freigaben (asset, status: offen/freigegeben/abgelehnt, requested_at/approved_at) |
| `project_milestones` | Meilensteine je Basisprojekt (title, due_date, completed) |

Alle spezialisierten Projektarten verweisen optional auf ein Basis-`projects`
und einen `clients`. **Eigener Status-Satz je Projektart** in der zentralen
Registry (`statuses`, `entity_type` = `website_project` / `ad_project` /
`crm_project` / `content_project` / `shoot` / `approval`) - keine hardcodierten
Statuswerte. Validierung per `validate_status()`-Trigger; Identitaets-Stempel via
`stamp_actor` / `stamp_uploader` / `tasks_stamp_update`. RLS auf allen 8 Tabellen.

## Status-Saetze (Auszug)
- **Website**: Strategie · Sitemap · Design · Entwicklung · Content · SEO ·
  Tracking · Review · Launch · Wartung · Abgeschlossen
- **Ads**: Setup · Tracking · Creative Produktion · Review · Live · Optimierung ·
  Skalierung · Pausiert
- **CRM**: Analyse · Workflow Mapping · Datenmodell · UI Aufbau · Automationen ·
  Integrationen · Testing · Schulung · Live · Wartung
- **Content**: Idee · Planung · Skript · Dreh geplant · Gefilmt · Schnitt ·
  Review · Freigegeben · Veroeffentlicht
- **Shooting**: Geplant · Bestaetigt · Durchgefuehrt · Verschoben · Abgesagt
- **Freigabe**: Offen · Freigegeben · Abgelehnt

## Service-Layer
- `_production.ts` - generische Fabrik `createProductionProjectService` (list mit
  Kunde/Owner-Embed, getById, create, update, setStatus, remove) fuer die vier
  Projektarten.
- `website-/ad-/crm-/content-projects.service.ts`, `shoots.service.ts`,
  `assets.service.ts`, `approvals.service.ts` (setStatus setzt approved_at),
  `project-milestones.service.ts`.
- `production-dashboard.service.ts`:
  - `summary()` / `safeSummary()` - laufende Projekte, Projekte mit Risiko
    (offene ueberfaellige Meilensteine), ueberfaellige Aufgaben, Shootings/Launches
    diese Woche, offene Freigaben, Content-Produktionen, CRM Go-Lives.
  - `calendar(from,to)` - vereinheitlichte Ereignisse (Shootings, Launches,
    CRM Go-Lives, Meilenstein-Deadlines, Reporting-Calls).
  - `workload()` - Team-Auslastung je Mitarbeiter (offene Aufgaben, Projekte,
    geschaetzte/tatsaechliche Stunden - Vorbereitung fuer spaetere Zeiterfassung).

## Module / Navigation (`/production`)
| Route | Inhalt |
| --- | --- |
| `/production` | **Dashboard**: KPI-Kacheln + Produktions-Alerts (offene Freigaben, Shootings diese Woche, ueberfaellige Launches, CRM Go-Lives) |
| `/production/websites` (+`/[id]`) | Website-Projekte + Detail (Uebersicht · Aufgaben · Dateien · SEO · Tracking · Launch-Checklist · Aktivitaet) |
| `/production/ads` (+`/[id]`) | Ad-Kampagnen + Detail (Kampagnen · Creatives · Tracking · Reporting · Aufgaben · Dateien) |
| `/production/crm` (+`/[id]`) | CRM-Builds + Detail (Anforderungen · Workflows · Automationen · Integrationen · Aufgaben · Dateien · Aktivitaet) |
| `/production/content` (+`/[id]`) | Content-Produktionen + Detail (Content Plan · Skripte · Shootings · Dateien · Aufgaben · Freigaben) |
| `/production/shoots` | Shooting-Management (anstehend/vergangen, Status markieren) |
| `/production/assets` | Asset-Bibliothek + Freigaben (anfordern / freigeben / ablehnen) |
| `/production/calendar` | Produktions-Kalender (30 Tage: Shootings, Launches, Go-Lives, Deadlines, Reporting) |
| `/production/workload` | Team-Auslastung |

## Status-Steuerung
Detailseiten nutzen `<StatusSelect>` (ruft die jeweilige `set*StatusAction`),
Shootings `<ShootMarkButtons>`. Status stets aus der Registry (`*_STATUSES` +
`statusLabel`).

## Home-Dashboard
Production-Alerts (Projekte mit Risiko, ueberfaellige Projekte, Shootings/Launches
diese Woche, offene Freigaben) sind ueber das Production-Dashboard erreichbar.

## Setup
Migrationen der Reihe nach: `0001 → 0002 → 0003 → 0004 → 0005 → 0006`. Danach
muessen `npm run typecheck` + `npm run build` fehlerfrei sein.

## Naechster Schritt
**Phase 7 - Operations / Creator-Pool** (bzw. Finance je nach Reihenfolge).
