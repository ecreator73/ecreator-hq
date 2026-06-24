/**
 * Kanonisches Rollenmodell (9 Rollen) - exakt gemaess Master-Blueprint.
 * Quelle: docs/blueprint/00-kanonische-referenz.md, Abschnitt 3.
 *
 * Die Datenbank-Wahrheit liegt in der Tabelle `roles`; diese Datei spiegelt
 * sie fuer UI-Beschriftungen, Sortierung und Hierarchie (level).
 * Niedrigeres `level` = mehr Macht (1 = Super Admin).
 */
export type RoleKey =
  | "super_admin"
  | "ceo"
  | "cso"
  | "sales"
  | "project_manager"
  | "developer"
  | "creative"
  | "finance"
  | "viewer";

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  description: string;
  /** Hierarchie-Ebene: 1 = hoechste Rechte. */
  level: number;
}

export const ROLES: RoleDefinition[] = [
  {
    key: "super_admin",
    label: "Super Admin",
    description:
      "Technischer Vollzugriff inkl. Organisation, Rollen, Integrationen und Audit Logs.",
    level: 1,
  },
  {
    key: "ceo",
    label: "CEO",
    description:
      "Geschaeftsfuehrung mit lesendem Vollblick und strategischer Steuerung.",
    level: 2,
  },
  {
    key: "cso",
    label: "CSO",
    description: "Verantwortet Vertrieb und Wachstum end-to-end.",
    level: 2,
  },
  {
    key: "sales",
    label: "Sales",
    description: "Bearbeitet Leads, Angebote und Outreach bis zum Abschluss.",
    level: 3,
  },
  {
    key: "project_manager",
    label: "Project Manager",
    description: "Plant und koordiniert Projekte, Aufgaben und Liefertermine.",
    level: 3,
  },
  {
    key: "developer",
    label: "Developer",
    description: "Setzt Website- und CRM-Builds technisch um.",
    level: 3,
  },
  {
    key: "creative",
    label: "Creative",
    description: "Produziert Content, Skripte und Drehs.",
    level: 3,
  },
  {
    key: "finance",
    label: "Finance",
    description:
      "Verwaltet Rechnungen, Ausgaben, wiederkehrende Umsaetze und Berichte.",
    level: 3,
  },
  {
    key: "viewer",
    label: "Viewer",
    description: "Reiner Lesezugriff auf freigegebene Bereiche.",
    level: 9,
  },
];

export const ROLE_BY_KEY: Record<RoleKey, RoleDefinition> = ROLES.reduce(
  (acc, role) => {
    acc[role.key] = role;
    return acc;
  },
  {} as Record<RoleKey, RoleDefinition>,
);

/** UI-Label fuer einen Rollen-Key, mit sicherem Fallback. */
export function roleLabel(key: string | null | undefined): string {
  if (!key) return "Unbekannt";
  return ROLE_BY_KEY[key as RoleKey]?.label ?? key;
}
