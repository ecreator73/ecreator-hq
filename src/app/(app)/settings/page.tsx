import { redirect } from "next/navigation";
import { requireUser, canAccess } from "@/lib/auth";
import { SETTINGS_BASE_ROLES } from "@/config/navigation";

export default async function SettingsIndexPage() {
  const user = await requireUser();
  // Leitung/Organisation -> Benutzer; reine Entwickler -> AI & Automationen.
  if (canAccess(user.roles, SETTINGS_BASE_ROLES)) redirect("/settings/users");
  redirect("/settings/ai");
}
