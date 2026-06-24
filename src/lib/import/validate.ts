import { parseChfToRappen, parseDateToIso, parseIntSafe } from "./parse";
import type { ImportField } from "./specs";

/**
 * Mappt + validiert eine Rohzeile gegen eine Feld-Spec. Wandelt Geld -> Rappen,
 * Datum -> YYYY-MM-DD, Zahl -> int, Enum -> lower-case-Key. Sammelt Fehler.
 * Identisch im Browser (Live-Vorschau) und am Server (vor dem Insert) nutzbar.
 */

export type ImportValue = string | number | null;

export interface RowResult {
  index: number;
  values: Record<string, ImportValue>;
  errors: string[];
  raw: Record<string, string>;
}

export function mapAndValidateRow(
  raw: Record<string, string>,
  mapping: Record<string, string>,
  fields: ImportField[],
  index: number,
): RowResult {
  const values: Record<string, ImportValue> = {};
  const errors: string[] = [];

  for (const field of fields) {
    const header = mapping[field.key];
    const rawVal = header ? (raw[header] ?? "").trim() : "";

    if (!rawVal) {
      if (field.required) errors.push(`${field.label}: Pflichtfeld fehlt`);
      values[field.key] = null;
      continue;
    }

    switch (field.type) {
      case "money": {
        const r = parseChfToRappen(rawVal);
        if (r == null) errors.push(`${field.label}: Betrag ungueltig ("${rawVal}")`);
        values[field.key] = r;
        break;
      }
      case "date": {
        const d = parseDateToIso(rawVal);
        if (!d) errors.push(`${field.label}: Datum ungueltig ("${rawVal}")`);
        values[field.key] = d;
        break;
      }
      case "int": {
        const n = parseIntSafe(rawVal);
        if (n == null) errors.push(`${field.label}: Zahl ungueltig ("${rawVal}")`);
        values[field.key] = n;
        break;
      }
      case "enum": {
        const v = rawVal.toLowerCase();
        if (field.enumKeys && !field.enumKeys.includes(v)) {
          errors.push(`${field.label}: "${rawVal}" nicht erlaubt`);
          values[field.key] = null;
        } else {
          values[field.key] = v;
        }
        break;
      }
      default:
        values[field.key] = rawVal;
    }
  }

  return { index, values, errors, raw };
}
