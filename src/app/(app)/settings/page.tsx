import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Plug,
  Server,
  ShieldCheck,
  Sparkles,
  UserCog,
  KeyRound,
} from "lucide-react";
import { requireUser, canAccess } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { SETTINGS_BASE_ROLES, SETTINGS_AI_ROLES } from "@/config/navigation";
import type { RoleKey } from "@/config/roles";

export const metadata: Metadata = { title: "Einstellungen" };

interface SettingsTile {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  roles: RoleKey[];
}

/** Die sechs Bereiche der Einstellungen - je eine Kachel mit klarer Erklaerung. */
const TILES: SettingsTile[] = [
  {
    label: "Benutzer",
    href: "/settings/users",
    icon: UserCog,
    description:
      "Mitarbeiter anlegen, deaktivieren und ihnen Rollen zuweisen.",
    roles: SETTINGS_BASE_ROLES,
  },
  {
    label: "Rollen",
    href: "/settings/roles",
    icon: ShieldCheck,
    description:
      "Welche Rollen es gibt und wer damit welchen Bereich sieht.",
    roles: SETTINGS_BASE_ROLES,
  },
  {
    label: "Rechte",
    href: "/settings/permissions",
    icon: KeyRound,
    description:
      "Uebersicht, welche Rolle was lesen, erstellen und aendern darf.",
    roles: SETTINGS_BASE_ROLES,
  },
  {
    label: "Integrationen",
    href: "/settings/integrations",
    icon: Plug,
    description:
      "Verbindungen zu externen Diensten wie Meta einrichten und pruefen.",
    roles: SETTINGS_BASE_ROLES,
  },
  {
    label: "AI & Automationen",
    href: "/settings/ai",
    icon: Sparkles,
    description:
      "Automatische Jobs, Prompts und Protokolle der AI-Funktionen.",
    roles: SETTINGS_AI_ROLES,
  },
  {
    label: "System",
    href: "/settings/system",
    icon: Server,
    description:
      "Technischer Zustand: Version, Datenbank und Systemhinweise.",
    roles: SETTINGS_BASE_ROLES,
  },
];

export default async function SettingsIndexPage() {
  const user = await requireUser();
  const tiles = TILES.filter((tile) => canAccess(user.roles, tile.roles));

  if (tiles.length === 0) {
    return (
      <EmptyState
        title="Keine Einstellungen freigegeben"
        description="Deine Rolle hat aktuell keinen Zugriff auf die Einstellungen. Melde dich bei der Leitung, wenn du etwas aendern musst."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.href}
            href={tile.href}
            className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-base font-semibold tracking-tight text-neutral-900">
              {tile.label}
            </p>
            <p className="mt-1 text-sm text-neutral-500">{tile.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
