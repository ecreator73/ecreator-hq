import {
  CONTRACT_STATUS_KEYS,
  CONTRACT_TYPE_KEYS,
  INVOICE_STATUS_KEYS,
} from "@/config/catalog";

/**
 * Import-Spezifikationen: definieren die Zielfelder je Import-Typ inkl.
 * Auto-Mapping-Aliasen (deutsche + englische Header-Synonyme), damit der Wizard
 * Spalten automatisch zuordnet. Genutzt von Client (Live-Vorschau) und Server.
 */

export type ImportFieldType = "text" | "date" | "money" | "int" | "enum";

export interface ImportField {
  key: string;
  label: string;
  type: ImportFieldType;
  required?: boolean;
  enumKeys?: readonly string[];
  /** Header-Synonyme (lower-case) fuer das Auto-Mapping. */
  aliases: string[];
  hint?: string;
}

export type ImportKind = "customers" | "contracts" | "invoices";

export interface ImportSpec {
  key: ImportKind;
  label: string;
  description: string;
  fields: ImportField[];
}

/** Kunden + aktiver Vertrag (die Excel des Nutzers: Kunde/Umsatz/Netto/Start/Laufzeit/Bemerkungen). */
export const CUSTOMER_IMPORT_FIELDS: ImportField[] = [
  {
    key: "name",
    label: "Kunde",
    type: "text",
    required: true,
    aliases: ["kunde", "kundenname", "firma", "name", "company", "kunde/firma", "client"],
  },
  {
    key: "revenue_gross",
    label: "Umsatz",
    type: "money",
    aliases: ["umsatz", "umsatz brutto", "bruttoumsatz", "revenue", "total", "umsatz (brutto)"],
  },
  {
    key: "revenue_net",
    label: "Netto Umsatz",
    type: "money",
    aliases: ["netto umsatz", "nettoumsatz", "umsatz netto", "net", "netto", "umsatz (netto)"],
  },
  {
    key: "start_date",
    label: "Startdatum",
    type: "date",
    aliases: ["startdatum", "start", "beginn", "vertragsbeginn", "datum", "seit", "start datum"],
  },
  {
    key: "term_months",
    label: "Laufzeit (Monate)",
    type: "int",
    aliases: ["laufzeit", "laufzeit (monate)", "monate", "term", "dauer", "laufzeit monate"],
  },
  {
    key: "notes",
    label: "Bemerkungen",
    type: "text",
    aliases: ["bemerkungen", "bemerkung", "notiz", "notizen", "kommentar", "anmerkung", "info"],
  },
];

/** Vertraege zu bestehenden Kunden (Match per Kundenname). */
export const CONTRACT_IMPORT_FIELDS: ImportField[] = [
  {
    key: "client_name",
    label: "Kunde",
    type: "text",
    required: true,
    aliases: ["kunde", "kundenname", "firma", "name", "client"],
  },
  { key: "title", label: "Titel", type: "text", aliases: ["titel", "title", "vertrag", "leistung", "bezeichnung"] },
  {
    key: "contract_type",
    label: "Typ",
    type: "enum",
    enumKeys: CONTRACT_TYPE_KEYS,
    aliases: ["typ", "type", "vertragstyp", "contract_type"],
  },
  {
    key: "value_monthly",
    label: "Monatswert",
    type: "money",
    aliases: ["monatswert", "mrr", "monatlich", "value_monthly", "monatsumsatz", "monat"],
  },
  {
    key: "value_total",
    label: "Gesamtwert",
    type: "money",
    aliases: ["gesamtwert", "total", "value_total", "gesamt", "gesamtumsatz", "umsatz"],
  },
  { key: "start_date", label: "Startdatum", type: "date", aliases: ["startdatum", "start", "beginn"] },
  { key: "end_date", label: "Enddatum", type: "date", aliases: ["enddatum", "end", "ende", "bis"] },
  { key: "term_months", label: "Laufzeit (Monate)", type: "int", aliases: ["laufzeit", "monate", "term", "dauer"] },
  { key: "status", label: "Status", type: "enum", enumKeys: CONTRACT_STATUS_KEYS, aliases: ["status"] },
];

/** Rechnungen (Finance). Match Kunde per Name (optional). */
export const INVOICE_IMPORT_FIELDS: ImportField[] = [
  { key: "client_name", label: "Kunde", type: "text", aliases: ["kunde", "kundenname", "firma", "name", "client"] },
  {
    key: "invoice_number",
    label: "Rechnungsnr.",
    type: "text",
    aliases: ["rechnungsnr", "rechnungsnummer", "nr", "nummer", "invoice", "invoice_number", "rg-nr"],
  },
  { key: "title", label: "Titel", type: "text", aliases: ["titel", "title", "leistung", "bezeichnung"] },
  {
    key: "amount",
    label: "Betrag (netto)",
    type: "money",
    required: true,
    aliases: ["betrag", "amount", "netto", "summe", "umsatz", "rechnungsbetrag"],
  },
  { key: "vat", label: "MwSt", type: "money", aliases: ["mwst", "vat", "steuer", "ust", "mehrwertsteuer"] },
  { key: "due_date", label: "Faellig am", type: "date", aliases: ["faellig", "due", "due_date", "faelligkeit", "faellig am"] },
  { key: "paid_date", label: "Bezahlt am", type: "date", aliases: ["bezahlt", "paid", "paid_date", "zahldatum", "bezahlt am"] },
  { key: "status", label: "Status", type: "enum", enumKeys: INVOICE_STATUS_KEYS, aliases: ["status"] },
];

export const IMPORT_SPECS: Record<ImportKind, ImportSpec> = {
  customers: {
    key: "customers",
    label: "Kunden",
    description: "Kunden inkl. aktivem Vertrag (MRR) importieren.",
    fields: CUSTOMER_IMPORT_FIELDS,
  },
  contracts: {
    key: "contracts",
    label: "Vertraege",
    description: "Vertraege zu bestehenden Kunden importieren.",
    fields: CONTRACT_IMPORT_FIELDS,
  },
  invoices: {
    key: "invoices",
    label: "Finance (Rechnungen)",
    description: "Rechnungen importieren.",
    fields: INVOICE_IMPORT_FIELDS,
  },
};

/**
 * Auto-Mapping: ordnet CSV-Header den Spec-Feldern zu (per Alias/Label/Key,
 * lower-case, jeder Header nur einmal). Liefert fieldKey -> Header.
 */
export function autoMap(headers: string[], fields: ImportField[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  for (const field of fields) {
    const match = headers.find((h) => {
      const hl = h.trim().toLowerCase();
      return (
        !used.has(h) &&
        (hl === field.key.toLowerCase() ||
          hl === field.label.toLowerCase() ||
          field.aliases.includes(hl))
      );
    });
    if (match) {
      map[field.key] = match;
      used.add(match);
    }
  }
  return map;
}
