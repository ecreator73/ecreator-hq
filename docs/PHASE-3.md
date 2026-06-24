# Phase 3 - Task-System (Herzstueck)

Das zentrale Operations-System. Jede Arbeit in eCreator laeuft ueber Aufgaben.
Mit voller UI: Kanban-Board, Tabelle, Tagesansichten, Detail-Seite, Quick-Create,
Filter, Suche und Dashboard-Integration.

## Datenbank (Migration `supabase/migrations/0003_task_system.sql`)

| Tabelle | Zweck |
| --- | --- |
| `tasks` | Aufgaben (Status/Prioritaet via FK in die Registry) |
| `subtasks` | Checklisten-Punkte je Aufgabe |
| `task_comments` | Team-Kommentare |
| `task_files` | Verknuepfung Aufgabe ↔ Datei (`files`) |
| `task_assignees` | mehrere Verantwortliche je Aufgabe |
| `task_activity` | task-spezifische Historie (Detail-Tab "Aktivitaet") |
| `task_templates` + `task_template_items` | Vorlagen (z.B. "Website Projekt") fuer automatische Aufgaben |
| `notifications` | Benachrichtigungs-Infrastruktur (kein Versand in dieser Phase) |

### Status & Prioritaet (zentrale Registry, kein Hardcoding)
- Task-Status liegen in `statuses` mit `entity_type='task'`: `open`, `in_progress`,
  `waiting_client`, `review`, `blocked`, `done`, `archived` (deutsche Labels).
- `tasks.status_id` / `tasks.priority_id` sind **FK** in `statuses`/`priorities`.
  Services nehmen Status-/Prioritaets-*Keys* entgegen und loesen sie auf.
- Ein DB-Trigger setzt Default-Status (`open`), Default-Prioritaet (`medium`) und
  pflegt `completed_at` automatisch beim Wechsel auf `done`.
- Prioritaeten (geteilt mit Projekten): die oberste heisst nun **"Kritisch"**
  (Key bleibt `urgent`) - gemaess Prompt 3.

## Service-Layer (`src/server/services/`)
- `tasksService`: `list` (Filter/Suche/Pagination/Sort), `board` (Kanban),
  `getById`, `create`, `update`, `move` (Drag&Drop), `remove` (Soft-Delete),
  `dashboardCounts`. Lesezugriffe liefern aufgeloeste Beziehungen
  (status/priority/assignee/client/project) + Subtask-Fortschritt + Kommentaranzahl.
- `subtasksService`, `taskCommentsService`, `taskActivityService`,
  `notificationsService`, `taskTemplatesService`, `teamService`.
- Jede Mutation schreibt `task_activity` + `audits`; Zuweisung erzeugt eine
  `notification` (Infrastruktur).

## Server Actions (`src/app/(app)/tasks/actions.ts`)
CRUD + `moveTaskAction` (Board), Subtask-/Kommentar-Actions, `applyTemplateAction`,
Notification-Actions, `taskFormOptionsAction` (Dropdown-Optionen). Alle geben ein
`ActionResult` zurueck und revalidieren die betroffenen Pfade.

## Ansichten (`/tasks`)
| Route | Ansicht |
| --- | --- |
| `/tasks` | **Board** (Kanban, Drag&Drop, live speichern) |
| `/tasks/table` | **Tabelle** (Filter, Suche, Sortierung, Bulk-Actions, Pagination) |
| `/tasks/today` | **Heute** (ueberfaellig + heute faellig) |
| `/tasks/tomorrow` | **Morgen** |
| `/tasks/week` | **Diese & naechste Woche** |
| `/tasks/mine` | **Meine Aufgaben** |
| `/tasks/[id]` | **Detail** mit Tabs: Uebersicht · Kommentare · Dateien · Aktivitaet · Subtasks |

- **Quick-Create**: globaler "+ Aufgabe"-Button im Header (ueberall verfuegbar);
  kann mit Kontext (Kunde/Projekt) vorbelegt werden.
- **Filter** (kombinierbar, via URL): Status, Prioritaet, Kunde, Projekt,
  Verantwortlich + Suche ueber Titel/Beschreibung/Kunde/Projekt.
- **Dashboard**: Home zeigt Widgets (heute faellig, ueberfaellig, kritisch, meine)
  + Liste "Heute & ueberfaellig".
- **"Aufgaben"** ist als eigener Hauptnavigations-Bereich ergaenzt (Herzstueck;
  Routen ueber die im Blueprint vorgesehenen Home/Production-Verweise hinaus).

## Sicherheit / RLS
- RLS auf allen 9 Tabellen. `tasks`: sichtbar fuer eingeloggte Org-Mitglieder
  (nicht geloescht); aendern durch Owner/Assignee + breite Rollen; harte Loeschung
  nur `super_admin`. Kind-Tabellen folgen der Sichtbarkeit der Aufgabe
  (`task_visible()`). `notifications` nur fuer den eigenen Nutzer.
- `created_by` wird per Trigger erzwungen (kein Spoofing).

## Bewusst aufgeschoben
- **Datei-Upload** (Detail-Tab "Dateien"): Tabellen `files`/`task_files` stehen;
  der eigentliche Upload via Supabase Storage kommt mit dem Operations-/Dateien-Modul.
- **Benachrichtigungs-Versand** (E-Mail): nur Infrastruktur, kein Versand.

## Setup
1. Migrationen der Reihe nach ausfuehren: `0001` → `0002` → `0003`.
2. `npm run typecheck` und `npm run build` muessen fehlerfrei sein.

> **Demo-Modus:** Ohne Supabase rendern alle Ansichten mit Leerzustaenden
> (Service-Aufrufe brechen sofort ab). Mit echter Supabase-Verbindung sind
> Board/Tabelle/CRUD/Drag&Drop voll funktionsfaehig.

## Naechster Schritt
**Phase 4 - Sales-CRM** (Pipeline, Leads, Opportunities, Angebote, Outreach,
Termine). Aufgaben sind so gebaut, dass jedes spaetere Modul direkt Aufgaben
erzeugen und verknuepfen kann.
