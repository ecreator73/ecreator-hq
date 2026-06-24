# eCreator OS

Das interne Betriebssystem der **eCreator GmbH** - Sales, Kunden, Produktion,
Operations und Finanzen in einer einzigen, verbundenen Plattform.

> **Phasen 1-17 umgesetzt.** Vom Fundament (Auth, Rollen, Layout) ueber Tasks,
> Sales-CRM, Client-Management, Production Hub, Creator Pool und Finance bis zu
> den Engines: AI-/Automation-Fundament, Lead Engine, Outreach, Website Audit,
> Proposal Engine, Knowledge/SOPs, Executive Command Center und Growth Engine -
> zusammengefuehrt von der Autonomous Growth Engine, der Orchestrierungsschicht
> ueber alle Module.
> Alles getypt (TypeScript strict), per Supabase-RLS abgesichert und ohne
> Mock-Daten. Grundlage ist der Master-Blueprint unter
> [`docs/blueprint/`](docs/blueprint/); Details je Phase in
> [`docs/PHASE-2.md`](docs/PHASE-2.md) … [`docs/PHASE-17.md`](docs/PHASE-17.md).
>
> Die 17 Migrationen muessen der Reihe nach (`0001 → 0017`) eingespielt werden;
> fuer verschluesselte Integrations-Credentials (Phase 9) wird `CREDENTIALS_SECRET`
> benoetigt.

---

## Tech-Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (PostgreSQL + Auth) mit **Row Level Security**
- Server Actions + Middleware (Session-Handling & Protected Routes)

## Projektstruktur

```text
src/
  app/                # Routen (App Router)
    (auth)/login/     # Anmeldung (oeffentlich)
    (app)/            # geschuetzter Bereich (Shell mit Sidebar + Header)
      page.tsx        # Home / Command Center
      sales|clients|production|operations|finance/
      settings/       # Benutzer · Rollen · Rechte · Integrationen · System
    layout.tsx        # Root-Layout (lang="de")
    middleware ->     # src/middleware.ts (Auth-Schutz)
  components/         # UI-Primitives + Layout (Sidebar, Header, UserMenu ...)
  config/             # Navigation, Rollen, Rechte-Katalog, Site
  hooks/              # React-Hooks
  lib/                # Supabase-Clients, Auth-Helfer, Utils
  styles/             # globals.css (Tailwind + Design-Tokens)
  types/              # geteilte TypeScript-Typen
supabase/
  migrations/         # SQL-Schema (Phase 1)
scripts/
  create-admin.mjs    # ersten Super-Admin anlegen
docs/blueprint/       # Master-Blueprint (Prompt 0)
```

---

## Einrichtung

### 1. Abhaengigkeiten installieren

```bash
npm install
```

> **Hinweis (diese Maschine):** Node liegt portabel unter
> `C:\Users\Win11\ecreator-os\.tools\node` und ist nicht im PATH.
> PATH voranstellen, z. B. in der PowerShell:
> `$env:Path = 'C:\Users\Win11\ecreator-os\.tools\node;' + $env:Path`

### 2. Supabase-Projekt anlegen

