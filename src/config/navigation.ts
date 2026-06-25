import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radar,
  TrendingUp,
  Users,
  Factory,
  Wallet,
  Cog,
  UserCog,
  ShieldCheck,
  Plug,
  Server,
  Sparkles,
  BookOpen,
  ClipboardList,
  MessageSquareCode,
} from "lucide-react";
import type { RoleKey } from "@/config/roles";

/** Ein anklickbarer Unterpunkt eines Hauptbereichs. */
export interface NavChild {
  label: string;
  href: string;
  /** Nur diese Rollen sehen den Unterpunkt (leer = alle). */
  roles?: RoleKey[];
}

/**
 * Ein Hauptbereich der Navigation (Sidebar-Gruppe). Klick auf den Kopf fuehrt
 * zu `href`; die Unterpunkte erscheinen aufgeklappt, wenn der Bereich aktiv ist.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** Nur diese Rollen sehen den Bereich (leer/undefined = alle). */
  roles?: RoleKey[];
  children?: NavChild[];
}

/** Rollen-Konstanten (an mehreren Stellen wiederverwendet). */
export const SALES_ROLES: RoleKey[] = ["super_admin", "ceo", "cso", "sales"];
export const FINANCE_ROLES: RoleKey[] = ["super_admin", "ceo", "finance"];
const LEADERSHIP_ROLES: RoleKey[] = ["super_admin", "ceo", "cso"];

/**
 * Hauptnavigation - die 7 Bereiche der produktionsreifen IA.
 * Operations wurde entfernt; seine Inhalte sind verteilt:
 *   - Growth Engine  -> Sales
 *   - Meetings       -> Clients
 *   - Wissen/SOPs/Prompts -> Settings
 * Alle URLs bleiben stabil (keine toten Links/Bookmarks).
 */
export const MAIN_NAV: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
    description:
      "Persoenliches Cockpit: Aufgaben, Meetings, Follow-ups, Pipeline und Alerts fuer heute.",
    children: [
      { label: "Executive Dashboard", href: "/executive", roles: LEADERSHIP_ROLES },
      { label: "Heute", href: "/tasks/today" },
      { label: "Kalender", href: "/calendar" },
      { label: "Benachrichtigungen", href: "/notifications" },
    ],
  },
  {
    label: "Leads",
    href: "/sales/leads",
    icon: Radar,
    description:
      "Akquise: Lead-Gewinnung, Pipeline, Website-Audits und Follow-ups bis zur Uebergabe an Sales.",
    roles: SALES_ROLES,
    children: [
      { label: "Dashboard", href: "/sales/lead-engine" },
      { label: "Leads", href: "/sales/leads" },
      { label: "Pipeline", href: "/sales/pipeline" },
      { label: "Website Audits", href: "/sales/audits" },
      { label: "Follow-ups", href: "/sales/followups" },
      { label: "Aktivitaeten", href: "/sales/activities" },
    ],
  },
  {
    label: "Sales",
    href: "/sales",
    icon: TrendingUp,
    description:
      "Verkauf: Angebote, Vertraege, Proposals, Outreach-Automatisierung und Termine bis zum Abschluss.",
    roles: SALES_ROLES,
    children: [
      { label: "Dashboard", href: "/sales" },
      { label: "Angebote", href: "/sales/offers" },
      { label: "Vertraege", href: "/sales/contracts" },
      { label: "Proposal Engine", href: "/sales/proposals" },
      { label: "Automatisierungen", href: "/sales/outreach" },
      { label: "E-Mail Vorlagen", href: "/sales/outreach/templates" },
      { label: "Kampagnen", href: "/sales/outreach/pipeline" },
      { label: "Termine", href: "/sales/meetings" },
      { label: "Growth Engine", href: "/operations/growth", roles: LEADERSHIP_ROLES },
    ],
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
    description:
      "Betreuung von Bestandskunden: Onboarding, Reporting-Calls, Projekte, Aufgaben und Offboarding.",
    children: [
      { label: "Kunden", href: "/clients/list" },
      { label: "Onboarding", href: "/clients/onboarding" },
      { label: "Reporting-Calls", href: "/clients/reporting" },
      { label: "Projekte", href: "/clients/projects" },
      { label: "Aufgaben", href: "/tasks" },
      { label: "Aktivitaeten", href: "/clients/activities" },
      { label: "Offboarding", href: "/clients/offboarding" },
      { label: "Meetings", href: "/operations/meetings" },
    ],
  },
  {
    label: "Production",
    href: "/production",
    icon: Factory,
    description:
      "Lieferung aller Leistungen: Projekte, Content, Websites, CRM-Builds, Ads, Drehs, Creator-Pool und Assets.",
    children: [
      { label: "Dashboard", href: "/production" },
      { label: "Projekte", href: "/production/projects" },
      { label: "Content Produktionen", href: "/production/content" },
      { label: "Webseiten", href: "/production/websites" },
      { label: "CRM Builds", href: "/production/crm" },
      { label: "Ads", href: "/production/ads" },
      { label: "Shootings", href: "/production/shoots" },
      { label: "Creator Pool", href: "/production/creators" },
      { label: "Assets", href: "/production/assets" },
    ],
  },
  {
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    description:
      "Rechnungen, Umsatz, wiederkehrende Umsaetze (MRR), Forecast und Kosten.",
    roles: FINANCE_ROLES,
    children: [
      { label: "Dashboard", href: "/finance" },
      { label: "Umsatz", href: "/finance/monthly" },
      { label: "MRR", href: "/finance/customers" },
      { label: "Forecast", href: "/finance/forecast" },
      { label: "Rechnungen", href: "/finance/invoices" },
      { label: "Kosten", href: "/finance/expenses" },
    ],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Cog,
    description:
      "Organisation, Benutzer, Rollen, Integrationen, AI sowie internes Wissen und SOPs.",
    roles: ["super_admin", "ceo", "cso", "developer"],
    children: [
      { label: "Benutzer", href: "/settings/users", roles: ["super_admin", "ceo", "cso"] },
      { label: "Rollen", href: "/settings/roles", roles: ["super_admin", "ceo", "cso"] },
      { label: "Integrationen", href: "/settings/integrations", roles: ["super_admin", "ceo", "cso"] },
      { label: "AI", href: "/settings/ai", roles: ["super_admin", "ceo", "developer"] },
      { label: "Systemeinstellungen", href: "/settings/system", roles: ["super_admin", "ceo", "cso"] },
      { label: "Wissen", href: "/operations/knowledge" },
      { label: "SOPs", href: "/operations/sops" },
      { label: "Prompts", href: "/operations/prompts" },
    ],
  },
];

