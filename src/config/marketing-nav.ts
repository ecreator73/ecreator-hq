/** Navigation des Bereichs «Marketing» (Gruppen gemaess Briefing). */
export interface MarketingNavGroup {
  label: string;
  items: Array<{ label: string; href: string }>;
}

export const MARKETING_NAV: MarketingNavGroup[] = [
  {
    label: "Übersicht",
    items: [
      { label: "Dashboard", href: "/marketing" },
      { label: "Live-Aktivität", href: "/marketing/live" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Website Analytics", href: "/marketing/analytics" },
      { label: "Traffic-Quellen", href: "/marketing/sources" },
      { label: "Visitor Journeys", href: "/marketing/journeys" },
      { label: "Conversion Funnel", href: "/marketing/funnel" },
      { label: "Landingpages", href: "/marketing/landingpages" },
    ],
  },
  {
    label: "Werbung",
    items: [
      { label: "Google Ads", href: "/marketing/google-ads" },
      { label: "Meta Ads", href: "/marketing/meta-ads" },
      { label: "Kampagnen-Performance", href: "/marketing/campaigns" },
    ],
  },
  {
    label: "Conversions",
    items: [
      { label: "Leads", href: "/marketing/leads" },
      { label: "Kontaktformulare", href: "/marketing/forms" },
      { label: "Calendly-Buchungen", href: "/marketing/bookings" },
      { label: "Attribution", href: "/marketing/attribution" },
    ],
  },
  {
    label: "Suche",
    items: [
      { label: "Search Console", href: "/marketing/search-console" },
      { label: "Organische Performance", href: "/marketing/organic" },
    ],
  },
  {
    label: "Reporting",
    items: [
      { label: "Berichte", href: "/marketing/reports" },
      { label: "Vergleiche", href: "/marketing/compare" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Integrationen", href: "/marketing/integrations" },
      { label: "Tracking-Gesundheit", href: "/marketing/health" },
      { label: "Einstellungen", href: "/marketing/settings" },
    ],
  },
];
