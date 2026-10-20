import QRCode from "qrcode";
import { companyInfo } from "@/config/company";

/**
 * Schweizer QR-Rechnung (Swiss Payment Standards, Version 2.0) wie im alten
 * Kunden-CRM: QR-IBAN + QR-Referenz (QRR), Swico-Rechnungsinformationen (S1).
 * Geldwerte in Rappen.
 */

const TABLE = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];

/** Pruefziffer Modulo 10 rekursiv (fuer QR-Referenzen). */
export function mod10(digits: string): number {
  let carry = 0;
  for (const d of digits) carry = TABLE[(carry + Number(d)) % 10]!;
  return (10 - carry) % 10;
}

/** QR-Referenz aus Kundennummer und Laufnummer: 26 Stellen + Pruefziffer. */
export function qrReference(customerNumber: number, seq: number): string {
  const base = `${customerNumber}${seq}`.padStart(26, "0");
  if (base.length !== 26) throw new Error("QR-Referenz zu lang");
  return base + mod10(base);
}

export function isValidQrReference(ref: string): boolean {
  return /^\d{27}$/.test(ref) && mod10(ref.slice(0, 26)) === Number(ref[26]);
}

/** "00 00000 00000 00000 10001 78835" */
export function formatReference(ref: string): string {
  return ref.replace(/^(\d{2})(\d{5})(\d{5})(\d{5})(\d{5})(\d{5})$/, "$1 $2 $3 $4 $5 $6");
}

export function formatIban(iban: string): string {
  return iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
}

export interface QrDebtor {
  name: string;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface QrBillInput {
  /** Total inkl. MWST in Rappen. */
  total: number;
  reference: string | null;
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  vatRate: number;
  debtor: QrDebtor | null;
}

const yymmdd = (d: string) => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);
const chDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
/** SPS: max. Feldlaengen einhalten. */
const cut = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function paymentDays(issueDate: string, dueDate: string | null): number {
  if (!dueDate) return 30;
  return Math.max(0, Math.round((Date.parse(dueDate) - Date.parse(issueDate)) / 86_400_000));
}

/** Rechnungsinformationen nach Swico S1. */
export function billInformation(i: QrBillInput): string {
  const uid = companyInfo.uid.replace(/\D/g, "");
  const period = i.periodFrom && i.periodTo ? `/31/${yymmdd(i.periodFrom)}${yymmdd(i.periodTo)}` : "";
  return `//S1/10/${i.invoiceNumber}/11/${yymmdd(i.issueDate)}/30/${uid}${period}/32/${i.vatRate}/40/0:${paymentDays(i.issueDate, i.dueDate)}`;
}

export function unstructuredMessage(i: QrBillInput): string {
  return `Rechnung ${i.invoiceNumber} vom ${chDate(i.issueDate)}`;
}

/** Nutzdaten des Swiss QR Codes. */
export function qrPayload(i: QrBillInput): string {
  const c = companyInfo;
  const d = i.debtor && i.debtor.name && i.debtor.zip && i.debtor.city ? i.debtor : null;
  return [
    "SPC",
    "0200",
    "1",
    c.qrIban.replace(/\s/g, ""),
    "S",
    cut(c.name, 70),
    cut(c.street, 70),
    "",
    cut(c.zip, 16),
    cut(c.city, 35),
    "CH",
    "", "", "", "", "", "", "",
    (i.total / 100).toFixed(2),
    "CHF",
    d ? "S" : "",
    cut(d?.name, 70),
    cut(d?.street, 70),
    "",
    cut(d?.zip, 16),
    cut(d?.city, 35),
    d ? (d.country && d.country.length === 2 ? d.country.toUpperCase() : "CH") : "",
    i.reference ? "QRR" : "NON",
    i.reference ?? "",
    cut(unstructuredMessage(i), 140),
    "EPD",
    cut(billInformation(i), 140),
  ].join("\r\n");
}

/**
 * Swiss QR Code als SVG (46 x 46 mm) mit Schweizerkreuz (7 x 7 mm) in der Mitte.
 * Fehlerkorrektur M, wie vom Standard verlangt.
 */
export function qrSvg(payload: string): string {
  const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const data = qr.modules.data;
  let path = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) if (data[y * n + x]) path += `M${x} ${y}h1v1h-1z`;
  }
  // Kreuz: 7 mm von 46 mm, in Modul-Einheiten
  const s = (7 / 46) * n;
  const o = (n - s) / 2;
  const u = s / 7; // 1 mm in Modul-Einheiten
  const black = { x: o + 0.5 * u, w: s - u };
  const arm = { long: 3.9 * u, short: 1.2 * u };
  const cx = n / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="46mm" height="46mm" shape-rendering="crispEdges" role="img" aria-label="Swiss QR Code">
<rect width="${n}" height="${n}" fill="#fff"/><path d="${path}" fill="#000"/>
<rect x="${o}" y="${o}" width="${s}" height="${s}" fill="#fff"/>
<rect x="${black.x}" y="${black.x}" width="${black.w}" height="${black.w}" fill="#000"/>
<rect x="${cx - arm.short / 2}" y="${cx - arm.long / 2}" width="${arm.short}" height="${arm.long}" fill="#fff"/>
<rect x="${cx - arm.long / 2}" y="${cx - arm.short / 2}" width="${arm.long}" height="${arm.short}" fill="#fff"/>
</svg>`;
}
