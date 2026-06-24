# Phase 13 - Proposal Engine, Praesentationen, Vertraege & Rechnungen

Aus Lead/Audit/Opportunity in Minuten professionelle Verkaufsunterlagen:
Offerte, Praesentation, Vertragsentwurf und Rechnungsentwurf - mit Versionierung
und Preislogik. **Kein Rechtsersatz** - alles als Entwurf markiert.

## Datenbank (Migration `supabase/migrations/0013_proposals.sql`)

| Tabelle | Zweck |
| --- | --- |
| `proposals` | Angebote (Typ, Status, einmalig/monatlich/Setup, Laufzeit, Offertentext, Vertragsfelder, Version) |
| `proposal_items` | Leistungspositionen (Menge, Einzel-/Gesamtpreis, wiederkehrend, Kategorie) |
| `pricing_items` | **Preislogik** - verwaltbare Preisvorlagen (keine hardcoded Preise) |

Status-Registry `proposal` (Entwurf/Bereit zur Pruefung/Gesendet/Akzeptiert/
Abgelehnt/Archiviert). Versionierung ueber `version` + `parent_id`.
RLS: Angebote erstellen `super_admin/ceo/cso/sales`; **Preise bearbeiten nur
`super_admin/ceo`** (lesen alle Sales-Rollen).

## Engine (`proposalsService`)
- **generate({proposal_type, lead_id?, client_id?})**: erzeugt Angebot +
  Standard-Positionen aus `PROPOSAL_TEMPLATES` (Preise aus `pricing_items`) +
  Offertentext (Ausgangslage/Ziel/Loesung/naechste Schritte). Protokolliert
  einen `ai_run` (Phase-9-Layer, keine Live-AI).
- **recomputeTotals**: `amount` = Summe einmalig, `monthly_amount` = Summe
  wiederkehrend (automatisch bei jeder Positionsaenderung).
- **newVersion**: klont Angebot + Positionen mit hochgezaehlter Version.
- **createInvoiceDraft**: erzeugt einen Rechnungsentwurf (Finance-Integration,
  Phase 8) - **erfordert Finance-Rechte**, nicht automatisch versendet.
- **dashboard**: Entwuerfe, zur Pruefung, gesendet, akzeptiert, Volumen,
  Abschlussquote.

## Workflow
Lead -> Audit -> Opportunity -> **Proposal generieren** -> pruefen -> senden ->
akzeptiert -> Rechnungsentwurf (Finance). Offerte/Praesentation/Vertrag als
druckbare Dokumente (eCreator-Branding, Browser-PDF).

## Module / Navigation (`/sales/proposals`, nur super_admin/ceo/cso/sales)
| Route | Inhalt |
| --- | --- |
| `/sales/proposals` | **Dashboard** (Entwuerfe, gesendet, akzeptiert, Volumen, Abschlussquote) |
| `/sales/proposals/list` | Angebotsliste (Filter Status/Typ/Suche) |
| `/sales/proposals/[id]` | **Detail** (Tabs: Uebersicht · Leistungen · Preis · Dokumente · Praesentation · Vertrag · Aktivitaet/Versionen) |
| `/sales/proposals/[id]/offer` | Druckbare **Offerte** |
| `/sales/proposals/[id]/presentation` | Druckbare **Praesentation** (9 Folien) |
| `/sales/proposals/[id]/contract` | Druckbarer **Vertragsentwurf** (kein Rechtsersatz) |
| `/sales/proposals/pricing` | **Preislogik** (Preisvorlagen verwalten) |

Hinweis: Die Preislogik liegt im Proposal-Modul (statt unter Settings), bleibt
aber durch RLS + Action-Guard auf `super_admin/ceo` beschraenkt.

## Setup
Migrationen der Reihe nach: `0001 → … → 0013`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## NICHT gebaut
Digitale Signatur, Zahlungsabwicklung, rechtssichere Vertragspruefung,
automatische Rechnungsstellung ohne Pruefung.

## Naechster Schritt
**Phase 14 - Knowledge Base, Meeting Assistant & SOP Engine** (Operations).
