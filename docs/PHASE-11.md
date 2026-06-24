# Phase 11 - Outreach Engine, Follow-Ups & Terminbuchung

Aus Opportunities echte Gespraeche machen - **personalisierte Entwuerfe, kein
Blind-Massenversand**. Templates, Follow-ups, Antwort-Tracking, Termine.

## Datenbank (Migration `supabase/migrations/0011_outreach.sql`)

| Tabelle | Zweck |
| --- | --- |
| `outreach_campaigns` | Kampagnen (Typ, Status) |
| `email_templates` | E-Mail-Vorlagen (Betreff/Text, Variablen, aktiv) |
| `outreach_contacts` | Kontakte je Lead |
| `outreach_messages` | Nachrichten (Entwurf -> gesendet -> geoeffnet -> beantwortet -> positiv/negativ) |
| `follow_up_sequences` | Follow-up-Sequenzen (Schritte als JSON: Tag 0/3/7/14) |
| `booked_meetings` | Termine (angefragt/bestaetigt/durchgefuehrt/abgesagt) |
| `unsubscribes` | Opt-out - **nie wieder kontaktieren** |

Status-Registry: `outreach_message`, `booked_meeting`. Nur `super_admin/ceo/cso/
sales` (RLS).

## Kernlogik (`outreach-messages.service.ts`)
- **generateDraft**: erzeugt einen personalisierten ENTWURF aus einem Template
  (gerendert mit Lead-Daten via `{{variable}}`) oder einem Basis-Text;
  protokolliert einen `ai_run` (Phase-9-Layer). **Respektiert Opt-out** (blockt
  abgemeldete Adressen). Kein Live-AI/Versand.
- **send**: markiert die Nachricht als gesendet (`sent_at`). Tatsaechliche
  Zustellung erfordert eine verbundene **Gmail/Resend-Integration** (Phase 9
  vorbereitet) - in dieser Phase kein echter Versand. Opt-out wird erneut
  geprueft.
- **setStatus**: fuehrt `opened_at`/`replied_at` mit (Antwort-Tracking).
- **dashboard**: gesendet, Antworten, Positive, Quoten (Antwort-/Positiv-/
  Terminquote). **inbox**: Positive · Neue Antworten · Unbeantwortet.

## Module / Navigation (`/sales/outreach`, nur super_admin/ceo/cso/sales)
| Route | Inhalt |
| --- | --- |
| `/sales/outreach` | **Dashboard** (gesendet, Antworten, Positive, Follow-ups, Termine + Quoten) |
| `/sales/outreach/inbox` | **Sales Inbox** (Positive · Neue Antworten · Unbeantwortet) |
| `/sales/outreach/pipeline` | **Pipeline** (Kanban nach Nachrichten-Status, Drag&Drop) |
| `/sales/outreach/templates` | Templates · Kampagnen · Follow-up-Sequenzen |
| `/sales/outreach/meetings` | Terminverwaltung (Status via `<StatusSelect>`) |
| `/sales/outreach/optout` | Opt-out / Abmeldungen |

Nachrichten-Editor (Betreff/Text bearbeiten, Senden, Status setzen) als Modal.
"Personalisierte E-Mail erstellen" -> Entwurf-Generator (Lead + Template).

## Setup
Migrationen der Reihe nach: `0001 → … → 0011`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## NICHT gebaut (kommt spaeter)
Website-Audit-PDF-Generator, Proposal-Generator, vollautomatische Kaltakquise,
Social-Media-Outreach, echter E-Mail-Versand (braucht Integration).

## Naechster Schritt
**Phase 12 - Website Audit Engine** (website_audits, audit_findings,
audit_opportunities, PDF-Report, Sales-Version).
