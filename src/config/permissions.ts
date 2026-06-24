/**
 * Katalog der granularen Berechtigungen.
 * Schema: `<modul>.<aktion>` (z.B. "sales.view", "settings.manage").
 *
 * Diese Liste ist die Quelle fuer den Permission-Seed in der Datenbank
 * (siehe supabase/migrations) und fuer die Anzeige unter Settings -> Rechte.
 * Phase 1: nur Struktur + Anzeige. Die Zuordnung zu Rollen (role_permissions)
 * wird in einer spaeteren Phase ueber die Oberflaeche verwaltet.
 */
export const PERMISSION_MODULES = [
  { key: "home", label: "Home" },
  { key: "sales", label: "Sales" },
  { key: "clients", label: "Clients" },
  { key: "production", label: "Production" },
  { key: "operations", label: "Operations" },
  { key: "finance", label: "Finance" },
  { key: "settings", label: "Settings" },
] as const;

export const PERMISSION_ACTIONS = [
  { key: "view", label: "Ansehen" },
  { key: "create", label: "Erstellen" },
  { key: "edit", label: "Bearbeiten" },
  { key: "delete", label: "Loeschen" },
  { key: "manage", label: "Verwalten" },
] as const;

export interface PermissionEntry {
  key: string;
  module: string;
  action: string;
}

/** Alle Permission-Keys als flache Liste (modul x aktion). */
export const PERMISSION_CATALOG: PermissionEntry[] = PERMISSION_MODULES.flatMap(
  (mod) =>
    PERMISSION_ACTIONS.map((act) => ({
      key: `${mod.key}.${act.key}`,
      module: mod.key,
      action: act.key,
    })),
);
