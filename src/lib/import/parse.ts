/**
 * Wert-Parser fuer den CSV-Import. Wandeln Schweizer/De-formatierte Strings in
 * die internen Formate (Geld -> Rappen-Ganzzahl, Datum -> YYYY-MM-DD). Rein.
 */

/**
 * "1'200.50", "1 200,50", "CHF 12'000", "1200" -> Rappen (Ganzzahl) | null.
 * Beherrscht Apostroph-/Leerzeichen-Tausender und Komma- oder Punkt-Dezimal.
 */
export function parseChfToRappen(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/chf|fr\.?|sfr\.?/gi, "").trim();
  // Tausender-Trenner entfernen (Apostroph, normale + geschuetzte Leerzeichen).
  s = s.replace(/['\s ]/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Das spaetere Zeichen ist das Dezimaltrennzeichen.
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1;
    // Genau 3 Stellen nach dem Komma -> Tausendertrenner, sonst Dezimal.
    if (decimals === 3) s = s.replace(/,/g, "");
    else s = s.replace(",", ".");
  }
  s = s.replace(/[^0-9.\-]/g, "");
  if (!s || s === "-" || s === "." || s === "-.") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function isoFrom(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/**
 * "dd.mm.yyyy" | "dd/mm/yyyy" | "dd-mm-yyyy" | "yyyy-mm-dd" | "d.m.yy"
 * -> "YYYY-MM-DD" | null. Zweistellige Jahre: <50 -> 20xx, sonst 19xx.
 */
export function parseDateToIso(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return isoFrom(+m[1]!, +m[2]!, +m[3]!);

  m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (m) {
    let year = +m[3]!;
    if (year < 100) year += year < 50 ? 2000 : 1900;
    return isoFrom(year, +m[2]!, +m[1]!);
  }
  return null;
}

/** Ganzzahl extrahieren (z. B. Laufzeit in Monaten). */
export function parseIntSafe(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[^0-9\-]/g, "");
  if (!s || s === "-") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** Addiert Monate auf ein ISO-Datum (Tag wird bei Monatsende geklemmt). */
export function addMonthsIso(isoDate: string, months: number): string | null {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = +m[1]!;
  const mo = +m[2]!;
  const d = +m[3]!;
  const base = mo - 1 + months;
  const ny = y + Math.floor(base / 12);
  const nmo = ((base % 12) + 12) % 12;
  const daysInMonth = new Date(Date.UTC(ny, nmo + 1, 0)).getUTCDate();
  const nd = Math.min(d, daysInMonth);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ny}-${pad(nmo + 1)}-${pad(nd)}`;
}
