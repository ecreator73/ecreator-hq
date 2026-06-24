# Phase 5 - Client Management & Customer Success

Das Herzstueck nach dem Verkauf: aktive Kunden zentral betreuen, Reporting-Calls
organisieren, Onboarding/Offboarding strukturieren und Risiken fruehzeitig sehen.

## Datenbank (Migration `supabase/migrations/0005_client_management.sql`)

| Tabelle | Aenderung |
| --- | --- |
| `reporting_calls` | **neu** - zentrale Kundenkommunikation (Agenda, Themen, Resultate, Herausforderungen, naechste Schritte, Verantwortlichkeiten) |
| `client_interactions` | **neu** - Kontakthistorie/Timeline je Kunde (call/meeting/reporting/email/whatsapp/note) |
| `client_checklists` (+`_items`) | **neu** - Onboarding-/Offboarding-Checklisten |
| `clients` | **erweitert** - `package` |

Registry-Seed: **Reporting-Call-Status** (Offen/Geplant/Durchgefuehrt/Verschoben/
Abgesagt). RLS auf allen neuen Tabellen.

## Customer Health = Warnungen (kein Score)
`clientsOpsService` berechnet pro aktivem Kunden **zur Laufzeit** Warnungen
(nicht gespeichert -> immer aktuell):
- Kein Kontakt seit 30 Tagen · Kein Reporting-Call geplant ·
  Vertrag laeuft bald aus · Viele offene Aufgaben (>=5) · Projekt blockiert.

## Abgeleitete Kennzahlen
- **MRR** = Summe der `value_monthly` aktiver Vertraege je Kunde.
- **Letzter Kontakt** = juengste `client_interactions`.
- **Naechster Reporting-Call** = naechster offener/geplanter Call in der Zukunft.
- **Offene Aufgaben** = Tasks des Kunden (nicht erledigt/archiviert).

## Module / Navigation (`/clients`)
| Route | Inhalt |
| --- | --- |
| `/clients` | **Dashboard**: aktive/Onboarding/pausierte Kunden, MRR, Reporting diese Woche, Vertraege laufen aus, Kunden mit offenen Aufgaben, Kunden ohne Kontakt + Warnungen-Liste |
| `/clients/list` | **Kundenliste** (Firma, Status, Paket, MRR, Start, letzter Kontakt, naechster Reporting, offene Aufgaben, Verantwortlicher, Warnungen; Filter + Suche) |
| `/clients/[id]` | **Kunden-Detail** (Tabs: Uebersicht · Projekte · Aufgaben · Reporting · Dateien · Rechnungen · Aktivitaet) + Onboarding/Offboarding + Bearbeiten |
| `/clients/reporting` | **Reporting-Call-Dashboard** (Heute · Diese Woche · Diesen Monat · Ueberfaellig; markieren durchgefuehrt/verschoben/abgesagt; "Aufgaben erstellen") |

## Reporting-Call-System
Eigenstaendig (nicht "nur Meetings"). Detailfelder fuer echte Reporting-Calls.
Nach einem Call erzeugt **"Aufgaben erstellen"** direkt Tasks aus den naechsten
Schritten (`reportingCallsService.createTasksFrom`).

## Onboarding / Offboarding
- **Onboarding starten** legt eine Standard-Checkliste an (Vertrag erhalten,
  Kickoff geplant, Zugaenge …) **und** erzeugt Kickoff-/Reporting-Vorbereitungs-
  Aufgaben (`clientChecklistsService.startOnboarding`).
- **Offboarding** legt die Abschluss-Checkliste an (Datenexport, Abschluss-
  gespraech, Dateien uebergeben, Zugaenge entfernen, Feedback).

## Home-Dashboard erweitert
Customer-Success-Widgets: aktive Kunden, MRR, Reporting diese Woche, Kunden ohne
Kontakt, Kunden mit offenen Aufgaben.

## Setup
Migrationen der Reihe nach: `0001 → 0002 → 0003 → 0004 → 0005`. Danach
`npm run typecheck` + `npm run build` muessen fehlerfrei sein.

## Naechster Schritt
**Phase 6 - Production Module** (Projekte, Content, Websites, Ads, CRM-Builds).
