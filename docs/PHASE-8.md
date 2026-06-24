# Phase 8 - Finance, Forecasting, MRR & Business Intelligence

Finanz- und Steuerungsmodul fuer die Geschaeftsfuehrung - **kein Buchhaltungs-,
MWST- oder Lohn-Modul**. eCreator soll jederzeit wissen: Umsatz, MRR/ARR,
Kundenwert, auslaufende Vertraege und die finanzielle Zukunft.

## Datenbank (Migration `supabase/migrations/0008_finance.sql`)

| Tabelle | Zweck |
| --- | --- |
| `invoices` | Ausgehende Rechnungen (Betrag/MWST in Rappen, Faelligkeit, bezahlt am, Status) |
| `expenses` | Betriebliche Kosten (Kategorie, Betrag, wiederkehrend + Frequenz) |

Rechnungs-Status-Registry `invoice` (Entwurf/Offen/Bezahlt/Ueberfaellig/Storniert).
**RLS: nur `super_admin` / `ceo` / `finance`** duerfen lesen/schreiben (Select,
Insert, Update auf Rollen beschraenkt; Delete nur super_admin). MRR/ARR/Forecast
werden NICHT gespeichert, sondern zur Laufzeit berechnet.

## Engines (`src/server/services/finance.service.ts`, `src/lib/finance.ts`)
- **MRR** = Summe `value_monthly` aktiver Vertraege. **ARR** = MRR × 12.
- **Umsatz** = bezahlte Rechnungen (`paid_date`) im Monat / Jahr.
- **Forecast** (`forecast(count)`): je Monat der vertragliche Umsatz (aktive
  Vertraege, Vertragsende beruecksichtigt) minus wiederkehrende Kosten →
  Umsatz/Kosten/Gewinn fuer naechsten Monat, 3 und 12 Monate.
- **Profitabilitaet**: Gewinnschaetzung = MRR − wiederkehrende Monatskosten.
- **Kundenwert** (`customerValues`): Gesamtumsatz (bezahlt), MRR, Laufzeit,
  Ø Monatswert, offener Betrag je Kunde.
- **Alerts**: Rechnung ueberfaellig · Vertrag laeuft aus · Kunde beendet ·
  Umsatzrueckgang (Monat vs. Vormonat).
- **Kalender**: Rechnungsfaelligkeiten, Vertragsenden, Verlaengerungen.
- **Reports**: Umsatz-/Kostenreihe (12 Monate), MRR, Top-Kunden.
- `effectiveInvoiceStatus`: eine offene Rechnung mit Faelligkeit in der
  Vergangenheit gilt als "ueberfaellig" (auch ohne manuelle Statusaenderung).

## Module / Navigation (`/finance`, nur super_admin/ceo/finance)
| Route | Inhalt |
| --- | --- |
| `/finance` | **Dashboard**: 8 KPI-Cards (Umsatz Monat/Jahr, MRR, ARR, offene/ueberfaellige Rechnungen, Gewinnschaetzung, aktive Kunden) + Forecast (1/3/12 Mt) + Chart + Alerts + Top-Kunden |
| `/finance/invoices` (+`/[id]`) | Rechnungen (Filter/Suche, Quick-Create, CSV/JSON-Export) + Detail |
| `/finance/open` | Offene Rechnungen (Ueberfaellig · Heute · Diese Woche · Spaeter) |
| `/finance/expenses` | Kosten (Kategorien, wiederkehrend; Summen) |
| `/finance/forecast` | Forecast-Engine (12-Monats-Chart + Tabelle) |
| `/finance/customers` | Kundenwert / Profitabilitaet je Kunde |
| `/finance/reports` | Umsatz-/Kostenreihen, MRR, Top-Kunden |
| `/finance/calendar` | Finance-Kalender (Faelligkeiten, Vertragsenden, Verlaengerungen) |

Layout (`finance/layout.tsx`) erzwingt serverseitig die Rolle via `requireRole`.
Rechnungs-Status werden ueber den geteilten `<StatusSelect>` gesetzt.

## Home-Dashboard
Finance-Widgets (Umsatz Monat, MRR, offene/ueberfaellige Rechnungen) erscheinen
auf der Startseite **nur fuer berechtigte Rollen** (`canAccess`-Gate).

## Export
Rechnungen als CSV (Excel-kompatibel) und JSON, clientseitig.

## Setup
Migrationen der Reihe nach: `0001 → … → 0008`. Danach `npm run typecheck` +
`npm run build` fehlerfrei.

## NICHT gebaut (kommt als naechstes)
AI-Engines, Lead-Finder, Outreach, Website-Audit-Engine, Proposal-Engine.

## Naechster Schritt
**Phase 9 - AI-Engines** (bzw. Automationen).
