# Phase 14 - Knowledge Base, Meeting Assistant & SOP Engine

Die Wissenszentrale: Wissen soll nicht mehr in WhatsApp, Notizen, Koepfen oder
Google Docs verloren gehen - alles zentral, durchsuchbar.

## Datenbank (Migration `supabase/migrations/0014_knowledge.sql`)

| Tabelle | Aenderung |
| --- | --- |
| `meetings` | **erweitert** um `meeting_type`, `recording_url`, `transcript`, `summary`, `action_items` (Meeting Assistant) |
| `knowledge_articles` | **neu** - Artikel (Titel, Inhalt, Kategorie, Tags, Status) |
| `sops` | **neu** - SOPs (Schritte als JSON, Kategorie, Status) |
| `prompt_library` | **neu** - Referenz-Prompts fuers Team (Claude Code, Lovable, Ads ...) |

Internes Wissen - alle eingeloggten Teammitglieder lesen/schreiben (RLS
`to authenticated`). `prompt_library` ist die **Team-Referenzbibliothek** und
nicht mit dem AI-Prompt-Engine-System (`ai_prompts`, Phase 9) zu verwechseln.

## Meeting Assistant (`meetingAssistantService`)
- **generateSummary(id)**: erzeugt eine strukturierte Zusammenfassung aus
  Transkript/Notizen (Vorschau - keine Live-AI), befuellt `summary` und
  `action_items`; protokolliert einen `ai_run`.
- **generateTasks(id)**: erzeugt aus `action_items`/`next_steps` direkt Tasks
  (Phase 3) - eine Aufgabe je Zeile.
- Meeting-Typen: Sales Call · Reporting Call · Onboarding · Intern · Strategie ·
  Kunde.

## Knowledge / SOP / Prompt Library
- `knowledgeArticlesService`, `sopsService`, `promptLibraryService` - jeweils
  CRUD mit Filter (Kategorie/Status/Suche).
- `knowledgeSearchService.search(query)`: **globale Suche** ueber Meetings,
  Artikel, SOPs und Prompts (Grundlage fuer spaetere AI-Suche).

## Module / Navigation (`/operations`, alle eingeloggten)
| Route | Inhalt |
| --- | --- |
| `/operations` | **Uebersicht + globale Suche** |
| `/operations/knowledge` | Knowledge Base (Artikel, Filter, Tags) |
| `/operations/meetings` (+`/[id]`) | **Meeting Assistant** (Transkript, Zusammenfassung erstellen, Aufgaben erstellen) |
| `/operations/sops` | SOP Engine (Schritt-Vorlagen) |
| `/operations/prompts` | Prompt Library (mit Kopieren) |

## Setup
Migrationen der Reihe nach: `0001 → … → 0014`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## Naechster Schritt
**Phase 15 - Executive Command Center & CEO Dashboard**.
