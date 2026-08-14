/**
 * Firmendaten fuer Geschaeftsdokumente (Offerten, Vertraege).
 *
 * WICHTIG: Hier stehen NUR echte, von der Geschaeftsleitung bestaetigte Angaben.
 * Leere Felder werden im Dokument automatisch weggelassen - es wird nichts
 * erfunden (Adresse, UID/MwSt-Nummer und IBAN sind rechtlich relevant).
 * Zum Ergaenzen einfach die Werte hier eintragen.
 */
export const companyInfo = {
  name: "eCreator GmbH",
  /** Zusatz unter dem Namen, z.B. "Digitalagentur" */
  tagline: "Digitalagentur",

  // --- Adresse (bitte ergaenzen) ---
  street: "",
  zip: "",
  city: "",
  country: "Schweiz",

  // --- Kontakt ---
  email: "info@ecreator.ch",
  phone: "",
  website: "ecreator.ch",

  // --- Rechtliches / Zahlung (bitte ergaenzen) ---
  /** z.B. "CHE-123.456.789 MWST" */
  vatId: "",
  /** Mehrwertsteuersatz in Prozent; 0 = nicht ausgewiesen */
  vatRate: 8.1,
  iban: "",
  bank: "",

  /** Standard-Zahlungsfrist in Tagen (fuer Offerten). */
  paymentTermDays: 30,
} as const;

/** Adresszeile(n) als Array - leere Angaben fallen weg. */
export function companyAddressLines(): string[] {
  const c = companyInfo;
  return [
    c.street,
    [c.zip, c.city].filter(Boolean).join(" "),
    c.country,
  ].filter((l) => l.trim() !== "");
}

/** Kontaktzeile fuer die Fusszeile. */
export function companyContactLine(): string {
  const c = companyInfo;
  return [c.phone, c.email, c.website].filter(Boolean).join(" · ");
}
