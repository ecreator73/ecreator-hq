/**
 * Robuster CSV-Parser fuer das Import-System.
 *
 * Beherrscht: Trennzeichen-Erkennung (Komma / Semikolon / Tab - Schweizer Excel
 * exportiert oft mit Semikolon), Anfuehrungszeichen mit eingebetteten Trenn-
 * zeichen und Zeilenumbruechen, doppelte Quotes ("" -> "), BOM, CRLF/LF.
 * Reine Funktion, im Browser und am Server nutzbar.
 */

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
}

const DELIMITERS = [";", ",", "\t"] as const;

/** Erkennt das Trennzeichen anhand der Kopfzeile (haeufigstes gewinnt). */
function detectDelimiter(headerLine: string): string {
  let best = ",";
  let bestCount = -1;
  for (const d of DELIMITERS) {
    const count = headerLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/** Zerlegt CSV-Text in Felder (string[][]) unter Beachtung von Quotes. */
function tokenize(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // Teil von \r\n - ignorieren (das \n schliesst die Zeile).
    } else {
      field += ch;
    }
  }
  row.push(field);
  records.push(row);
  return records;
}

/** Parst CSV-Text zu { headers, rows }. Leere Zeilen werden uebersprungen. */
export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^﻿/, "");
  if (!text.trim()) return { headers: [], rows: [], delimiter: "," };

  const firstBreak = text.search(/\r?\n/);
  const headerLine = firstBreak === -1 ? text : text.slice(0, firstBreak);
  const delimiter = detectDelimiter(headerLine);

  const records = tokenize(text, delimiter);
  if (records.length === 0) return { headers: [], rows: [], delimiter };

  const headers = records[0]!.map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < records.length; i++) {
    const rec = records[i]!;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (rec[idx] ?? "").trim();
    });
    if (Object.values(row).some((v) => v !== "")) rows.push(row);
  }
  return { headers, rows, delimiter };
}
