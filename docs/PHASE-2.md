# Phase 2 - Core Database Model & Business Entities

Datenbank-Fundament fuer Sales, Clients, Production, Finance und Operations.
**Kein UI** in dieser Phase - nur Schema, Beziehungen, Typen, Validierung und ein
sauberer Service-Layer (CRUD).

## Was gebaut wurde

### Tabellen (Migration `supabase/migrations/0002_core_business_entities.sql`)

| Tabelle | Zweck | Schluessel-Beziehungen |
| --- | --- | --- |
| `statuses` | zentrale Status-Registry je Entitaet (DB-Wert + deutsches Label) | — |
| `priorities` | zentrale Prioritaeten (projects, spaeter tasks) | — |
| `clients` | Kunden | `account_manager_id` → profiles |
| `contacts` | Ansprechpartner | `client_id` → clients (1→n) |
| `projects` | Projekte (Website/Ads/CRM/Content/Recruiting/Intern) | `client_id` → clients, `owner_id` → profiles |
| `files` | Dateien | `client_id`, `project_id`, `uploaded_by` |
| `meetings` | Meetings | `client_id` → clients |
| `contracts` | Vertraege | `client_id` → clients |
| `offers` | Offerten | `client_id` → clients |

`activity_logs` + `audits` stammen aus **Phase 1** und werden bewusst **nicht
dupliziert** (siehe unten).

### Beziehungen

```
Client ──1:n── Contacts
Client ──1:n── Projects ──1:n── Files
Client ──1:n── Contracts
Client ──1:n── Offers
Client ──1:n── Meetings
User (profiles) ──1:n── Projects (owner_id), Clients (account_manager_id)
User (profiles) ──1:n── Activity Logs / Audits (actor_id)
```

### Zentrale Status-Registry (keine hardcodierten Statuswerte)

- `statuses` + `priorities` sind die **einzige Quelle** fuer Status-/Prioritaetswerte.
- DB-Wert (`key`) ist englisch/`snake_case`; das deutsche Label liegt in der Registry.
- Ein **Validierungs-Trigger** (`validate_status`/`validate_priority`) prueft jeden
  Status/jede Prioritaet referenziell gegen die Registry - ohne hardcodierte
  CHECK-Listen.
- TS-Spiegel: [`src/config/catalog.ts`](../src/config/catalog.ts) (identische Werte).

### TypeScript

- **Row-Typen**: [`src/types/entities.ts`](../src/types/entities.ts)
- **Zod-Schemas + Validation**: [`src/lib/validation/`](../src/lib/validation/) (insert/update je Entitaet, `common.ts` mit geteilten Bausteinen)
- **Status-/Typ-Enums**: aus `src/config/catalog.ts` abgeleitet

### Service-Layer (CRUD)

[`src/server/services/`](../src/server/services/) - **keine** Supabase-/SQL-Queries
direkt in Komponenten. Eine generische CRUD-Factory (`_helpers.ts`) kapselt das
Muster (Zod-Validierung, Soft-Delete, Audit-/Activity-Logging) genau einmal;
jede Entitaet konfiguriert sie:

```ts
import { clientsService } from "@/server/services";

const clients = await clientsService.list();                 // read (ohne geloeschte)
const client  = await clientsService.getById(id);            // read one
const created = await clientsService.create({ name: "..." }); // create (+ Audit/Activity)
const updated = await clientsService.update(id, { city: "Zuerich" });
await clientsService.remove(id);                              // Soft-Delete
```

Verfuegbar: `clientsService`, `contactsService`, `projectsService`, `filesService`,
`meetingsService`, `contractsService`, `offersService`, `lookupsService`.

## Bewusste Entscheidungen (Reconciliation Blueprint ↔ Prompt 2)

1. **Enum-Sprache**: Prompt 2 nennt deutsche Statuswerte ("aktiv", "onboarding" …);
   gemaess Blueprint (00 §8) liegen die **DB-Werte englisch/snake_case** vor
   (`active`, `onboarding`, `paused`, `ended`), die deutschen Labels in `statuses`.
2. **`activity_logs` nicht dupliziert**: Prompt 2 listet `activity_logs` mit
   `old_value`/`new_value`. Der Blueprint trennt das in `activity_logs` (Feed) +
   `audits` (alt/neu). Beide existieren aus Phase 1; der Service schreibt alt/neu
   nach `audits` (`recordAudit`) - **keine doppelte Struktur**.
3. **Geld**: Feldnamen wie in Prompt 2 (`value_monthly`, `value_total`, `amount`),
   gespeichert als **Ganzzahl in Rappen** + `currency` (Default CHF) gemaess Blueprint.

## Setup / Migration einspielen

1. Migrationen der Reihe nach ausfuehren (Supabase SQL Editor oder `supabase db push`):
   - `supabase/migrations/0001_phase1_foundation.sql` (falls noch nicht geschehen)
   - `supabase/migrations/0002_core_business_entities.sql`
2. Der Registry-Seed (statuses/priorities) wird automatisch mitgeliefert -
   **keine** Demo-/Fake-Geschaeftsdaten.
3. Pruefen: `npm run typecheck` und `npm run build` müssen fehlerfrei sein.

## RLS (vorbereitet)

Alle Tabellen haben RLS aktiv mit Basis-Policies:
- **SELECT**: eingeloggte Org-Mitglieder sehen nicht-geloeschte Datensaetze.
  Ausnahme **contracts/offers** (Finanzdaten): nur `super_admin`, `ceo`, `cso`,
  `finance` und der Ersteller.
- **INSERT**: eingeloggte Nutzer. Ein **BEFORE-INSERT-Trigger** (`stamp_actor` /
  `stamp_uploader`) setzt `created_by`/`updated_by` bzw. `uploaded_by` zwingend auf
  `auth.uid()` - Owner-/Audit-Spalten lassen sich nicht client-seitig faelschen.
- **UPDATE**: `can_manage(owner) OR created_by = auth.uid()` - Owner, Ersteller +
  breite Rollen (super_admin/ceo/cso/pm). Kein Lock-out bei leerem Owner.
- **DELETE** (hart): nur `super_admin`; sonst Soft-Delete via UPDATE.

Spaetere Phasen verfeinern die Sichtbarkeit weiter (z. B. Sales nur eigene Leads).

## Naechster Schritt

**Phase 3 - Task-System** (`tasks`, `subtasks`) + operatives "Mein Tag" auf Home.
Das Datenmodell ist dafuer vorbereitet (projects als Container, profiles als Owner).
