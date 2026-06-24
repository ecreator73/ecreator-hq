import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ListChecks,
  TrendingUp,
  Users,
  Factory,
  Settings2,
  Wallet,
  Cog,
  UserCog,
  ShieldCheck,
  KeyRound,
  Plug,
  Server,
  Sparkles,
} from "lucide-react";
import type { RoleKey } from "@/config/roles";

export interface NavItem {
  /** Deutsche Beschriftung. */
  label: string;
  /** Technischer Pfad (kebab-case, englisch) gemaess Blueprint. */
  href: string;
  icon: LucideIcon;
  /** Kurzbeschreibung fuer Tooltips / Platzhalterseiten. */
  description: string;
  /**
   * Falls gesetzt: nur diese Rollen sehen den Eintrag.
   * Leer/undefined = fuer alle eingeloggten Nutzer sichtbar.
   * (Phase 1: einfache Sichtbarkeits-Steuerung, keine komplexe Rechte-Engine.)
   */
  roles?: RoleKey[];
}

/**
 * Hauptnavigation - die 7 Bereiche aus dem Blueprint (Abschnitt 2).
 */
export const MAIN_NAV: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
    description:
      "Persoenliches Command Center: Was muss ich heute tun? Aufgaben, Termine, Follow-ups und Alerts auf einen Blick.",
  },
  {
    label: "Aufgaben",
    href: "/tasks",
    icon: ListChecks,
    description:
      "Das zentrale Operations-System: alle Aufgaben als Board, Tabelle und Tagesansichten - Herzstueck des eCreator OS.",
  },
  {
    label: "Sales",
    href: "/sales",
    icon: TrendingUp,
    description:
      "Akquise und Verkauf von Lead bis Abschluss: Pipeline, Leads, Opportunities, Angebote, Outreach und Termine.",
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
    description:
      "Betreuung, Vertraege und Wachstum von Bestandskunden: Kundenprofile, Kontakte, Vertraege und Reporting-Calls.",
  },
  {
    label: "Production",
    href: "/production",
    icon: Factory,
    description:
      "Lieferung aller Leistungen: Projekte, Aufgaben-Board, Content, Websites, Ad-Kampagnen, CRM-Builds und Drehs.",
  },
  {
    label: "Operations",
    href: "/operations",
    icon: Settings2,
    description:
      "Interne Steuerung: Creator-Pool, Team & Auslastung, Automationen, AI-Engines und Dateien.",
  },
  {
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    description:
      "Rechnungen, Ausgaben, wiederkehrende Umsaetze (MRR/ARR) und finanzielle Berichte.",
    roles: ["super_admin", "ceo", "finance"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Cog,
    description:
      "Organisation, Benutzer, Rollen & Rechte, Integrationen und System.",
    roles: ["super_admin", "ceo", "cso"],
  },
];

/**
 * Unternavigation des Settings-Moduls (Phase-1-Struktur gemaess Prompt 1).
 */
/** Basis-Settings nur fuer Organisation/Leitung. */
export const SETTINGS_BASE_ROLES: RoleKey[] = ["super_admin", "ceo", "cso"];
/** AI- & Automations-Bereich: Leitung + Entwicklung. */
export const SETTINGS_AI_ROLES: RoleKey[] = ["super_admin", "ceo", "developer"];

export const SETTINGS_NAV: NavItem[] = [
  {
    label: "Benutzer",
    href: "/settings/users",
    icon: UserCog,
    description:
      "Mitarbeitende verwalten: vorhandene Konten ansehen, spaeter anlegen, aktivieren und deaktivieren.",
    roles: SETTINGS_BASE_ROLES,
  },
  {
    label: "Rollen",
    href: "/settings/roles",
    icon: ShieldCheck,
    description: "Die 9 Rollen des eCreator OS und ihre Bedeutung.",
    roles: SETTINGS_BASE_ROLES,
  },
  {
    label: "Rechte",
    href: "/settings/permissions",
    icon: KeyRound,
    description:
      "Granulare Berechtigungen pro Modul - Grundstruktur fuer die spaetere Rechteverwaltung.",
    roles: SETTINGS_BASE_ROLES,
  },
  {
    label: "Integrationen",
    href: "/settings/integrations",
    icon: Plug,
    description:
      "Verbundene Drittsysteme (Google, Meta, Ads, E-Mail ...) - wird in spaeteren Phasen aktiviert.",
    roles: SETTINGS_BASE_ROLES,
  },
  {
    label: "System",
    href: "/settings/system",
    icon: Server,
    description:
      "Technischer Status, Version und Umgebungsinformationen der Plattform.",
    roles: SETTINGS_BASE_ROLES,
  },
  {
    label: "AI & Automationen",
    href: "/settings/ai",
    icon: Sparkles,
    description:
      "Prompt-Templates, Automation-Jobs, AI-Runs, Integrationen und Logs - das Fundament aller AI-Engines.",
    roles: SETTINGS_AI_ROLES,
  },
];

/** Wer den Settings-Bereich grundsaetzlich betreten darf (Union). */
export const SETTINGS_NAV_ROLES: RoleKey[] = [
  "super_admin",
  "ceo",
  "cso",
  "developer",
];