1. Projekt auf [supabase.com](https://supabase.com) erstellen.
2. `.env.local.example` zu `.env.local` kopieren und ausfuellen:

   ```bash
   cp .env.local.example .env.local
   ```

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<projekt>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # nur serverseitig!
   ```

   Werte: Supabase Dashboard -> **Project Settings -> API**.
   **Niemals** echte Secrets committen (`.env.local` ist via `.gitignore` ausgeschlossen).

### 3. Datenbank-Schema einspielen

Im Supabase Dashboard -> **SQL Editor** beide Migrationen **in dieser Reihenfolge**
ausfuehren (alternativ mit der Supabase CLI: `supabase db push`):

1. [`supabase/migrations/0001_phase1_foundation.sql`](supabase/migrations/0001_phase1_foundation.sql)
   - Identitaet/Rollen/Rechte: `organizations`, `profiles`, `roles`, `user_roles`,
     `permissions`, `role_permissions`, `activity_logs`, `audits` + RLS + Seed (9 Rollen).
2. [`supabase/migrations/0002_core_business_entities.sql`](supabase/migrations/0002_core_business_entities.sql)
   - Business-Entitaeten: `statuses`, `priorities`, `clients`, `contacts`, `projects`,
     `files`, `meetings`, `contracts`, `offers` + RLS + Validierungs-Trigger + Registry-Seed.
   - Details: [`docs/PHASE-2.md`](docs/PHASE-2.md).
3. [`supabase/migrations/0003_task_system.sql`](supabase/migrations/0003_task_system.sql)
   - Task-System: `tasks`, `subtasks`, `task_comments`, `task_files`, `task_assignees`,
     `task_activity`, `task_templates`(+items), `notifications` + RLS + Trigger + Seeds.
   - Details: [`docs/PHASE-3.md`](docs/PHASE-3.md).
4. [`supabase/migrations/0004_sales_crm.sql`](supabase/migrations/0004_sales_crm.sql)
   - Sales-CRM: `leads`, `sales_activities` (neu) + Erweiterung von `meetings`,
     `offers`, `contracts`, `tasks` + Lead-/Meeting-Status + RLS + Trigger.
   - Details: [`docs/PHASE-4.md`](docs/PHASE-4.md).
5. [`supabase/migrations/0005_client_management.sql`](supabase/migrations/0005_client_management.sql)
   - Client-Management: `reporting_calls`, `client_interactions`,
     `client_checklists`(+items) (neu) + `clients.package` + Reporting-Status + RLS.
   - Details: [`docs/PHASE-5.md`](docs/PHASE-5.md).
6. [`supabase/migrations/0006_production_hub.sql`](supabase/migrations/0006_production_hub.sql)
   - Production Hub: `website_projects`, `ad_projects`, `crm_projects`,
     `content_projects`, `shoots`, `assets`, `approvals`, `project_milestones`
     (neu) + eigene Status-Saetze je Projektart + RLS.
   - Details: [`docs/PHASE-6.md`](docs/PHASE-6.md).
7. [`supabase/migrations/0007_creator_pool.sql`](supabase/migrations/0007_creator_pool.sql)
   - Creator Pool: `creators`, `creator_assets`, `creator_availability`,
     `creator_ratings`, `shoot_assignments` (neu) + Status-Saetze
     `creator`/`shoot_assignment` + RLS.
   - Details: [`docs/PHASE-7.md`](docs/PHASE-7.md).
8. [`supabase/migrations/0008_finance.sql`](supabase/migrations/0008_finance.sql)
   - Finance: `invoices`, `expenses` (neu) + Rechnungs-Status + RLS
     (nur super_admin/ceo/finance). MRR/ARR/Forecast werden zur Laufzeit
     berechnet.
   - Details: [`docs/PHASE-8.md`](docs/PHASE-8.md).
9. [`supabase/migrations/0009_ai_automation.sql`](supabase/migrations/0009_ai_automation.sql)
   - AI- & Automation-Fundament: `ai_prompts`, `ai_runs`, `automation_jobs`,
     `automation_runs`, `integrations`, `webhooks` (neu) + `create_notification`
     (SECURITY DEFINER) + RLS (nur super_admin/ceo/developer). Benoetigt
     `CREDENTIALS_SECRET`.
   - Details: [`docs/PHASE-9.md`](docs/PHASE-9.md).
10. [`supabase/migrations/0010_lead_engine.sql`](supabase/migrations/0010_lead_engine.sql)
    - Lead Engine: `lead_sources`, `lead_discovery_runs`, `lead_companies`,
      `lead_opportunities` (neu) + Opportunity-Scoring + Dublettenerkennung +
      Uebergabe an Sales-Pipeline + RLS (super_admin/ceo/cso/sales).
    - Details: [`docs/PHASE-10.md`](docs/PHASE-10.md).
11. [`supabase/migrations/0011_outreach.sql`](supabase/migrations/0011_outreach.sql)
    - Outreach Engine: `outreach_campaigns`, `email_templates`,
      `outreach_contacts`, `outreach_messages`, `follow_up_sequences`,
      `booked_meetings`, `unsubscribes` (neu) + Status-Registry + RLS.
    - Details: [`docs/PHASE-11.md`](docs/PHASE-11.md).
12. [`supabase/migrations/0012_website_audit.sql`](supabase/migrations/0012_website_audit.sql)
    - Website Audit Engine: `website_audits`, `audit_findings`,
      `audit_opportunities` (neu) + 8 Kategorie-Scores + Findings/Opportunities/
      AI-Summary + RLS.
    - Details: [`docs/PHASE-12.md`](docs/PHASE-12.md).
13. [`supabase/migrations/0013_proposals.sql`](supabase/migrations/0013_proposals.sql)
    - Proposal Engine: `proposals`, `proposal_items`, `pricing_items` (neu) +
      Proposal-Status-Registry + Versionierung + RLS (Preise nur super_admin/ceo).
    - Details: [`docs/PHASE-13.md`](docs/PHASE-13.md).
14. [`supabase/migrations/0014_knowledge.sql`](supabase/migrations/0014_knowledge.sql)
    - Knowledge/Meeting/SOP: `meetings` erweitert (Transcript/Summary/ToDos) +
      `knowledge_articles`, `sops`, `prompt_library` (neu) + RLS (intern).
    - Details: [`docs/PHASE-14.md`](docs/PHASE-14.md).
15. [`supabase/migrations/0015_executive.sql`](supabase/migrations/0015_executive.sql)
    - Executive Command Center: `executive_alerts`, `company_goals` (neu) +
      RLS (super_admin/ceo/cso). CEO-Dashboard aggregiert zur Laufzeit.
    - Details: [`docs/PHASE-15.md`](docs/PHASE-15.md).
16. [`supabase/migrations/0016_growth.sql`](supabase/migrations/0016_growth.sql)
    - Growth Engine: `upsell_opportunities`, `referral_opportunities`,
      `review_requests`, `renewals`, `churn_risks`, `testimonials` (neu) + RLS
      (super_admin/ceo/cso/sales).
    - Details: [`docs/PHASE-16.md`](docs/PHASE-16.md).
17. [`supabase/migrations/0017_growth_engine.sql`](supabase/migrations/0017_growth_engine.sql)
    - Autonomous Growth Engine: `revenue_journeys`, `growth_recommendations`,
      `automation_orchestrations`, `growth_alerts` (neu) + RLS
      (super_admin/ceo/cso). Orchestrierungsschicht, die alle Module verbindet.
    - Details: [`docs/PHASE-17.md`](docs/PHASE-17.md).

### 4. Ersten Super-Admin anlegen

In `.env.local` einmalig setzen:

```env
ADMIN_EMAIL=admin@ecreator.ch
ADMIN_PASSWORD=<starkes-passwort>
ADMIN_FULL_NAME=Vorname Nachname
```

Dann:

```bash
npm run create-admin
```

Das Skript erstellt den Nutzer ueber Supabase Auth (kein Passwort im Code),
ein Profil wird per DB-Trigger angelegt und die Rolle `super_admin` zugewiesen.
**Danach `ADMIN_PASSWORD` wieder aus `.env.local` entfernen.**

---

## Lokal starten

```bash
npm run dev          # http://localhost:3000
```

Weitere Skripte:

```bash
npm run build        # Produktions-Build
npm run start        # Produktions-Server (nach build)
npm run typecheck    # TypeScript pruefen
npm run lint         # ESLint
```

### Demo-Modus (ohne Supabase)

Ist `.env.local` nicht gesetzt, startet die App lokal trotzdem: Auth ist dann
deaktiviert, ein gelber **Demo-Modus**-Hinweis erscheint und die Module zeigen
Leerzustaende. So lassen sich Layout und Navigation ohne Backend ansehen.
Sobald die Supabase-Werte gesetzt sind, greift die echte Anmeldung und der
Schutz der Routen.

---

## Sicherheit (Phase 1)

- **Protected Routes** via `src/middleware.ts` (Session-Pruefung mit `getUser()`).
- **Keine Secrets im Frontend** - der Service-Role-Key wird nur im Skript genutzt.
- **RLS aktiviert** auf allen Tabellen, mit rollenbasierten Basis-Policies.
- **Rollenpruefung serverseitig** (`requireRole`) zusaetzlich zur UI-Filterung.

---

## Was als naechstes gebaut wird

| Phase | Inhalt | Status |
| ----- | ------ | ------ |
| **1** | Foundation, Auth, Rollen, Layout & Navigation | ✅ fertig |
| **2** | Core-Datenmodell (clients, contacts, projects, files, meetings, contracts, offers + statuses/priorities + Service-Layer) | ✅ fertig - [`docs/PHASE-2.md`](docs/PHASE-2.md) |
| **3** | Task-System (Board, Tabelle, Tagesansichten, Detail, Quick-Create, Dashboard) | ✅ fertig - [`docs/PHASE-3.md`](docs/PHASE-3.md) |
| **4** | Sales-CRM (Leads, Pipeline, Follow-ups, Angebote, Vertraege, Termine, Dashboard) | ✅ fertig - [`docs/PHASE-4.md`](docs/PHASE-4.md) |
| **5** | Client-Management (Kunden, Reporting-Calls, Onboarding, Alerts, Dashboard) | ✅ fertig - [`docs/PHASE-5.md`](docs/PHASE-5.md) |
| **6** | Production Hub (Websites, Ads, CRM, Content, Shootings, Assets, Freigaben, Kalender, Auslastung) | ✅ fertig - [`docs/PHASE-6.md`](docs/PHASE-6.md) |
| **7** | Creator Pool (Talent-CRM, Matching, Verfuegbarkeiten, Bewertungen, Besetzung, Pipeline) | ✅ fertig - [`docs/PHASE-7.md`](docs/PHASE-7.md) |
| **8** | Finance (Rechnungen, Kosten, MRR/ARR, Forecast, Profitabilitaet, Kundenwert, Reports) | ✅ fertig - [`docs/PHASE-8.md`](docs/PHASE-8.md) |
| **9** | AI- & Automation-Fundament (Prompts, AI-Runs, Jobs, Integrationen, Logs) | ✅ fertig - [`docs/PHASE-9.md`](docs/PHASE-9.md) |
| **10** | Lead Engine (Discovery, Website-Scan, Opportunity-Scoring, Dedup, Sales-Uebergabe) | ✅ fertig - [`docs/PHASE-10.md`](docs/PHASE-10.md) |
| **11** | Outreach Engine (Kampagnen, Templates, Entwuerfe, Follow-ups, Inbox, Termine, Opt-out) | ✅ fertig - [`docs/PHASE-11.md`](docs/PHASE-11.md) |
| **12** | Website Audit Engine (8 Scores, Findings, Opportunities, AI-Summary, Report + Sales-Version) | ✅ fertig - [`docs/PHASE-12.md`](docs/PHASE-12.md) |
| **13** | Proposal Engine (Angebote, Positionen, Preislogik, Offerte/Praesentation/Vertrag, Rechnungsentwurf, Versionierung) | ✅ fertig - [`docs/PHASE-13.md`](docs/PHASE-13.md) |
| **14** | Knowledge/Meeting/SOP (Meeting Assistant, Knowledge Base, SOPs, Prompt Library, Suche) | ✅ fertig - [`docs/PHASE-14.md`](docs/PHASE-14.md) |
| **15** | Executive Command Center (CEO-Dashboard, Health-Engines, Goals, Tagesbriefing) | ✅ fertig - [`docs/PHASE-15.md`](docs/PHASE-15.md) |
| **16** | Growth Engine (Upsell/Referral/Review/Renewal/Churn/Testimonials) | ✅ fertig - [`docs/PHASE-16.md`](docs/PHASE-16.md) |
| **17** | Autonomous Growth Engine (Revenue Journeys, Next Best Action, Recommendations, Daily Briefing, Weekly Report, Orchestrator, AI Assistant) | ✅ fertig - [`docs/PHASE-17.md`](docs/PHASE-17.md) |

Details: [`docs/blueprint/09-phasenplan-entwicklungsregeln.md`](docs/blueprint/09-phasenplan-entwicklungsregeln.md)

### Konkrete naechste Schritte nach Phase 1

1. Echte Supabase-Werte eintragen und Migration ausfuehren.
2. Super-Admin anlegen, Login/Logout end-to-end testen.
3. Weitere Mitarbeitende anlegen und Rollen zuweisen (vorerst per SQL/Skript).
4. Mit **Phase 2** beginnen: das vollstaendige Datenmodell.
