import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/layout/settings-nav";
import { SETTINGS_NAV_ROLES } from "@/config/navigation";

/**
 * Settings ist ein sensibler Bereich - serverseitige Rollenpruefung.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(SETTINGS_NAV_ROLES);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Einstellungen"
        description="Organisation, Benutzer, Rollen & Rechte, Integrationen, System und AI."
      />
      <SettingsNav roles={user.roles} />
      <div>{children}</div>
    </div>
  );
}
