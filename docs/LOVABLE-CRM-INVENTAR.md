# Lovable-CRM (crm.ecreator.ch) – Bestandsaufnahme

Stand: 19.10.2026, nur lesend erfasst (eingeloggt als Super Admin). Ziel: eCreator OS übernimmt Daten und Struktur, Oberfläche neu.

## Technik
- Vite/React-App auf Lovable, Backend Supabase-Projekt `zjljqnecvlonwlrtepji` (getrennt von eCreator OS `zepqoxcvqgkkkbuhcwnc`).
- 64 Tabellen im Code, 17 Edge-Funktionen, 2 RPC (`calculate_lead_score`, `get_shoot_review`).
- Rollen (`user_roles`): admin 3, sales 3, creative 1. 6 Profile.

## Navigation / Routen
Home («Heute»), Leads (`/leads`, `/leads/alle`, `/leads/tabelle`, `/leads/followups`, `/leads/termine`, `/leads/team`), Mein Bereich (`/mein/leads|anrufe|termine|todos`), Sales (`/sales/angebote|vertraege|termine|team`, `/sales-analytics`), Kunden (`/kunden/liste|:id|onboarding|offboarding|projekte|reporting-calls|dokumente|statistik`), Production (`/production/shootings|creators|content-plaene|ads|webseiten|crm-builds|digitalprojekte|assets|todos|projekte`), Finance (`/finance/umsatz|kosten|rechnungen|offene-posten|kunden`), Analytics, Projekte/Aufgaben (`/projekte`, `/meine-aufgaben`, `/team-workload`, `/zeiten`), Einstellungen (`benutzer|rollen|integrationen|ai|system`).
Öffentlich: `/onboarding` (Kunden-Onboarding-Formular), `/signieren/:kind/:token` (Offerte/Vertrag unterschreiben), `/shoot-review/:token`, `/model` (Creator-Bewerbung), `/passwort-setzen`.

