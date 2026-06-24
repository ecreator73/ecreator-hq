# Phase 9 - AI Foundation & Automation Layer

Das **Fundament** fuer alle zukuenftigen AI-Engines (Lead, Audit, Outreach,
Proposal, Meeting-Assistant ...). In dieser Phase werden noch KEINE echten
Engines gebaut und KEINE Live-AI-Calls ausgefuehrt - nur die zentrale,
sichere und skalierbare Infrastruktur: keine verstreuten API-Calls, keine
hardcoded Prompts, keine AI-Logik in UI-Komponenten.

## Datenbank (Migration `supabase/migrations/0009_ai_automation.sql`)

| Tabelle | Zweck |
| --- | --- |
| `ai_prompts` | Zentrale Prompt-Templates (system/user, Variablen, Modell, Temperatur, Status) |
| `ai_runs` | Protokoll jedes AI-Laufs (Input, Output, Modell, Status, Fehler, Tokens, Kosten) |
| `automation_jobs` | Geplante Jobs (Typ, Status, Schedule, last/next run, config) |
| `automation_runs` | Lauf-Protokoll je Job (Status, Zeit, Result, Logs) |
| `integrations` | Drittsysteme - Credentials **verschluesselt** in `encrypted_credentials` |
| `webhooks` | Eingehende Webhooks (Endpoint, Secret, Status) |

`notifications` existiert bereits (Phase 3) und wird **nicht dupliziert** - eine
SECURITY-DEFINER-Funktion `create_notification(...)` ergaenzt das Erstellen von
Benachrichtigungen fuer beliebige Nutzer (Fundament fuer Engines).

## Sicherheit
- **RLS: nur `super_admin` / `ceo` / `developer`** sehen den Bereich. Schreiben
  auf `integrations`/`webhooks` (Secrets) **nur `super_admin`**.
- **Credentials verschluesselt** (`src/lib/crypto.ts`, AES-256-GCM, Schluessel
  aus `CREDENTIALS_SECRET`). `encrypted_credentials` wird **nie** ans Frontend
  gegeben - der Service liefert nur `has_credentials`. Webhook-Secrets werden
  maskiert (`maskSecret`).
- **Audit-Logs ohne Secrets**: Integrations-Audits enthalten nur Metadaten.
- Fehlerbehandlung: API-/Rate-Limit-/fehlende-Credentials-/Timeout-/ungueltige-
  Variablen-Faelle laufen ueber `ServiceError` + `ActionResult`.

## Prompt-Template-System (`src/lib/ai-prompt.ts`)
Variablen im Format `{{variable}}`. `extractVariables` liest sie aus Templates;
`renderTemplate` ersetzt sie. Beim Speichern werden Variablen automatisch
abgeleitet, wenn nicht gesetzt. `aiPromptsService.render(id, values)` erzeugt
den finalen System-/User-Prompt; fehlende Variablen werden gemeldet.

## Service-Layer
- `aiPromptsService` (prompt.service): CRUD + activate/deactivate + render.
- `aiRunsService` (ai.service): list/getById/log + **testRun** (rendert Template,
  protokolliert einen ai_run - Vorschau ohne Live-AI; fehlende Variablen ->
  Fehler-Run).
- `automationJobsService` / `automationRunsService` (automation.service): CRUD,
  activate/deactivate, **runNow** (protokolliert einen automation_run, keine
  Live-Logik), Logs.
- `integrationsService` / `webhooksService` (integration.service): sichere
  Projektion (kein Secret), Credentials werden beim Speichern verschluesselt.
- `notificationsService.create` (via RPC) - Benachrichtigungs-Fundament.

## Job-Typen (vorbereitet, noch nicht live)
daily_lead_search · website_audit · outreach_draft · follow_up_check ·
reporting_call_reminder · contract_expiry_check · creator_matching ·
proposal_generation. Schedule: taeglich / woechentlich / monatlich / manuell.

## Integrationen (vorbereitet)
OpenAI · Claude API · Gmail · Resend · Google Calendar · Meta Ads · Google Ads ·
TikTok · LinkedIn · WhatsApp.

## UI (`/settings/ai`, nur super_admin/ceo/developer)
Eigener Bereich unter Settings (rollenbasierte Sub-Nav; Settings-Layout wurde
um `developer` erweitert, die 5 Basis-Settings-Seiten sind separat auf
`super_admin/ceo/cso` abgesichert). Unterseiten: **Uebersicht** (KPIs + letzte
Laeufe/Fehler), **Prompt Templates** (CRUD + Test-Run), **Automation Jobs**
(CRUD + aktivieren/deaktivieren + manuell ausfuehren), **AI Runs** (Liste +
Detail mit Input/Output/Logs), **Integrationen** (Konfiguration ohne Secrets),
**Logs** (Automation-Laeufe).

## Setup
`CREDENTIALS_SECRET` in `.env.local` setzen (>= 16 Zeichen, zufaellig) - ohne
diesen Schluessel koennen keine Integrations-Credentials gespeichert werden.
Migrationen der Reihe nach: `0001 → … → 0009`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## NICHT gebaut (kommt in den naechsten Phasen)
Vollstaendige Lead-/Audit-/Outreach-/Proposal-Engines, automatische E-Mail-
Kampagnen. Diese Phase liefert nur das Fundament.

## Naechster Schritt
**Phase 10 - Lead Engine** (lead_sources, lead_discovery_runs, lead_opportunities,
Opportunity-Scoring, Auto-Uebergabe an die Sales-Pipeline).
