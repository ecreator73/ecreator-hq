/**
 * Firmendaten fuer Geschaeftsdokumente (Offerte, Vertrag).
 * Quelle: offizieller eCreator-Vertrag + Brandguide (Stand 08.2026).
 */
export const companyInfo = {
  name: "eCreator GmbH",
  claim: "TRAFFIC IS NICE. CUSTOMERS ARE BETTER.",

  // --- Adresse ---
  street: "Zuercherstrasse 17",
  zip: "8173",
  city: "Neerach",
  country: "Schweiz",

  // --- Kontakt ---
  phone: "+41 44 974 27 60",
  email: "info@ecreator.ch",
  website: "www.ecreator.ch",

  // --- Rechtliches / Zahlung ---
  uid: "CHE-462.387.483",
  bank: "Valiant Bank",
  iban: "CH04 0630 0508 3713 7511 7",
  /** QR-IBAN (Valiant, QR-IID 30024) fuer QR-Rechnungen mit QR-Referenz. */
  qrIban: "CH64 3002 4508 3713 7511 7",
  /** Alle Betraege werden exkl. MwSt ausgewiesen (wie im Originalvertrag). */
  amountsExclVat: true,

  /** Standard-Zahlungsbedingung (Vertrag). */
  paymentTerms:
    "Monatliche Zahlung im Voraus, zahlbar innerhalb von 7 Tagen nach Rechnungsstellung.",
  /** Hinweis auf die AGB - integrierender Vertragsbestandteil. */
  termsNote:
    "Es gelten die Allgemeinen Geschaeftsbedingungen (AGB) der eCreator, welche integrierender Bestandteil dieses Vertrags sind.",

  // --- Marke ---
  logoSrc: "/brand/ecreator-logo.svg",
  markSrc: "/brand/ecreator-mark.svg",
  brandColor: "#6754e9",
  brandColorLight: "#8978ff",
} as const;

/** Adresszeilen (leere Angaben fallen weg). */
export function companyAddressLines(): string[] {
  const c = companyInfo;
  return [c.street, [c.zip, c.city].filter(Boolean).join(" "), c.country].filter(
    (l) => l.trim() !== "",
  );
}

/** Einzeilige Adresse fuer die Fusszeile: "eCreator GmbH · Zuercherstrasse 17 · 8173 Neerach" */
export function companyFooterLine(): string {
  const c = companyInfo;
  return [c.name, c.street, [c.zip, c.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");
}