## Daten (Anzahl Datensätze)
| Bereich | Tabelle (Zeilen) |
|---|---|
| Leads | `leads` (320), `lead_comments` (8), `lead_documents` (0), `lead_kanban_columns` (12), `call_logs` (4), `sales_todos` (6), `appointments` (1), `activity_log` (1'336) |
| Kunden-Leads (aus Kunden-CRMs synchronisiert) | `external_leads` (11'358), `external_clients` (16), `client_external_links` (4) |
| Kunden | `clients` (16), `client_contacts` (0), `client_onboarding_submissions` (3), `reporting_calls` (5) |
| Sales-Dokumente | `offers` (2), `contracts` (15), `contract_items` (17), `contract_reminders` (5), `products` (10) |
| Finance | `invoices` (14), `invoice_items` (17), `invoice_payments` (0), `invoice_reminders` (0), `finance_revenues` (30), `finance_costs` (22), `finance_onetime` (0), `finance_settings` (0), `monthly_goals` (0) |
| Production | `shoots` (2), `shoot_scripts` (1), `shoot_date_options` (2), `shoot_files` (0), `shoot_change_requests` (0), `shotlist_items` (0), `creators` (42), `creator_applications` (65), `model_reviews` (0), `videographers` (0), `content_items` (43), `content_plans` (6), `content_recurring_rules` (1), `production_items` (3) |
| Projekte/Aufgaben | `projects` (1), `project_tasks` (7), `project_topics` (5), `project_columns`/`_tags`/`_favorites`/`_task_comments` (0), `tasks` (0), `task_*` (0), `todo_statuses` (4), `sops` (0) |
| System | `profiles` (6), `user_roles` (7), `notifications` (83), `team_chat_messages` (3), `automation_jobs` (5), `ai_reports` (0), `ad_conversion_events` (0) |

Spalten je Tabelle: siehe Erfassung im Verlauf (19.10.2026); Kernfelder:
- `leads`: name, email, phone, source, status (Freitext), notes, metadata (jsonb), assigned_to, industry, dienstleistung, next_action(_date), converted_client_id/at, ad_consent.
- `clients`: company_name, contact_name, Kontakt/Adresse, package, status, monthly_gross_revenue, monthly_commission, setup_fee, Vertragsdaten (Start, Dauer, Mindestlaufzeit, Kündigung), Billing-Adresse, Social-/Drive-Links, account_owner_id, reporting_status_map, external_client_id.
- `contracts`/`offers`: Nummern, Positionen, MWST, Signatur (sign_token, signed_at, signature_data), Auto-Verlängerung.
- `invoices`: QR-Referenz, MWST, Mahnstufe, Periode, Entwurf/Test.
- `shoots`: Termin, Ort, Model/Creator, Videograf, Editor, Skripte, Lieferfristen, Model-Honorar.
- `appointments`: Google-Kalender-Sync, Erinnerungen, Ergebnis, nächster Schritt.

## Datenqualität (Befunde)
- Lead-Status als Freitext, gemischt Deutsch/Englisch: Neu 81 + new 15, Termin 22 + appointment 4, contacted 1, «Kontaktiert / Follow Up» 20, Massenmail 97.
- `external_leads.status`: 35 verschiedene Schreibweisen (u. a. «Nicht Erreicht», «Nicht erreicht», «Nie Erreicht», «new», Emojis).
- Quellen: meta_ads 309 von 320 Leads.
- Nur 7 von 320 Leads haben eine Zuständigkeit.

## Stand eCreator OS (zum Vergleich)
Alt-Import vorhanden: 176 Leads (legacy_id), 14 Kunden, 14 Verträge, 124 Monatszahlen, 80 Aufgaben, 177 Aktivitäten. Fehlend u. a.: 144 neuere Leads, Kunden-Leads, Creator, Bewerbungen, Shoots, Content, Rechnungen, Offerten, Produkte.

## Übernahme-Stand (19.10.2026)
| Stufe | Stand | Wo in eCreator OS |
|---|---|---|
| Dashboard + Leads | übernommen (Migration 0024/0025, `scripts/import-lovable.mjs`) | `/`, `/leads`, `/leads/alle`, `/leads/kampagnen`, `/leads/team`, `/leads/mein` |
| Kunden | übernommen (Migration 0026, `scripts/import-lovable-clients.mjs`) | `/clients/list`, `/clients/[id]` (Kunden-Leads, Rechnung & Links), `/clients/[id]/bericht`, `/clients/leads`, `/clients/onboarding`, `/clients/contracts` |
| Production (Shoots, Creator, Bewerbungen, Content) | übernommen (Migration 0027, `scripts/import-lovable-production.mjs`); Fotos/Videos noch im alten Speicher | `/production/shoots`, `/production/shoots/[id]`, `/production/creators/bewerbungen`, `/production/content` |
| Finance (Rechnungen inkl. QR, Umsatz, Kosten, offene Posten) | übernommen (Migration 0029, `scripts/import-lovable-finance.mjs`); QR-IBAN in `src/config/company.ts` | `/finance/invoices`, `/finance/invoices/[id]`, `/finance/open`, `/finance/monthly` |
| Öffentliche Links (Onboarding, Unterschrift, Shoot-Review, Creator-Bewerbung) | übernommen (Migration 0030); Domain/Kampagnen-Ziel noch auf Lovable | `/model`, `/onboarding?k=`, `/signieren/<offer\|contract>/<token>`, `/shoot-review/<token>` |

Kunden-Leads: Rohstatus bleibt in `client_leads.status_raw`, Gruppe in `status` (Regeln `src/lib/client-lead-status.ts`, pro Kunde überschreibbar über `clients.reporting_status_map`). Vor der Umstellung: Delta-Import aller Skripte (idempotent über `legacy_id`). Achtung: bestehende Datensätze werden mit dem Lovable-Stand überschrieben; für den Delta-Lauf nur neue Datensätze übernehmen.