/**
 * Unternavigation des Settings-Moduls (horizontale Tabs im Settings-Layout).
 */
/** Basis-Settings nur fuer Organisation/Leitung. */
export const SETTINGS_BASE_ROLES: RoleKey[] = ["super_admin", "ceo", "cso"];
/** AI- & Automations-Bereich: Leitung + Entwicklung. */
export const SETTINGS_AI_ROLES: RoleKey[] = ["super_admin", "ceo", "developer"];

export const SETTINGS_NAV: NavChild[] = [
  { label: "Benutzer", href: "/settings/users", roles: SETTINGS_BASE_ROLES },
  { label: "Rollen", href: "/settings/roles", roles: SETTINGS_BASE_ROLES },
  { label: "Rechte", href: "/settings/permissions", roles: SETTINGS_BASE_ROLES },
  { label: "Integrationen", href: "/settings/integrations", roles: SETTINGS_BASE_ROLES },
  { label: "System", href: "/settings/system", roles: SETTINGS_BASE_ROLES },
  { label: "AI & Automationen", href: "/settings/ai", roles: SETTINGS_AI_ROLES },
  { label: "Wissen", href: "/operations/knowledge" },
  { label: "SOPs", href: "/operations/sops" },
  { label: "Prompts", href: "/operations/prompts" },
];

/** Wer den Settings-Bereich grundsaetzlich betreten darf (Union). */
export const SETTINGS_NAV_ROLES: RoleKey[] = [
  "super_admin",
  "ceo",
  "cso",
  "developer",
];

/** Icons fuer die Settings-Sub-Nav (optional verwendet). */
export const SETTINGS_NAV_ICONS = {
  users: UserCog,
  roles: ShieldCheck,
  integrations: Plug,
  system: Server,
  ai: Sparkles,
  knowledge: BookOpen,
  sops: ClipboardList,
  prompts: MessageSquareCode,
} as const;
