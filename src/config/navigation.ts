import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radar,
  TrendingUp,
  Users,
  Factory,
  Wallet,
  BarChart3,
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
export const LEADERSHIP_ROLES: RoleKey[] = ["super_admin", "ceo", "cso"];

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
      "Alles fuer heute an einem Ort: Aufgaben, Termine, Follow-ups, Zahlen und Benachrichtigungen.",
    // Bewusst OHNE Unterpunkte: Home zeigt alles direkt auf der Seite.
  },
  {
    label: "Leads",
    href: "/leads",
    icon: Radar,
    description: "Neue Kontakte gewinnen: Leads, Pipeline, LinkedIn und Follow-ups.",
    roles: SALES_ROLES,
    children: [
      { label: "Dashboard", href: "/leads" },
      { label: "Alle Leads", href: "/sales/leads" },
      { label: "Pipeline", href: "/sales/pipeline" },
      { label: "LinkedIn", href: "/sales/linkedin" },
      { label: "Follow-ups", href: "/sales/followups" },
    ],
  },
  {
    label: "Sales",
    href: "/sales",
    icon: TrendingUp,
    description: "Abschluss machen: Angebote, Vertraege und Termine.",
    roles: SALES_ROLES,
    children: [
      { label: "Dashboard", href: "/sales" },
      { label: "Angebote", href: "/sales/offers" },
      { label: "Vertraege", href: "/sales/contracts" },
      { label: "Termine", href: "/sales/meetings" },
    ],
  },
  {
    label: "Kunden",
    href: "/clients",
    icon: Users,
    description:
      "Bestandskunden betreuen: Onboarding, Reporting-Calls, Projekte und Offboarding.",
    children: [
      { label: "Dashboard", href: "/clients" },
      { label: "Kundenliste", href: "/clients/list" },
      { label: "Onboarding", href: "/clients/onboarding" },
      { label: "Reporting-Calls", href: "/clients/reporting" },
      { label: "Projekte", href: "/clients/projects" },
      { label: "Meetings", href: "/operations/meetings" },
      { label: "Offboarding", href: "/clients/offboarding" },
    ],
  },
  {
    label: "Production",
    href: "/production",
    icon: Factory,
    description:
      "Leistungen liefern: Projekte, Webseiten, Ads, CRM-Builds, Shootings, Creator und Assets.",
    children: [
      { label: "Dashboard", href: "/production" },
      { label: "Projekte", href: "/production/projects" },
      { label: "Webseiten", href: "/production/websites" },
      { label: "Ads", href: "/production/ads" },
      { label: "CRM Builds", href: "/production/crm" },
      { label: "Shootings", href: "/production/shoots" },
      { label: "Creator Pool", href: "/production/creators" },
      { label: "Assets", href: "/production/assets" },
    ],
  },
  {
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    description: "Umsatz, Rechnungen, offene Posten und Kosten.",
    roles: FINANCE_ROLES,
    children: [
      { label: "Dashboard", href: "/finance" },
      { label: "Umsatz", href: "/finance/monthly" },
      { label: "Rechnungen", href: "/finance/invoices" },
      { label: "Offene Posten", href: "/finance/open" },
      { label: "Kosten", href: "/finance/expenses" },
    ],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Zahlen je Mitarbeiter, Kampagne und Quelle.",
    roles: SALES_ROLES,
  },
  {
    label: "Einstellungen",
    href: "/settings",
    icon: Cog,
    description: "Benutzer, Rollen, Integrationen, AI und System.",
    roles: ["super_admin", "ceo", "cso", "developer"],
    children: [
      { label: "Benutzer", href: "/settings/users", roles: ["super_admin", "ceo", "cso"] },
      { label: "Rollen", href: "/settings/roles", roles: ["super_admin", "ceo", "cso"] },
      { label: "Integrationen", href: "/settings/integrations", roles: ["super_admin", "ceo", "cso"] },
      { label: "AI", href: "/settings/ai", roles: ["super_admin", "ceo", "developer"] },
      { label: "System", href: "/settings/system", roles: ["super_admin", "ceo", "cso"] },
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
