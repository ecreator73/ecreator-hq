# Phase 4 - Sales CRM (Leads, Pipeline, Angebote, Vertraege)

Das erste umsatzrelevante Modul: Lead-Pipeline, Follow-up-System, Angebots- und
Vertragsverwaltung. Leitprinzip: **Jeder Lead hat immer eine naechste Aktion -
keine Pipeline-Leichen.**

## Datenbank (Migration `supabase/migrations/0004_sales_crm.sql`)

| Tabelle | Aenderung |
| --- | --- |
| `leads` | **neu** - Firmendaten, Kontakt, Score, Wert, Status (FK), Owner, `next_action_date` |
| `sales_activities` | **neu** - Touchpoint-Zeitleiste je Lead (call/email/meeting/offer/note/followup) |
| `meetings` | **erweitert** - `lead_id`, `status`, `duration_minutes` (kein zweites Termin-Schema) |
| `offers` | **erweitert** - `lead_id`, `offer_type`, `valid_until`, `owner_id`; `client_id` nullable |
| `contracts` | **erweitert** - `offer_id` (Angebot -> Vertrag) |
| `tasks` | **erweitert** - `lead_id` (Lead-Detail Aufgaben-Tab) |

Registry-Seed: **Lead-Status** (10: Neu … Pausiert) und **Meeting-Status**
(Geplant/Durchgefuehrt/Abgesagt/Verschoben) - englische Keys, deutsche Labels.

### Bewusste Reconciliations (statt Duplikate)
- **`sales_meetings`** wurde **nicht** angelegt - stattdessen `meetings` erweitert
  (Blueprint: ein Termin-Schema fuer Sales + Kunden).
- **Angebote/Vertraege** nutzen die bestehenden `offers`/`contracts` (erweitert).
- `sales_activities` ist die **manuelle** Touchpoint-Historie (getrennt vom
  automatischen `activity_logs`).

## Lead-Scoring (`src/lib/lead-score.ts`)
Regelbasiert 0-100 aus Pipeline-Stufe + Budget + Unternehmensgroesse + aktivem
Follow-up. Wird bei jedem Create/Update/Move neu berechnet. Heisse Leads ab 70.
"Spaeter durch AI erweiterbar."

## Follow-up-Pflicht
Ein Lead kann **nicht** ohne `next_action_date` gespeichert werden - ausser
Status ist **Gewonnen** oder **Verloren**. Durchgesetzt im Service (`leadsService`).
Beim Pipeline-Drag in eine offene Stufe wird automatisch ein Follow-up auf
morgen gesetzt, falls keins existiert.

## Module / Navigation (`/sales`)
| Route | Inhalt |
| --- | --- |
| `/sales` | **Dashboard**: neue/heisse Leads, Follow-ups heute, Termine, offene Angebote, Pipeline-Volumen, Abschlussquote, Umsatzpotenzial, "Wen rufe ich heute an?" |
| `/sales/leads` | Leads-Tabelle (Filter: Status/Quelle/Owner/Score + Suche, Pagination) |
| `/sales/pipeline` | Kanban-Pipeline (Drag & Drop, automatische Speicherung) |
| `/sales/leads/[id]` | Lead-Detail (Tabs: Uebersicht · Aktivitaeten · Aufgaben · Angebote · Vertraege · Dateien) + Konvertieren-zu-Kunde |
| `/sales/meetings` | Termine (Lead-verknuepft, Status) |
| `/sales/offers` | Angebote + Angebots-Dashboard (offen/angenommen/verloren/Volumen/Quote) |
| `/sales/contracts` | Vertraege + "Laufen aus (90 Tage)" + Verlaengerungs-Aufgaben |
| `/sales/activities` | Globale Aktivitaets-Timeline |
| `/sales/followups` | Follow-up-Dashboard (ueberfaellig/heute/morgen/diese Woche, farblich) |

- **Quick Actions**: "+ Lead" (Sales-Header), "+ Aufgabe" (globaler Header),
  "+ Angebot"/"+ Termin" (jeweilige Seiten). Lead-Detail erzeugt Aufgaben/
  Aktivitaeten direkt.
- **Suche**: Firma/Ansprechpartner/E-Mail/Telefon. **Filter** kombinierbar.
- **Home-Dashboard** erweitert: Follow-ups heute, heisse Leads, Pipeline-Wert,
  offene Angebote, auslaufende Vertraege.

## Vertragsalerts
`salesDashboardService.contractsExpiring(90)` listet auslaufende Vertraege;
`createRenewalTasksAction()` erzeugt daraus Verlaengerungs-Aufgaben (Infrastruktur,
manuell ausloesbar - Cron folgt in Phase 10).

## Lead -> Kunde -> Projekt
`leadsService.convertToClient(id)` erstellt aus einem Lead einen Kunden
(`clients`) und setzt den Lead auf "Gewonnen". Vertrag/Projekt entstehen
anschliessend im Clients-/Production-Modul.

## Sicherheit / RLS
`leads` + `sales_activities` mit RLS (sichtbar fuer eingeloggte Org-Mitglieder;
Owner/Ersteller + breite Rollen aendern; `created_by` per Trigger erzwungen).
`offers`-Lesepolicy um `owner_id` erweitert (Sales sieht eigene Angebote).

## Setup
Migrationen der Reihe nach: `0001 → 0002 → 0003 → 0004`. Danach
`npm run typecheck` + `npm run build` muessen fehlerfrei sein.

## Naechster Schritt
**Phase 5 - Client Management** (Kundenakte, Vertraege, Reporting-Calls) -
baut auf Leads/Angeboten/Vertraegen auf.
