/**
 * Globale, statische App-Metadaten.
 */
export const siteConfig = {
  name: "eCreator OS",
  shortName: "eCreator",
  description:
    "Das interne Betriebssystem der eCreator GmbH - Sales, Kunden, Produktion, Operations und Finanzen in einer verbundenen Plattform.",
  company: "eCreator GmbH",
  locale: "de-CH",
  /** Aktuelle Ausbaustufe laut Blueprint-Phasenplan. */
  phase: 1,
} as const;

export type SiteConfig = typeof siteConfig;
