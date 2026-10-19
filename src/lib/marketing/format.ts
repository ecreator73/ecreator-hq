/** Zahlen-/Geldformate fuer das Marketing-Dashboard (de-CH, Schweizer Apostroph). */

const intFmt = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat("de-CH", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const chf2 = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const chf0 = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 });

export const NA = "–";

export function fmtInt(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? NA : intFmt.format(v);
}

export function fmtDec(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? NA : dec1.format(v);
}

/** Anteil 0..1 -> «12.3 %» */
export function fmtPct(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? NA : `${dec1.format(v * 100)} %`;
}

/** Micros (1 CHF = 1'000'000) -> CHF */
export function fmtMicros(micros: number | null | undefined, decimals: 0 | 2 = 2): string {
  if (micros == null || !Number.isFinite(micros)) return NA;
  return (decimals === 0 ? chf0 : chf2).format(micros / 1_000_000);
}

/** Division mit «nicht verfuegbar» statt 0/Infinity. */
export function ratio(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}

/** Veraenderung in % gegenueber Vergleich; null, wenn nicht sinnvoll. */
export function trend(cur: number | null | undefined, prev: number | null | undefined): number | null {
  if (cur == null || prev == null || !Number.isFinite(cur) || !Number.isFinite(prev)) return null;
  if (prev === 0) return cur === 0 ? 0 : null;
  return (cur - prev) / prev;
}

export function csvCell(v: unknown): string {
  if (v == null) return "";
  let s = String(v);
  // Formel-Injektion in Tabellenprogrammen verhindern
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // Semikolon + BOM: oeffnet in Excel (de-CH) korrekt
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
